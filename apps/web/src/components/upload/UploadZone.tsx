'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadsApi, uploadFileToAzure } from '@/lib/api';
import styles from './UploadZone.module.css';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  mediaId?: string;
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

export function UploadZone() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Định dạng không hỗ trợ: ${file.type}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File quá lớn (tối đa 10GB)';
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const uploadFiles: UploadFile[] = fileArray.map(file => {
      const error = validateFile(file);
      return {
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      };
    });
    setFiles(prev => [...prev, ...uploadFiles]);
  }, []);

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
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }, [addFiles]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const updateFile = useCallback((id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const uploadFile = async (uploadFile: UploadFile) => {
    const { id, file } = uploadFile;

    try {
      updateFile(id, { status: 'uploading', progress: 0 });

      // 1. Khởi tạo upload và lấy SAS URL
      const initResult = await uploadsApi.init(file.name, file.size, file.type);

      // 2. Tải file lên Azure Blob Storage
      const blockIds = await uploadFileToAzure(
        file,
        initResult.sasUrl,
        initResult.blockSize,
        (progress) => updateFile(id, { progress: progress * 0.9 })
      );

      updateFile(id, { status: 'processing', progress: 95 });

      // 3. Hoàn tất upload (tạo thumbnail)
      const completeResult = await uploadsApi.complete(initResult.uploadId, blockIds);

      updateFile(id, {
        status: 'complete',
        progress: 100,
        mediaId: completeResult.mediaId,
      });
    } catch (error) {
      updateFile(id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Tải lên thất bại',
      });
    }
  };

  const startUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    for (const file of pendingFiles) {
      await uploadFile(file);
    }

    setIsUploading(false);
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'complete'));
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const completedCount = files.filter(f => f.status === 'complete').length;

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileSelect}
          className={styles.input}
        />
        <Upload className={styles.icon} size={48} />
        <h3>Kéo thả file vào đây hoặc nhấn để chọn</h3>
        <p>Hỗ trợ ảnh và video đến 10GB</p>
      </div>

      {files.length > 0 && (
        <div className={styles.fileList}>
          <div className={styles.listHeader}>
            <span>{files.length} file</span>
            <div className={styles.listActions}>
              {completedCount > 0 && (
                <button onClick={clearCompleted} className={styles.clearBtn}>
                  Xóa đã hoàn thành
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  onClick={startUpload}
                  disabled={isUploading}
                  className={styles.uploadBtn}
                >
                  {isUploading ? 'Đang tải...' : `Tải lên ${pendingCount} file`}
                </button>
              )}
            </div>
          </div>

          <div className={styles.files}>
            {files.map(file => (
              <div key={file.id} className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{file.file.name}</span>
                  <span className={styles.fileSize}>
                    {formatFileSize(file.file.size)}
                  </span>
                </div>

                <div className={styles.fileStatus}>
                  {file.status === 'pending' && (
                    <span className={styles.pending}>Sẵn sàng</span>
                  )}
                  {file.status === 'uploading' && (
                    <div className={styles.progressWrapper}>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <span>{Math.round(file.progress)}%</span>
                    </div>
                  )}
                  {file.status === 'processing' && (
                    <span className={styles.processing}>
                      <Loader2 size={16} className={styles.spin} />
                      Đang xử lý...
                    </span>
                  )}
                  {file.status === 'complete' && (
                    <span className={styles.complete}>
                      <CheckCircle size={16} />
                      Hoàn thành
                    </span>
                  )}
                  {file.status === 'error' && (
                    <span className={styles.error}>
                      <AlertCircle size={16} />
                      {file.error}
                    </span>
                  )}
                </div>

                {(file.status === 'pending' || file.status === 'error') && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className={styles.removeBtn}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
