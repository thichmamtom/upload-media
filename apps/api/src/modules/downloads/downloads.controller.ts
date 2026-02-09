import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { DownloadsService } from './downloads.service';
import { BatchDownloadDto } from './downloads.dto';

@Controller('downloads')
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) { }

  @Post('batch')
  initBatchDownload(@Body() dto: BatchDownloadDto) {
    return this.downloadsService.initBatchDownload(dto.mediaIds);
  }

  @Get(':id')
  getDownloadStatus(@Param('id') id: string) {
    return this.downloadsService.getDownloadStatus(id);
  }
}
