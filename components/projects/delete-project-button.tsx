'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type DeleteProjectButtonProps = {
  projectId: string;
  businessName: string;
  isPublished: boolean;
  isDemo: boolean;
};

export function DeleteProjectButton({ projectId, businessName, isPublished, isDemo }: DeleteProjectButtonProps) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmationName, setConfirmationName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cleanupPending, setCleanupPending] = useState(false);

  useEffect(() => {
    if (confirming) headingRef.current?.focus();
  }, [confirming]);

  function cancel() {
    setConfirming(false);
    setConfirmationName('');
    setError('');
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function deleteProject() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationName }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'לא הצלחנו למחוק את הפרויקט.');
      if (result.cleanupPending === true) {
        setCleanupPending(true);
        setBusy(false);
        return;
      }
      router.replace('/dashboard?deleted=1');
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'לא הצלחנו למחוק את הפרויקט.');
      setBusy(false);
    }
  }

  const canDelete = confirmationName.trim() === businessName;

  return (
    <section className="panel danger-zone" aria-labelledby="delete-project-title">
      <div>
        <p className="kicker">אזור מסוכן</p>
        <h2 id="delete-project-title">מחיקת הפרויקט</h2>
        <p>הפעולה מוחקת לצמיתות את הפרויקט ומסירה מיד את האתר הציבורי. גם הקבצים הפרטיים נמחקים; אם יידרש ניסיון ניקוי נוסף נציג אותו כאן.</p>
      </div>
      {cleanupPending ? (
        <div className="delete-project-confirmation" role="group" aria-labelledby="delete-cleanup-title" aria-busy={busy}>
          <h3 id="delete-cleanup-title">הפרויקט והאתר הציבורי נמחקו</h3>
          <p role="status">נותרו קבצים פרטיים בתהליך מחיקה. השאירו את העמוד פתוח ולחצו שוב כדי להמשיך את הניקוי הבטוח.</p>
          <div className="danger-actions">
            <button className="delete-project-button delete-project-button-final" type="button" disabled={busy} onClick={deleteProject}>
              {busy ? 'מנקים…' : 'ניסיון ניקוי נוסף'}
            </button>
            <button className="quiet-button" type="button" disabled={busy} onClick={() => router.push('/dashboard')}>חזרה לפרויקטים</button>
          </div>
          {error ? <p className="error-message" role="alert">{error}</p> : null}
        </div>
      ) : !confirming ? (
        <button
          ref={triggerRef}
          className="delete-project-button"
          type="button"
          aria-expanded="false"
          aria-controls="delete-project-confirmation"
          onClick={() => setConfirming(true)}
        >
          מחיקת הפרויקט
        </button>
      ) : (
        <div id="delete-project-confirmation" className="delete-project-confirmation" role="group" aria-busy={busy} aria-describedby="delete-project-description">
          <h3 ref={headingRef} tabIndex={-1}>למחוק את “{businessName}”?</h3>
          <p id="delete-project-description">
            לא ניתן לבטל את הפעולה.
            {isPublished ? ' האתר החי יוסר מיד והקישור הציבורי יפסיק לעבוד.' : ''}
            {isDemo ? ' אתר ההדגמה יוסר גם מקרוסלת הדוגמאות בעמוד הבית.' : ''}
            {' אם ניקוי הקבצים ידרוש יותר מפעולה אחת, תוכלו להמשיך אותו מכאן.'}
          </p>
          <label className="field">
            כדי לאשר, הקלידו <bdi>{businessName}</bdi>
            <input
              value={confirmationName}
              onChange={(event) => setConfirmationName(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
          </label>
          <div className="danger-actions">
            <button className="delete-project-button delete-project-button-final" type="button" disabled={busy || !canDelete} onClick={deleteProject}>
              {busy ? 'מוחקים…' : 'כן, למחוק לצמיתות'}
            </button>
            <button className="quiet-button" type="button" disabled={busy} onClick={cancel}>ביטול</button>
          </div>
          {error ? <p className="error-message" role="alert">{error}</p> : null}
        </div>
      )}
    </section>
  );
}
