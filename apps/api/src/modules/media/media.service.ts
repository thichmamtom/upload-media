import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) { }

  async findAll(
    page = 1,
    limit = 50,
    type?: 'image' | 'video',
    sort = 'createdAt:desc',
  ) {
    const [field, order] = sort.split(':');
    const skip = (page - 1) * limit;

    const where = type
      ? { mimeType: { startsWith: type === 'image' ? 'image/' : 'video/' } }
      : {};

    const [media, total] = await Promise.all([
      this.prisma.media.findMany({
        where: { ...where, status: 'ready' },
        skip,
        take: limit,
        orderBy: { [field]: order },
      }),
      this.prisma.media.count({ where: { ...where, status: 'ready' } }),
    ]);

    return {
      data: media.map(item => ({
        id: item.id,
        filename: item.filename,
        mimeType: item.mimeType,
        thumbnailUrl: item.thumbnailPath
          ? this.storage.getCdnUrl('thumbnails', item.thumbnailPath)
          : null,
        originalUrl: this.storage.getCdnUrl('originals', item.blobPath),
        width: item.width,
        height: item.height,
        size: Number(item.size),
        createdAt: item.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: {
        albums: {
          include: { album: true },
        },
      },
    });

    if (!media) {
      throw new NotFoundException(`Media ${id} not found`);
    }

    return {
      id: media.id,
      filename: media.filename,
      mimeType: media.mimeType,
      size: Number(media.size),
      width: media.width,
      height: media.height,
      originalUrl: this.storage.getCdnUrl('originals', media.blobPath),
      thumbnailUrl: media.thumbnailPath
        ? this.storage.getCdnUrl('thumbnails', media.thumbnailPath)
        : null,
      metadata: media.metadata,
      albumIds: media.albums.map(a => a.albumId),
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }

  async delete(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Media ${id} not found`);
    }

    // Delete from storage
    await Promise.all([
      this.storage.deleteBlob('originals', media.blobPath),
      media.thumbnailPath
        ? this.storage.deleteBlob('thumbnails', media.thumbnailPath)
        : Promise.resolve(),
    ]);

    // Delete from database
    await this.prisma.media.delete({ where: { id } });

    return { success: true };
  }

  async deleteMany(ids: string[]) {
    const media = await this.prisma.media.findMany({
      where: { id: { in: ids } },
    });

    // Delete all from storage
    await Promise.all(
      media.flatMap(item => [
        this.storage.deleteBlob('originals', item.blobPath),
        item.thumbnailPath
          ? this.storage.deleteBlob('thumbnails', item.thumbnailPath)
          : Promise.resolve(),
      ]),
    );

    // Delete from database
    await this.prisma.media.deleteMany({
      where: { id: { in: ids } },
    });

    return { success: true, deletedCount: media.length };
  }

  async getDownloadUrl(id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Media ${id} not found`);
    }

    const downloadUrl = await this.storage.generateDownloadSas(
      'originals',
      media.blobPath,
      media.filename,
      60, // 1 hour expiry
    );

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }
}
