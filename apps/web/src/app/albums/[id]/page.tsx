'use client';

import React, { useState, useEffect, useRef, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Header, Button } from '@/components/ui';
import { MediaGrid, MediaPreview, MediaItem } from '@/components/gallery';
import { albumsApi, uploadsApi, uploadFileToAzure, Media } from '@/lib/api';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
  'video/mp4', 'video/quicktime', 'video/webm',
];

export default function AlbumDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [album, setAlbum] = useState<{
    id: string;
    name: string;
    mediaCount: number;
  } | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAlbum();
  }, [id]);

  async function loadAlbum() {
    try {
      setLoading(true);
      setError(null);
      const response = await albumsApi.get(id);

      setAlbum({
        id: response.id,
        name: response.name,
        mediaCount: response.mediaCount,
      });

      const items: MediaItem[] = response.media.data.map((m: Media) => ({
        id: m.id,
        filename: m.filename,
        mimeType: m.mimeType,
        thumbnailUrl: m.thumbnailUrl || m.originalUrl,
        originalUrl: m.originalUrl,
        width: m.width || undefined,
        height: m.height || undefined,
        size: m.size,
        createdAt: m.createdAt,
      }));

      setMedia(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải album');
    } finally {
      setLoading(false);
    }
  }

  // Upload handlers - auto upload
  const startUpload = async (files: File[]) => {
    const validFiles = files.filter(f => ALLOWED_TYPES.includes(f.type));
    if (validFiles.length === 0) return;

    setShowUploadZone(true);
    setIsUploading(true);

    const newUploadFiles: UploadFile[] = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploadFiles(newUploadFiles);

    for (const uploadFile of newUploadFiles) {
      try {
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
        ));

        const initResult = await uploadsApi.init(
          uploadFile.file.name,
          uploadFile.file.size,
          uploadFile.file.type,
          id // album ID
        );

        await uploadFileToAzure(
          uploadFile.file,
          initResult.sasUrl,
          initResult.blockSize,
          (progress) => setUploadFiles(prev => prev.map(f =>
            f.id === uploadFile.id ? { ...f, progress: progress * 0.9 } : f
          ))
        );

        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'processing', progress: 95 } : f
        ));

        await uploadsApi.complete(initResult.uploadId, []);

        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'complete', progress: 100 } : f
        ));
      } catch (err) {
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Lỗi' } : f
        ));
      }
    }

    setIsUploading(false);

    // Refresh album sau upload
    setTimeout(() => {
      loadAlbum();
      setUploadFiles([]);
      setShowUploadZone(false);
    }, 1000);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      startUpload(Array.from(e.dataTransfer.files));
    }
  }, [id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      startUpload(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  // Gallery handlers
  const handlePreview = (item: MediaItem) => {
    const index = media.findIndex(m => m.id === item.id);
    setPreviewIndex(index);
    setPreviewMedia(item);
  };

  const handlePrev = () => {
    const newIndex = previewIndex > 0 ? previewIndex - 1 : media.length - 1;
    setPreviewIndex(newIndex);
    setPreviewMedia(media[newIndex]);
  };

  const handleNext = () => {
    const newIndex = previewIndex < media.length - 1 ? previewIndex + 1 : 0;
    setPreviewIndex(newIndex);
    setPreviewMedia(media[newIndex]);
  };

  const handleDownload = async (ids: string[]) => {
    for (const mediaId of ids) {
      const item = media.find(m => m.id === mediaId);
      if (item) {
        const link = document.createElement('a');
        link.href = item.originalUrl;
        link.download = item.filename;
        link.click();
      }
    }
  };

  const handleRemoveFromAlbum = async (ids: string[]) => {
    if (!confirm(`Xóa ${ids.length} ảnh khỏi album này?`)) return;

    try {
      await albumsApi.removeMedia(id, ids);
      loadAlbum();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xóa ảnh');
    }
  };

  const pendingCount = uploadFiles.filter(f => f.status === 'pending').length;
  const showEmptyState = !loading && media.length === 0;

  return (
    <>
      <Header />
      <main
        className={styles.main}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <Link href="/" className={styles.backLink}>
              <ArrowLeft size={20} />
              <span>Quay lại</span>
            </Link>

            {album && (
              <div className={styles.albumHeader}>
                <div className={styles.albumInfo}>
                  <h1>{album.name}</h1>
                  <p className={styles.count}>{album.mediaCount} ảnh</p>
                </div>
                <div className={styles.albumActions}>
                  <Button
                    variant="secondary"
                    icon={<Download size={18} />}
                    onClick={() => handleDownload(media.map(m => m.id))}
                    disabled={media.length === 0}
                  >
                    Tải tất cả
                  </Button>
                  <Button
                    icon={<Upload size={18} />}
                    onClick={() => {
                      setShowUploadZone(true);
                      fileInputRef.current?.click();
                    }}
                  >
                    Thêm ảnh
                  </Button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
              <button onClick={loadAlbum}>Thử lại</button>
            </div>
          )}

          {/* Drag overlay */}
          {isDragActive && (
            <div className={styles.dragOverlay}>
              <Upload size={48} />
              <span>Thả ảnh vào đây</span>
            </div>
          )}

          {/* Upload Zone */}
          {(showUploadZone || uploadFiles.length > 0) && (
            <div className={styles.uploadSection}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileSelect}
                className={styles.fileInput}
              />

              {uploadFiles.length > 0 && (
                <div className={styles.uploadList}>
                  {uploadFiles.map(file => (
                    <div key={file.id} className={styles.uploadItem}>
                      <span className={styles.fileName}>{file.file.name}</span>
                      <div className={styles.uploadStatus}>
                        {file.status === 'pending' && <span className={styles.pending}>Đang chờ</span>}
                        {file.status === 'uploading' && (
                          <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${file.progress}%` }} />
                          </div>
                        )}
                        {file.status === 'processing' && <Loader2 size={16} className={styles.spin} />}
                        {file.status === 'complete' && <CheckCircle size={16} className={styles.success} />}
                        {file.status === 'error' && <AlertCircle size={16} className={styles.errorIcon} />}
                      </div>
                    </div>
                  ))}

                  {pendingCount > 0 && (
                    <button
                      className={styles.startUploadBtn}
                      onClick={() => startUpload(uploadFiles.map(uf => uf.file))}
                      disabled={isUploading}
                    >
                      {isUploading ? 'Đang tải lên...' : `Tải lên ${pendingCount} ảnh`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Grid với nút thêm ảnh ở đầu */}
          <MediaGrid
            media={media}
            loading={loading}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onDelete={handleRemoveFromAlbum}
            onAddClick={() => fileInputRef.current?.click()}
          />
        </div>
      </main>

      {previewMedia && (
        <MediaPreview
          media={previewMedia}
          onClose={() => setPreviewMedia(null)}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={media.length > 1}
          hasNext={media.length > 1}
        />
      )}
    </>
  );
}
