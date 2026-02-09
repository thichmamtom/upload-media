'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Image, Home, Info } from 'lucide-react';
import styles from './Header.module.css';

const navLinks = [
  { href: '/', label: 'Album', icon: Home },
  { href: '/about', label: 'Giới thiệu', icon: Info },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <Image size={24} />
          </div>
          <span className={styles.logoText}>Ảnh Gia Đình</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.desktopNav}>
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${pathname === href ? styles.active : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          className={styles.mobileMenuButton}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className={styles.mobileNav}>
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.mobileNavLink} ${pathname === href ? styles.active : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
