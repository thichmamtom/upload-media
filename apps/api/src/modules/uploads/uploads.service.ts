import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { InitUploadDto, CompleteUploadDto } from './uploads.dto';
import * as sharp from 'sharp';
import ExifReader from 'exifreader';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB recommended chunk size

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) { }

  async initUpload(dto: InitUploadDto) {
    // Validate file type
    if (!ALLOWED_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException(`Unsupported file type: ${dto.mimeType}`);
    }

    // Validate file size
    if (dto.fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Maximum size is 10GB.`);
    }

    // Generate SAS token for direct upload
    const { sasUrl, blobPath, expiresAt } = await this.storage.generateUploadSas(
      dto.filename,
      dto.mimeType,
    );

    // Create upload record
    const upload = await this.prisma.upload.create({
      data: {
        filename: dto.filename,
        totalSize: dto.fileSize,
        blobPath,
        albumId: dto.albumId,
        status: 'pending',
        expiresAt,
      },
    });

    return {
      uploadId: upload.id,
      sasUrl,
      blockSize: CHUNK_SIZE,
      expiresAt,
    };
  }

  async getUploadStatus(uploadId: string) {
    const upload = await this.prisma.upload.findUnique({
      where: { id: uploadId },
    });

    if (!upload) {
      throw new NotFoundException(`Upload ${uploadId} not found`);
    }

    return {
      uploadId: upload.id,
      status: upload.status,
      uploadedBytes: Number(upload.uploadedBytes),
      totalBytes: Number(upload.totalSize),
      uploadedBlocks: upload.blockIds as string[],
    };
  }

  async completeUpload(uploadId: string, dto: CompleteUploadDto) {
    const upload = await this.prisma.upload.findUnique({
      where: { id: uploadId },
    });

    if (!upload) {
      throw new NotFoundException(`Upload ${uploadId} not found`);
    }

    // Update upload status
    await this.prisma.upload.update({
      where: { id: uploadId },
      data: {
        status: 'processing',
        blockIds: dto.blockIds,
      },
    });

    try {
      // Move file from uploads to originals container
      const blobPath = await this.storage.moveToOriginals(upload.blobPath!);

      // Extract metadata and create thumbnail
      const isImage = upload.filename.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i);
      let metadata: Record<string, any> = dto.metadata || {};
      let thumbnailPath: string | null = null;
      let width: number | null = null;
      let height: number | null = null;

      if (isImage) {
        try {
          // Download first 64KB for EXIF extraction
          const buffer = await this.storage.downloadToBuffer('originals', blobPath, 0, 65536);

          // Extract EXIF
          const exif = ExifReader.load(buffer);
          if (exif.DateTimeOriginal) {
            metadata.capturedAt = exif.DateTimeOriginal.description;
          }
          if (exif.Make) {
            metadata.deviceMake = exif.Make.description;
          }
          if (exif.Model) {
            metadata.deviceModel = exif.Model.description;
          }

          // Generate thumbnail
          const fullBuffer = await this.storage.downloadToBuffer('originals', blobPath);
          const thumbnailBuffer = await sharp(fullBuffer)
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

          thumbnailPath = await this.storage.uploadThumbnail(
            blobPath,
            thumbnailBuffer,
            'image/jpeg',
          );

          // Get dimensions
          const sharpMeta = await sharp(fullBuffer).metadata();
          width = sharpMeta.width ?? null;
          height = sharpMeta.height ?? null;
        } catch (error) {
          console.error('Error processing image:', error);
        }
      }

      // Create media record
      const media = await this.prisma.media.create({
        data: {
          filename: upload.filename,
          mimeType: isImage ? 'image/jpeg' : 'video/mp4', // Simplified
          size: upload.totalSize,
          width,
          height,
          blobPath,
          thumbnailPath,
          metadata,
          status: 'ready',
        },
      });

      // Link media to album if albumId exists
      if (upload.albumId) {
        await this.prisma.albumMedia.create({
          data: {
            albumId: upload.albumId,
            mediaId: media.id,
          },
        });
      }

      // Update upload status
      await this.prisma.upload.update({
        where: { id: uploadId },
        data: { status: 'completed' },
      });

      return {
        success: true,
        mediaId: media.id,
        thumbnailUrl: thumbnailPath
          ? this.storage.getCdnUrl('thumbnails', thumbnailPath)
          : null,
        originalUrl: this.storage.getCdnUrl('originals', blobPath),
      };
    } catch (error) {
      // Mark upload as failed
      await this.prisma.upload.update({
        where: { id: uploadId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }
}
