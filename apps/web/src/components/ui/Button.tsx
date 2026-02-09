import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    className,
    disabled,
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          styles.button,
          styles[variant],
          styles[size],
          loading && styles.loading,
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className={styles.spinner} />
        ) : icon ? (
          <span className={styles.icon}>{icon}</span>
        ) : null}
        {children && <span className={styles.text}>{children}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
