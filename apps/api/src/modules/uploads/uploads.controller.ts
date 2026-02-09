import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { InitUploadDto, CompleteUploadDto } from './uploads.dto';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) { }

  @Post('init')
  initUpload(@Body() dto: InitUploadDto) {
    return this.uploadsService.initUpload(dto);
  }

  @Get(':id/status')
  getUploadStatus(@Param('id') id: string) {
    return this.uploadsService.getUploadStatus(id);
  }

  @Post(':id/complete')
  completeUpload(@Param('id') id: string, @Body() dto: CompleteUploadDto) {
    return this.uploadsService.completeUpload(id, dto);
  }
}
