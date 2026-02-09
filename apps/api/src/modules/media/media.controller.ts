import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { DeleteMediaDto } from './media.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) { }

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('type') type?: 'image' | 'video',
    @Query('sort') sort = 'createdAt:desc',
  ) {
    return this.mediaService.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
      type,
      sort,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string) {
    return this.mediaService.getDownloadUrl(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.mediaService.delete(id);
  }

  @Delete()
  deleteMany(@Body() dto: DeleteMediaDto) {
    return this.mediaService.deleteMany(dto.mediaIds);
  }
}
