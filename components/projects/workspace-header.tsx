import Link from 'next/link';
import { LogoutButton } from '@/components/auth/logout-button';
import styles from './workspace-header.module.css';

export function WorkspaceHeader({ backHref = '/dashboard', backLabel = '← כל הפרויקטים', homeHref = '/dashboard' }: { backHref?: string; backLabel?: string; homeHref?: string }) {
  return (
    <header className={`simple-header ${styles.header}`}>
      <Link className="brand" href={homeHref} aria-label="Slate Sites"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider" /><span className="brand-product">Sites</span></Link>
      <div className={styles.actions}>
        <Link className="back-link" href={backHref}>{backLabel}</Link>
        <LogoutButton />
      </div>
    </header>
  );
}
