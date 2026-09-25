'use client';
import { useEffect, useState } from 'react';
import { CreationWizard } from './creation-wizard';
import { QuickStartForm } from './quick-start-form';
import styles from './quick-start-form.module.css';

export function NewProjectBriefForm({ userId, stockPhotosAvailable = false }: { userId: string; stockPhotosAvailable?: boolean }) {
  const [mode, setMode] = useState<'automatic' | 'guided'>('automatic');
  const [guidedOpened, setGuidedOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`slate-creation:${userId}:new`);
      const draft = raw ? JSON.parse(raw) : null;
      if (draft?.userId === userId && draft.brief?.businessName) { setMode('guided'); setGuidedOpened(true); }
    } catch { /* Draft storage is optional. */ }
  }, [userId]);
  const openGuided = () => { if (!busy) { setGuidedOpened(true); setMode('guided'); } };
  return <div className={styles.wrapper} dir="rtl">
    <div className={styles.choices} role="group" aria-label="איך תרצו ליצור את האתר?">
      <button type="button" aria-pressed={mode === 'automatic'} disabled={busy} onClick={() => setMode('automatic')}>
        <strong>תארו את העסק — ניצור בשבילכם</strong><span>עיצוב, תוכן ותמונות מאגר מתוך תיאור קצר</span>
      </button>
      <button type="button" aria-pressed={mode === 'guided'} disabled={busy} onClick={openGuided}>
        <strong>יש לי כיוון עיצובי</strong><span>בחירת סגנון או תמונת השראה והעלאת תמונות משלכם</span>
      </button>
    </div>
    <div hidden={mode !== 'automatic'}>
      <QuickStartForm userId={userId} stockPhotosAvailable={stockPhotosAvailable} onManual={openGuided} onBusyChange={setBusy} />
    </div>
    {guidedOpened ? <div hidden={mode !== 'guided'}><CreationWizard userId={userId} /></div> : null}
  </div>;
}
