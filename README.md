# Media Manager

A web-based media management system for uploading images and videos from mobile devices with original quality preservation.

## Features

- 📱 **Mobile-first design** - Optimized for Android & iOS browsers
- 📤 **Resumable uploads** - Large file uploads with progress indicators
- 🖼️ **Original quality** - No compression, no transcoding (EXIF preserved)
- 📁 **Album organization** - Create, rename, and organize media groups
- 📥 **Batch downloads** - Select multiple files and download as ZIP
- ⚡ **Fast delivery** - CDN-powered media access

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Frontend | Next.js 15, React 19, CSS Modules |
| Backend  | NestJS 10, Prisma ORM             |
| Database | PostgreSQL 16                     |
| Storage  | Azure Blob Storage                |
| CDN      | Azure CDN                         |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Local Development

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd upload-project
pnpm install

# 2. Start local services (PostgreSQL, Redis, Azurite)
docker-compose up -d

# 3. Setup environment files
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local

# 4. Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# 5. Start development servers
pnpm dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

## Project Structure

```
upload-project/
├── apps/
│   ├── web/              # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/      # App Router pages
│   │   │   ├── components/
│   │   │   └── styles/
│   │   └── package.json
│   │
│   └── api/              # NestJS Backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── albums/
│       │   │   ├── media/
│       │   │   ├── uploads/
│       │   │   └── downloads/
│       │   └── main.ts
│       ├── prisma/
│       └── package.json
│
├── infrastructure/       # Azure deployment scripts
├── docker-compose.yml    # Local development services
└── package.json          # Monorepo root
```

## API Endpoints

### Albums

- `GET /api/albums` - List all albums
- `POST /api/albums` - Create album
- `GET /api/albums/:id` - Get album with media
- `PATCH /api/albums/:id` - Update album
- `DELETE /api/albums/:id` - Delete album
- `POST /api/albums/:id/media` - Add media to album
- `DELETE /api/albums/:id/media` - Remove media from album

### Media

- `GET /api/media` - List all media
- `GET /api/media/:id` - Get media details
- `GET /api/media/:id/download` - Get download URL
- `DELETE /api/media/:id` - Delete media
- `DELETE /api/media` - Batch delete media

### Uploads

- `POST /api/uploads/init` - Initialize upload session
- `GET /api/uploads/:id/status` - Get upload status
- `POST /api/uploads/:id/complete` - Complete upload

### Downloads

- `POST /api/downloads/batch` - Start batch download (ZIP)
- `GET /api/downloads/:id` - Get download status

## Azure Deployment

```bash
# Login to Azure
az login

# Run deployment script
chmod +x infrastructure/deploy.sh
./infrastructure/deploy.sh
```

## License

MIT
