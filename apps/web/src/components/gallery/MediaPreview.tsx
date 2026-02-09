'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { MediaItem } from './MediaCard';
import styles from './MediaPreview.module.css';

interface MediaPreviewProps {
  media: MediaItem;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function MediaPreview({
  media,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false
}: MediaPreviewProps) {
  const isVideo = media.mimeType.startsWith('video/');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrev && onPrev) onPrev();
          break;
        case 'ArrowRight':
          if (hasNext && onNext) onNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = media.originalUrl;
    link.download = media.filename;
    link.click();
  };

  return (
    <div className={styles.overlay}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.info}>
          <span className={styles.filename}>{media.filename}</span>
          <span className={styles.meta}>
            {media.width && media.height && `${media.width} × ${media.height} · `}
            {formatFileSize(media.size)}
          </span>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={handleDownload}
            aria-label="Download"
          >
            <Download size={20} />
          </button>
          <button
            className={styles.actionButton}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content} onClick={onClose}>
        <div
          className={styles.mediaWrapper}
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo ? (
            <video
              src={media.originalUrl}
              className={styles.video}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <Image
              src={media.originalUrl}
              alt={media.filename}
              fill
              className={styles.image}
              sizes="100vw"
              priority
            />
          )}
        </div>
      </div>

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          className={`${styles.navButton} ${styles.prevButton}`}
          onClick={onPrev}
          aria-label="Previous"
        >
          <ChevronLeft size={32} />
        </button>
      )}
      {hasNext && (
        <button
          className={`${styles.navButton} ${styles.nextButton}`}
          onClick={onNext}
          aria-label="Next"
        >
          <ChevronRight size={32} />
        </button>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
