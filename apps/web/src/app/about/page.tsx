'use client';

import { Header } from '@/components/ui';
import { Image, Heart, Shield, Zap } from 'lucide-react';
import styles from './page.module.css';

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <div className={styles.iconWrap}>
              <Image size={48} />
            </div>
            <h1>Ảnh Gia Đình</h1>
            <p className={styles.subtitle}>
              Lưu trữ và chia sẻ những khoảnh khắc đáng nhớ cùng gia đình
            </p>
          </div>

          <div className={styles.features}>
            <div className={styles.feature}>
              <Heart className={styles.featureIcon} size={32} />
              <h3>Lưu Giữ Kỷ Niệm</h3>
              <p>Upload và tổ chức ảnh theo album, dễ dàng tìm kiếm và chia sẻ</p>
            </div>

            <div className={styles.feature}>
              <Shield className={styles.featureIcon} size={32} />
              <h3>An Toàn & Bảo Mật</h3>
              <p>Ảnh được lưu trữ trên Azure Cloud với độ bảo mật cao</p>
            </div>

            <div className={styles.feature}>
              <Zap className={styles.featureIcon} size={32} />
              <h3>Nhanh Chóng</h3>
              <p>Tải lên hàng loạt ảnh với tốc độ cao, hỗ trợ nhiều định dạng</p>
            </div>
          </div>

          <div className={styles.footer}>
            <p>Được phát triển với ❤️ cho gia đình Việt Nam</p>
          </div>
        </div>
      </main>
    </>
  );
}
