'use client';

import { useState, useCallback } from 'react';
import { Download, Trash2, X, Plus } from 'lucide-react';
import { MediaCard, MediaItem } from './MediaCard';
import styles from './MediaGrid.module.css';

interface MediaGridProps {
  media: MediaItem[];
  loading?: boolean;
  onPreview?: (media: MediaItem) => void;
  onDownload?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  onAddClick?: () => void; // Để mở file picker
}

export function MediaGrid({
  media,
  loading = false,
  onPreview,
  onDownload,
  onDelete,
  onAddClick,
}: MediaGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = () => setSelectedIds(new Set(media.map(m => m.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleDownload = () => {
    if (onDownload && selectedIds.size > 0) {
      onDownload(Array.from(selectedIds));
      clearSelection();
    }
  };

  const handleDelete = () => {
    if (onDelete && selectedIds.size > 0) {
      onDelete(Array.from(selectedIds));
      clearSelection();
    }
  };

  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (media.length === 0 && !onAddClick) return null;

  const hasSelection = selectedIds.size > 0;

  return (
    <div className={styles.wrapper}>
      {/* Floating action bar */}
      {hasSelection && (
        <div className={styles.actionBar}>
          <button onClick={clearSelection} className={styles.iconBtn}>
            <X size={20} />
          </button>

          <span className={styles.count}>{selectedIds.size}</span>

          {selectedIds.size < media.length && (
            <button onClick={selectAll} className={styles.textBtn}>
              Chọn tất cả
            </button>
          )}

          <div className={styles.spacer} />

          <button onClick={handleDownload} className={styles.iconBtn}>
            <Download size={20} />
          </button>

          <button onClick={handleDelete} className={`${styles.iconBtn} ${styles.danger}`}>
            <Trash2 size={20} />
          </button>
        </div>
      )}

      <div className={styles.grid}>
        {/* Nút thêm ảnh - item đầu tiên */}
        {onAddClick && (
          <button className={styles.addButton} onClick={onAddClick}>
            <Plus size={32} />
          </button>
        )}

        {media.map(item => (
          <MediaCard
            key={item.id}
            media={item}
            selected={selectedIds.has(item.id)}
            onSelect={toggleSelection}
            onPreview={onPreview}
          />
        ))}
      </div>
    </div>
  );
}
