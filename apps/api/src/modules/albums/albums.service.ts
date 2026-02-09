import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateAlbumDto, UpdateAlbumDto } from './albums.dto';

@Injectable()
export class AlbumsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) { }

  async findAll(page = 1, limit = 20, sort = 'createdAt:desc') {
    const [field, order] = sort.split(':');
    const skip = (page - 1) * limit;

    const [albums, total] = await Promise.all([
      this.prisma.album.findMany({
        skip,
        take: limit,
        orderBy: { [field]: order },
        include: {
          _count: { select: { media: true } },
          coverMedia: true,
        },
      }),
      this.prisma.album.count(),
    ]);

    return {
      data: albums.map(album => ({
        id: album.id,
        name: album.name,
        description: album.description,
        mediaCount: album._count.media,
        coverUrl: album.coverMedia?.thumbnailPath
          ? this.storage.getCdnUrl('thumbnails', album.coverMedia.thumbnailPath)
          : null,
        createdAt: album.createdAt,
        updatedAt: album.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, page = 1, limit = 50) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        _count: { select: { media: true } },
        coverMedia: true,
      },
    });

    if (!album) {
      throw new NotFoundException(`Album ${id} not found`);
    }

    const skip = (page - 1) * limit;
    const [mediaItems, total] = await Promise.all([
      this.prisma.albumMedia.findMany({
        where: { albumId: id },
        skip,
        take: limit,
        orderBy: { addedAt: 'desc' },
        include: { media: true },
      }),
      this.prisma.albumMedia.count({ where: { albumId: id } }),
    ]);

    return {
      id: album.id,
      name: album.name,
      description: album.description,
      mediaCount: album._count.media,
      coverUrl: album.coverMedia?.thumbnailPath
        ? this.storage.getCdnUrl('thumbnails', album.coverMedia.thumbnailPath)
        : null,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
      media: {
        data: mediaItems.map(item => ({
          id: item.media.id,
          filename: item.media.filename,
          mimeType: item.media.mimeType,
          thumbnailUrl: item.media.thumbnailPath
            ? this.storage.getCdnUrl('thumbnails', item.media.thumbnailPath)
            : null,
          originalUrl: this.storage.getCdnUrl('originals', item.media.blobPath),
          width: item.media.width,
          height: item.media.height,
          size: Number(item.media.size),
          createdAt: item.media.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async create(dto: CreateAlbumDto) {
    const album = await this.prisma.album.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });

    return {
      id: album.id,
      name: album.name,
      description: album.description,
      mediaCount: 0,
      coverUrl: null,
      createdAt: album.createdAt,
    };
  }

  async update(id: string, dto: UpdateAlbumDto) {
    const album = await this.prisma.album.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: {
        _count: { select: { media: true } },
        coverMedia: true,
      },
    });

    return {
      id: album.id,
      name: album.name,
      description: album.description,
      mediaCount: album._count.media,
      coverUrl: album.coverMedia?.thumbnailPath
        ? this.storage.getCdnUrl('thumbnails', album.coverMedia.thumbnailPath)
        : null,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    };
  }

  async delete(id: string) {
    await this.prisma.album.delete({ where: { id } });
    return { success: true };
  }

  async addMedia(albumId: string, mediaIds: string[]) {
    const album = await this.prisma.album.findUnique({ where: { id: albumId } });
    if (!album) {
      throw new NotFoundException(`Album ${albumId} not found`);
    }

    // Get current max position
    const maxPosition = await this.prisma.albumMedia.aggregate({
      where: { albumId },
      _max: { position: true },
    });

    let position = (maxPosition._max.position ?? -1) + 1;

    // Add media items
    await this.prisma.albumMedia.createMany({
      data: mediaIds.map(mediaId => ({
        albumId,
        mediaId,
        position: position++,
      })),
      skipDuplicates: true,
    });

    // Update cover if not set
    if (!album.coverMediaId && mediaIds.length > 0) {
      await this.prisma.album.update({
        where: { id: albumId },
        data: { coverMediaId: mediaIds[0] },
      });
    }

    return { success: true, addedCount: mediaIds.length };
  }

  async removeMedia(albumId: string, mediaIds: string[]) {
    await this.prisma.albumMedia.deleteMany({
      where: {
        albumId,
        mediaId: { in: mediaIds },
      },
    });

    // Update cover if removed
    const album = await this.prisma.album.findUnique({ where: { id: albumId } });
    if (album?.coverMediaId && mediaIds.includes(album.coverMediaId)) {
      const firstMedia = await this.prisma.albumMedia.findFirst({
        where: { albumId },
        orderBy: { position: 'asc' },
      });
      await this.prisma.album.update({
        where: { id: albumId },
        data: { coverMediaId: firstMedia?.mediaId ?? null },
      });
    }

    return { success: true, removedCount: mediaIds.length };
  }
}
