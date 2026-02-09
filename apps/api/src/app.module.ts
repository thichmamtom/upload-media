import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './modules/prisma/prisma.module';
import { StorageModule } from './modules/storage/storage.module';
import { AlbumsModule } from './modules/albums/albums.module';
import { MediaModule } from './modules/media/media.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { DownloadsModule } from './modules/downloads/downloads.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),

    // Core modules
    PrismaModule,
    StorageModule,

    // Feature modules
    AlbumsModule,
    MediaModule,
    UploadsModule,
    DownloadsModule,
  ],
})
export class AppModule { }
