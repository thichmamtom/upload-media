import { Metadata } from 'next';
import { Header } from '@/components/ui';
import { UploadZone } from '@/components/upload';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Tải lên - Ảnh Gia Đình',
  description: 'Tải ảnh và video lên kho lưu trữ gia đình',
};

export default function UploadPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Tải ảnh lên</h1>
            <p className={styles.subtitle}>
              Kéo thả hoặc chọn ảnh và video để tải lên. Chất lượng gốc được giữ nguyên.
            </p>
          </div>
          <UploadZone />
        </div>
      </main>
    </>
  );
}
