import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlobServiceClient,
  ContainerClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

export interface SasTokenResult {
  sasUrl: string;
  blobPath: string;
  expiresAt: Date;
}

@Injectable()
export class StorageService {
  private blobServiceClient: BlobServiceClient;
  private sharedKeyCredential: StorageSharedKeyCredential;
  private accountName: string;
  private cdnEndpoint: string;

  // Container clients
  private originalsContainer: ContainerClient;
  private thumbnailsContainer: ContainerClient;
  private uploadsContainer: ContainerClient;
  private downloadsContainer: ContainerClient;

  constructor(private config: ConfigService) {
    this.accountName = this.config.get('AZURE_STORAGE_ACCOUNT_NAME', '');
    const accountKey = this.config.get('AZURE_STORAGE_ACCOUNT_KEY', '');
    this.cdnEndpoint = this.config.get('AZURE_CDN_ENDPOINT', '');

    if (this.accountName && accountKey) {
      this.sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountName,
        accountKey,
      );

      this.blobServiceClient = new BlobServiceClient(
        `https://${this.accountName}.blob.core.windows.net`,
        this.sharedKeyCredential,
      );

      this.originalsContainer = this.blobServiceClient.getContainerClient('originals');
      this.thumbnailsContainer = this.blobServiceClient.getContainerClient('thumbnails');
      this.uploadsContainer = this.blobServiceClient.getContainerClient('uploads');
      this.downloadsContainer = this.blobServiceClient.getContainerClient('downloads');
    }
  }

  /**
   * Generate a SAS token for uploading a file directly to Azure Blob Storage
   */
  async generateUploadSas(
    filename: string,
    mimeType: string,
    expiryMinutes = 60,
  ): Promise<SasTokenResult> {
    const extension = filename.split('.').pop() || '';
    const blobPath = `${uuidv4()}.${extension}`;

    const blobClient = this.uploadsContainer.getBlockBlobClient(blobPath);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: 'uploads',
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('cw'),
        startsOn: new Date(),
        expiresOn: expiresAt,
        contentType: mimeType,
      },
      this.sharedKeyCredential,
    );

    return {
      sasUrl: `${blobClient.url}?${sasToken}`,
      blobPath,
      expiresAt,
    };
  }

  /**
   * Move uploaded blob from uploads container to originals
   */
  async moveToOriginals(uploadBlobPath: string): Promise<string> {
    const sourceBlob = this.uploadsContainer.getBlobClient(uploadBlobPath);
    const destBlob = this.originalsContainer.getBlobClient(uploadBlobPath);

    // Start copy operation
    const copyPoller = await destBlob.beginCopyFromURL(sourceBlob.url);
    await copyPoller.pollUntilDone();

    // Delete source blob
    await sourceBlob.delete();

    return uploadBlobPath;
  }

  /**
   * Upload thumbnail buffer to thumbnails container
   */
  async uploadThumbnail(
    blobPath: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const thumbnailPath = blobPath.replace(/\.[^.]+$/, '_thumb.jpg');
    const blobClient = this.thumbnailsContainer.getBlockBlobClient(thumbnailPath);

    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });

    return thumbnailPath;
  }

  /**
   * Generate download SAS URL for a blob
   */
  async generateDownloadSas(
    container: 'originals' | 'thumbnails' | 'downloads',
    blobPath: string,
    filename: string,
    expiryMinutes = 60,
  ): Promise<string> {
    const containerClient = {
      originals: this.originalsContainer,
      thumbnails: this.thumbnailsContainer,
      downloads: this.downloadsContainer,
    }[container];

    const blobClient = containerClient.getBlobClient(blobPath);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('r'),
        startsOn: new Date(),
        expiresOn: expiresAt,
        contentDisposition: `attachment; filename="${filename}"`,
      },
      this.sharedKeyCredential,
    );

    return `${blobClient.url}?${sasToken}`;
  }

  /**
   * Get URL for viewing a blob (with SAS token - required when no public access)
   */
  getViewUrl(container: 'originals' | 'thumbnails', blobPath: string): string {
    if (!blobPath) return '';

    // Always generate SAS token since storage doesn't allow public access
    const containerClient = container === 'originals'
      ? this.originalsContainer
      : this.thumbnailsContainer;

    const blobClient = containerClient.getBlobClient(blobPath);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: container,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse('r'),
        startsOn: new Date(),
        expiresOn: expiresAt,
      },
      this.sharedKeyCredential,
    );

    return `${blobClient.url}?${sasToken}`;
  }

  /**
   * Get CDN URL for a blob (legacy - use getViewUrl instead)
   */
  getCdnUrl(container: string, blobPath: string): string {
    if (container === 'originals' || container === 'thumbnails') {
      return this.getViewUrl(container as 'originals' | 'thumbnails', blobPath);
    }
    if (this.cdnEndpoint) {
      return `${this.cdnEndpoint}/${container}/${blobPath}`;
    }
    return `https://${this.accountName}.blob.core.windows.net/${container}/${blobPath}`;
  }

  /**
   * Delete a blob
   */
  async deleteBlob(container: 'originals' | 'thumbnails', blobPath: string): Promise<void> {
    const containerClient = container === 'originals'
      ? this.originalsContainer
      : this.thumbnailsContainer;

    const blobClient = containerClient.getBlobClient(blobPath);
    await blobClient.deleteIfExists();
  }

  /**
   * Download blob to buffer (for processing)
   */
  async downloadToBuffer(
    container: 'originals' | 'uploads',
    blobPath: string,
    offset = 0,
    count?: number,
  ): Promise<Buffer> {
    const containerClient = container === 'originals'
      ? this.originalsContainer
      : this.uploadsContainer;

    const blobClient = containerClient.getBlobClient(blobPath);
    return await blobClient.downloadToBuffer(offset, count);
  }
}
