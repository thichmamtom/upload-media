import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { AlbumsService } from './albums.service';
import { CreateAlbumDto, UpdateAlbumDto, AlbumMediaDto } from './albums.dto';

@Controller('albums')
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) { }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('sort') sort = 'createdAt:desc',
  ) {
    return this.albumsService.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
      sort,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.albumsService.findOne(
      id,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Post()
  create(@Body() dto: CreateAlbumDto) {
    return this.albumsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAlbumDto) {
    return this.albumsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.albumsService.delete(id);
  }

  @Post(':id/media')
  addMedia(@Param('id') id: string, @Body() dto: AlbumMediaDto) {
    return this.albumsService.addMedia(id, dto.mediaIds);
  }

  @Delete(':id/media')
  removeMedia(@Param('id') id: string, @Body() dto: AlbumMediaDto) {
    return this.albumsService.removeMedia(id, dto.mediaIds);
  }
}
