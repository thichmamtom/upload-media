'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Folder, ImageIcon } from 'lucide-react';
import { Header, Button, Modal } from '@/components/ui';
import { albumsApi, Album } from '@/lib/api';
import styles from './page.module.css';

export default function AlbumsPage() {
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

  const handleDeleteAlbum = async (id: string, name: string) => {
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
            <div>
              <h1>Album ảnh</h1>
              <p>Sắp xếp ảnh theo từng bộ sưu tập</p>
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
              {[...Array(4)].map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          ) : albums.length === 0 ? (
            <div className={styles.empty}>
              <Folder size={48} />
              <h3>Chưa có album nào</h3>
              <p>Tạo album đầu tiên để sắp xếp ảnh của bạn</p>
              <Button onClick={() => setShowCreateModal(true)} icon={<Plus size={18} />}>
                Tạo album
              </Button>
            </div>
          ) : (
            <div className={styles.grid}>
              {albums.map(album => (
                <div key={album.id} className={styles.albumCard}>
                  <Link href={`/albums/${album.id}`} className={styles.albumLink}>
                    <div className={styles.albumCover}>
                      {album.coverUrl ? (
                        <img src={album.coverUrl} alt={album.name} />
                      ) : (
                        <div className={styles.placeholder}>
                          <ImageIcon size={32} />
                        </div>
                      )}
                    </div>
                    <div className={styles.albumInfo}>
                      <h3>{album.name}</h3>
                      <p>{album.mediaCount} ảnh</p>
                    </div>
                  </Link>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteAlbum(album.id, album.name)}
                    title="Xóa album"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
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
              placeholder="Nhập tên album"
              autoFocus
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="albumDescription">Mô tả (không bắt buộc)</label>
            <textarea
              id="albumDescription"
              value={newAlbumDescription}
              onChange={e => setNewAlbumDescription(e.target.value)}
              placeholder="Nhập mô tả"
              rows={3}
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
