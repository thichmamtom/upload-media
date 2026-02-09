import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Ảnh Gia Đình - Lưu Trữ Kỷ Niệm',
  description: 'Lưu trữ và chia sẻ ảnh gia đình một cách an toàn. Tải lên ảnh và video với chất lượng gốc.',
  keywords: ['ảnh gia đình', 'lưu trữ ảnh', 'album ảnh', 'kỷ niệm', 'video gia đình'],
  authors: [{ name: 'Ảnh Gia Đình' }],
  openGraph: {
    title: 'Ảnh Gia Đình - Lưu Trữ Kỷ Niệm',
    description: 'Lưu trữ và chia sẻ ảnh gia đình một cách an toàn',
    type: 'website',
    locale: 'vi_VN',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
