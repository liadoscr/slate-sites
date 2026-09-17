'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './marketing-header.module.css';

type MarketingHeaderProps = {
  locale: 'he' | 'en';
  accountHref: string;
  isSignedIn: boolean;
  showDemos: boolean;
};

function DocumentIcon() {
  return (
    <svg className={styles.documentIcon} width="27" height="31" viewBox="0 0 27 31" fill="none" aria-hidden="true">
      <path d="M5.5 1.5h11l5 5V28a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 28V3a1.5 1.5 0 0 1 1.5-1.5Z" fill="currentColor" />
      <path d="M16.5 1.5V7h5" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 13.5h9M8 18h9M8 22.5h6" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
    </svg>
  );
}

export function MarketingHeader({ locale, accountHref, isSignedIn, showDemos }: MarketingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const english = locale === 'en';
  const homeHref = english ? '/?lang=en' : '/';
  const languageHref = english ? '/' : '/?lang=en';
  const accountLabel = isSignedIn
    ? (english ? 'My sites' : 'האתרים שלי')
    : (english ? 'Log in' : 'התחברות');
  const languageLabel = english ? 'עברית' : 'EN';
  useEffect(() => {
    const html = document.documentElement;
    const previousLang = html.lang;
    const previousDir = html.dir;
    html.lang = locale;
    html.dir = english ? 'ltr' : 'rtl';
    return () => {
      html.lang = previousLang;
      html.dir = previousDir;
    };
  }, [locale, english]);
  const links = [
    { href: '#how-it-works', label: english ? 'How it works' : 'איך זה עובד' },
    ...(showDemos ? [{ href: '#demo-preview', label: english ? 'Examples' : 'דוגמאות' }] : []),
    { href: '#your-workspace', label: english ? 'What you get' : 'מה מקבלים' },
    { href: '#security', label: english ? 'Privacy' : 'פרטיות' },
    { href: 'https://www.slate.co.il/', label: english ? 'Slate ↗' : 'ל־Slate ↗', external: true },
  ];

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header
      className={styles.header}
      dir={english ? 'ltr' : 'rtl'}
      lang={locale}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          closeMenu();
          menuButton.current?.focus();
        }
      }}
    >
      <div className={styles.inner}>
        <Link className={styles.brand} href={homeHref} aria-label={english ? 'Slate Sites, home' : 'Slate Sites, דף הבית'} onClick={closeMenu}>
          <DocumentIcon />
          <span className={styles.brandText}><span className={styles.slateWord}>slate<span className={styles.brandDot}>.</span></span><span className={styles.brandDivider} /><span className={styles.sitesWord}>Sites</span></span>
        </Link>

        <nav className={styles.desktopNav} aria-label={english ? 'Main navigation' : 'ניווט ראשי'}>
          {links.map((link) => link.external
            ? <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
            : <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>

        <div className={styles.desktopActions}>
          <Link className={styles.account} href={accountHref}>{accountLabel}</Link>
          <Link className={styles.language} href={languageHref} hrefLang={english ? 'he' : 'en'} aria-label={english ? 'Switch to Hebrew' : 'Switch to English'}><GlobeIcon /><span>{languageLabel}</span></Link>
        </div>

        <button
          ref={menuButton}
          className={styles.menuButton}
          type="button"
          aria-label={menuOpen ? (english ? 'Close menu' : 'סגירת תפריט') : (english ? 'Open menu' : 'פתיחת תפריט')}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.menuLines} data-open={menuOpen} aria-hidden="true"><span /><span /><span /></span>
        </button>
      </div>

      <nav id={menuId} className={styles.mobileMenu} aria-label={english ? 'Mobile navigation' : 'ניווט לנייד'} hidden={!menuOpen}>
        <Link href={homeHref} onClick={closeMenu}>{english ? 'Home' : 'דף הבית'}</Link>
        {links.map((link) => link.external
          ? <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>{link.label}</a>
          : <a key={link.href} href={link.href} onClick={closeMenu}>{link.label}</a>)}
        <Link href={accountHref} onClick={closeMenu}>{accountLabel}</Link>
        <Link className={styles.mobileLanguage} href={languageHref} hrefLang={english ? 'he' : 'en'} onClick={closeMenu}><GlobeIcon />{languageLabel}</Link>
      </nav>
    </header>
  );
}
