'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Folder, ImageIcon, Trash2 } from 'lucide-react';
import { Header, Button, Modal } from '@/components/ui';
import { albumsApi, Album } from '@/lib/api';
import styles from './page.module.css';

export default function HomePage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAlbums();
  }, []);

  async function loadAlbums() {
    try {
      setLoading(true);
      setError(null);
      const response = await albumsApi.list(1, 50);
      setAlbums(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải album');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;

    try {
      setCreating(true);
      await albumsApi.create(newAlbumName.trim(), newAlbumDescription.trim() || undefined);
      setShowCreateModal(false);
      setNewAlbumName('');
      setNewAlbumDescription('');
      loadAlbums();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể tạo album');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAlbum = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Xóa album "${name}"? Ảnh trong album sẽ không bị xóa.`)) return;

    try {
      await albumsApi.delete(id);
      loadAlbums();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể xóa album');
    }
  };

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.headerText}>
              <h1>Ảnh Gia Đình</h1>
              <p>Lưu giữ những khoảnh khắc đáng nhớ</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} icon={<Plus size={18} />}>
              Tạo album
            </Button>
          </div>

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
              <button onClick={loadAlbums}>Thử lại</button>
            </div>
          )}

          {loading ? (
            <div className={styles.grid}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          ) : albums.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <Folder size={64} />
              </div>
              <h3>Chưa có album nào</h3>
              <p>Tạo album đầu tiên để bắt đầu lưu trữ ảnh gia đình</p>
              <Button onClick={() => setShowCreateModal(true)} icon={<Plus size={18} />}>
                Tạo album đầu tiên
              </Button>
            </div>
          ) : (
            <div className={styles.grid}>
              {albums.map(album => (
                <Link key={album.id} href={`/albums/${album.id}`} className={styles.albumCard}>
                  <div className={styles.albumCover}>
                    {album.coverUrl ? (
                      <img src={album.coverUrl} alt={album.name} />
                    ) : (
                      <div className={styles.placeholder}>
                        <ImageIcon size={40} />
                      </div>
                    )}
                    <div className={styles.albumOverlay}>
                      <span className={styles.albumCount}>{album.mediaCount} ảnh</span>
                    </div>
                  </div>
                  <div className={styles.albumInfo}>
                    <h3>{album.name}</h3>
                    {album.description && <p>{album.description}</p>}
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => handleDeleteAlbum(e, album.id, album.name)}
                    title="Xóa album"
                  >
                    <Trash2 size={16} />
                  </button>
                </Link>
              ))}

              {/* Add album card */}
              <button className={styles.addCard} onClick={() => setShowCreateModal(true)}>
                <Plus size={32} />
                <span>Thêm album</span>
              </button>
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo album mới"
      >
        <form onSubmit={handleCreateAlbum} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="albumName">Tên album</label>
            <input
              id="albumName"
              type="text"
              value={newAlbumName}
              onChange={e => setNewAlbumName(e.target.value)}
              placeholder="VD: Kỷ niệm Tết 2024"
              autoFocus
              required
            />
          </div>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!newAlbumName.trim()} loading={creating}>
              Tạo album
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
