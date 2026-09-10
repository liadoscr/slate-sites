'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PublishSiteButtonProps = {
  projectId: string;
  isCurrentVersionPublished: boolean;
  hasLiveSite: boolean;
  liveUrl: string | null;
};

export function PublishSiteButton({ projectId, isCurrentVersionPublished, hasLiveSite, liveUrl }: PublishSiteButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function changePublication(method: 'POST' | 'DELETE') {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, { method, credentials: 'same-origin' });
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
      {!isCurrentVersionPublished ? <button className="publish-site-button" type="button" onClick={() => changePublication('POST')} disabled={busy}>
        {busy ? 'מעדכנים…' : hasLiveSite ? 'פרסום הגרסה החדשה' : 'פרסום האתר'}
      </button> : null}
      {liveUrl ? <a className="live-site-link" href={liveUrl} target="_blank" rel="noreferrer">פתיחת האתר החי ↗</a> : null}
      {hasLiveSite ? <button className="unpublish-site-button" type="button" onClick={() => changePublication('DELETE')} disabled={busy}>{busy ? 'מעדכנים…' : 'הסרת האתר מהאוויר'}</button> : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </div>
  );
}
