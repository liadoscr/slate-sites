'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './logout-button.module.css';

export function LogoutButton({ locale = 'he' }: { locale?: 'he' | 'en' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  const english = locale === 'en';

  async function logout() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(false);
    try {
      // Only end this browser's session; leave the user's other devices signed in.
      const { error } = await createClient().auth.signOut({ scope: 'local' });
      if (error) throw error;
      // A fresh document discards authenticated pages in the client router cache.
      window.location.replace(english ? '/?lang=en' : '/');
    } catch {
      setError(true);
      setBusy(false);
      inFlight.current = false;
    }
  }

  return (
    <div className={styles.wrapper}>
      <button className={styles.button} type="button" onClick={logout} disabled={busy} aria-busy={busy}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5H5v14h4M13 8l4 4-4 4M9 12h12" /></svg>
        {busy ? (english ? 'Logging out…' : 'מתנתקים…') : (english ? 'Log out' : 'התנתקות')}
      </button>
      {error && <p className={styles.error} role="alert">{english ? 'Could not log out. Please try again.' : 'לא הצלחנו להתנתק. נסו שוב.'}</p>}
    </div>
  );
}
