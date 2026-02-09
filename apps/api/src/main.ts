import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS for frontend
  const allowedOrigins = [
    'http://localhost:3000',
    'https://upload-media-web.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.some(allowed => origin.startsWith(allowed!) || origin.includes('vercel.app'))) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for now to debug
      }
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 API server running on http://localhost:${port}`);
}

bootstrap();
