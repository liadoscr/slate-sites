'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PublishSiteButtonProps = {
  projectId: string;
  isCurrentVersionPublished: boolean;
  liveUrl: string | null;
};

export function PublishSiteButton({ projectId, isCurrentVersionPublished, liveUrl }: PublishSiteButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function changePublication() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, { method: isCurrentVersionPublished ? 'DELETE' : 'POST', credentials: 'same-origin' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'לא הצלחנו לעדכן את הפרסום.');
      router.refresh();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'לא הצלחנו לעדכן את הפרסום.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="publish-site-action">
      <button className={isCurrentVersionPublished ? 'unpublish-site-button' : 'publish-site-button'} type="button" onClick={changePublication} disabled={busy}>
        {busy ? 'מעדכנים…' : isCurrentVersionPublished ? 'הסרת האתר מהאוויר' : 'פרסום האתר'}
      </button>
      {liveUrl ? <a className="live-site-link" href={liveUrl} target="_blank" rel="noreferrer">פתיחת האתר החי ↗</a> : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </div>
  );
}
