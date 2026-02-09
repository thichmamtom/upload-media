'use client';

import { useState } from 'react';
import { Check, ImageIcon } from 'lucide-react';
import styles from './MediaCard.module.css';

export interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  thumbnailUrl: string;
  originalUrl: string;
  width?: number;
  height?: number;
  size: number;
  createdAt: string;
}

interface MediaCardProps {
  media: MediaItem;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onPreview?: (media: MediaItem) => void;
}

export function MediaCard({
  media,
  selected = false,
  onSelect,
  onPreview
}: MediaCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Single click = chọn/bỏ chọn, Double click = xem ảnh
  const handleClick = () => {
    onSelect?.(media.id);
  };

  const handleDoubleClick = () => {
    onPreview?.(media);
  };

  const imageUrl = media.thumbnailUrl || media.originalUrl;

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Thumbnail */}
      <div className={styles.imageWrapper}>
        {!loaded && !error && (
          <div className={styles.skeleton}>
            <ImageIcon size={28} className={styles.skeletonIcon} />
          </div>
        )}
        {error ? (
          <div className={styles.errorPlaceholder}>
            <ImageIcon size={28} />
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={media.filename}
            className={`${styles.image} ${loaded ? styles.loaded : ''}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        )}

        {/* Check icon khi được chọn */}
        {selected && (
          <div className={styles.checkBadge}>
            <Check size={16} strokeWidth={3} />
          </div>
        )}
      </div>
    </div>
  );
}
