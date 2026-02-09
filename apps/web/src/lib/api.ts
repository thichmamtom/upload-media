// API Client for Media Manager
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
  message: string;
  statusCode: number;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      message: response.statusText,
      statusCode: response.status,
    }));
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

// Types
export interface Media {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
  originalUrl: string;
  createdAt: string;
}

export interface Album {
  id: string;
  name: string;
  description: string | null;
  mediaCount: number;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UploadInit {
  uploadId: string;
  sasUrl: string;
  blockSize: number;
  expiresAt: string;
}

// Albums API
export const albumsApi = {
  list: (page = 1, limit = 20) =>
    fetchApi<PaginatedResponse<Album>>(`/albums?page=${page}&limit=${limit}`),

  get: (id: string, page = 1, limit = 50) =>
    fetchApi<Album & { media: PaginatedResponse<Media> }>(
      `/albums/${id}?page=${page}&limit=${limit}`
    ),

  create: (name: string, description?: string) =>
    fetchApi<Album>('/albums', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  update: (id: string, data: { name?: string; description?: string }) =>
    fetchApi<Album>(`/albums/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/albums/${id}`, { method: 'DELETE' }),

  addMedia: (albumId: string, mediaIds: string[]) =>
    fetchApi<{ success: boolean; addedCount: number }>(`/albums/${albumId}/media`, {
      method: 'POST',
      body: JSON.stringify({ mediaIds }),
    }),

  removeMedia: (albumId: string, mediaIds: string[]) =>
    fetchApi<{ success: boolean; removedCount: number }>(`/albums/${albumId}/media`, {
      method: 'DELETE',
      body: JSON.stringify({ mediaIds }),
    }),
};

// Media API
export const mediaApi = {
  list: (page = 1, limit = 50, type?: 'image' | 'video') => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (type) params.set('type', type);
    return fetchApi<PaginatedResponse<Media>>(`/media?${params}`);
  },

  get: (id: string) =>
    fetchApi<Media & { albumIds: string[]; metadata: Record<string, unknown> }>(`/media/${id}`),

  getDownloadUrl: (id: string) =>
    fetchApi<{ downloadUrl: string; expiresAt: string }>(`/media/${id}/download`),

  delete: (id: string) =>
    fetchApi<{ success: boolean }>(`/media/${id}`, { method: 'DELETE' }),

  deleteMany: (mediaIds: string[]) =>
    fetchApi<{ success: boolean; deletedCount: number }>('/media', {
      method: 'DELETE',
      body: JSON.stringify({ mediaIds }),
    }),
};

// Uploads API
export const uploadsApi = {
  init: (filename: string, fileSize: number, mimeType: string, albumId?: string) =>
    fetchApi<UploadInit>('/uploads/init', {
      method: 'POST',
      body: JSON.stringify({ filename, fileSize, mimeType, albumId }),
    }),

  getStatus: (uploadId: string) =>
    fetchApi<{
      uploadId: string;
      status: string;
      uploadedBytes: number;
      totalBytes: number;
      uploadedBlocks: string[];
    }>(`/uploads/${uploadId}/status`),

  complete: (uploadId: string, blockIds: string[], metadata?: Record<string, unknown>) =>
    fetchApi<{
      success: boolean;
      mediaId: string;
      thumbnailUrl: string | null;
      originalUrl: string;
    }>(`/uploads/${uploadId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ blockIds, metadata }),
    }),
};

// Downloads API
export const downloadsApi = {
  initBatch: (mediaIds: string[]) =>
    fetchApi<{
      downloadId: string;
      status: string;
      estimatedSize: number;
      mediaCount: number;
    }>('/downloads/batch', {
      method: 'POST',
      body: JSON.stringify({ mediaIds }),
    }),

  getStatus: (downloadId: string) =>
    fetchApi<{
      downloadId: string;
      status: string;
      downloadUrl?: string;
      expiresAt?: string;
      size?: number;
    }>(`/downloads/${downloadId}`),
};

// Upload helper - uploads file directly to Azure Blob Storage using SAS URL
export async function uploadFileToAzure(
  file: File,
  sasUrl: string,
  blockSize: number,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  const blockIds: string[] = [];
  const totalBlocks = Math.ceil(file.size / blockSize);

  for (let i = 0; i < totalBlocks; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, file.size);
    const chunk = file.slice(start, end);

    // Generate block ID (base64 encoded, fixed length)
    const blockId = btoa(String(i).padStart(6, '0'));
    blockIds.push(blockId);

    // Upload block to Azure Blob Storage
    const blockUrl = `${sasUrl}&comp=block&blockid=${encodeURIComponent(blockId)}`;
    await fetch(blockUrl, {
      method: 'PUT',
      body: chunk,
      headers: {
        'x-ms-blob-type': 'BlockBlob',
      },
    });

    // Report progress
    if (onProgress) {
      onProgress(((i + 1) / totalBlocks) * 100);
    }
  }

  // Commit block list
  const blockListXml = `<?xml version="1.0" encoding="utf-8"?>
<BlockList>
  ${blockIds.map(id => `<Latest>${id}</Latest>`).join('\n  ')}
</BlockList>`;

  await fetch(`${sasUrl}&comp=blocklist`, {
    method: 'PUT',
    body: blockListXml,
    headers: {
      'Content-Type': 'application/xml',
    },
  });

  return blockIds;
}
