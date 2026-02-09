import { IsArray, IsUUID } from 'class-validator';

export class DeleteMediaDto {
  @IsArray()
  @IsUUID('4', { each: true })
  mediaIds: string[];
}
