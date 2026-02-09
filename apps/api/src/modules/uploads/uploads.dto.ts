import { IsString, IsNumber, IsOptional, IsArray, IsObject, IsUUID } from 'class-validator';

export class InitUploadDto {
  @IsString()
  filename: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsUUID()
  albumId?: string;
}

export class CompleteUploadDto {
  @IsArray()
  @IsString({ each: true })
  blockIds: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
