import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateAlbumDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAlbumDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AlbumMediaDto {
  @IsArray()
  @IsUUID('4', { each: true })
  mediaIds: string[];
}
