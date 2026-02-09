import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class DownloadsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) { }

  async initBatchDownload(mediaIds: string[]) {
    // Verify all media exist
    const media = await this.prisma.media.findMany({
      where: { id: { in: mediaIds } },
    });

    if (media.length !== mediaIds.length) {
      throw new NotFoundException('Some media items not found');
    }

    // Calculate estimated size
    const estimatedSize = media.reduce((sum, m) => sum + Number(m.size), 0);

    // Create download record
    const download = await this.prisma.download.create({
      data: {
        mediaIds,
        status: 'processing',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // In a real implementation, this would trigger an Azure Function
    // to create the ZIP file asynchronously. For now, we'll simulate it.
    this.processZipCreation(download.id, media).catch(console.error);

    return {
      downloadId: download.id,
      status: 'processing',
      estimatedSize,
      mediaCount: media.length,
    };
  }

  async getDownloadStatus(downloadId: string) {
    const download = await this.prisma.download.findUnique({
      where: { id: downloadId },
    });

    if (!download) {
      throw new NotFoundException(`Download ${downloadId} not found`);
    }

    if (download.status === 'ready' && download.zipPath) {
      const downloadUrl = await this.storage.generateDownloadSas(
        'downloads',
        download.zipPath,
        'media-download.zip',
        60, // 1 hour
      );

      return {
        downloadId: download.id,
        status: 'ready',
        downloadUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        size: download.size ? Number(download.size) : null,
      };
    }

    return {
      downloadId: download.id,
      status: download.status,
    };
  }

  // Simulated ZIP creation - in production, use Azure Functions
  private async processZipCreation(
    downloadId: string,
    media: Array<{ id: string; filename: string; blobPath: string; size: bigint }>,
  ) {
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production:
      // 1. Download all files from blob storage
      // 2. Create ZIP using archiver
      // 3. Upload ZIP to downloads container
      // 4. Update download record

      const totalSize = media.reduce((sum, m) => sum + Number(m.size), 0);
      const zipPath = `${downloadId}.zip`;

      await this.prisma.download.update({
        where: { id: downloadId },
        data: {
          status: 'ready',
          zipPath,
          size: totalSize,
        },
      });
    } catch (error) {
      await this.prisma.download.update({
        where: { id: downloadId },
        data: { status: 'failed' },
      });
    }
  }
}
