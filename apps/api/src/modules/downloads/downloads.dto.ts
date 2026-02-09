import { IsArray, IsUUID } from 'class-validator';

export class BatchDownloadDto {
  @IsArray()
  @IsUUID('4', { each: true })
  mediaIds: string[];
}
