'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PublishSiteButtonProps = {
  projectId: string;
  isCurrentVersionPublished: boolean;
  hasLiveSite: boolean;
  liveUrl: string | null;
  versionId: string;
};

export function PublishSiteButton({ projectId, versionId, isCurrentVersionPublished, hasLiveSite, liveUrl }: PublishSiteButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<'POST' | 'DELETE' | null>(null);
  const [reviewed, setReviewed] = useState(false);

  async function changePublication(method: 'POST' | 'DELETE') {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/projects/${projectId}/publish`, { method, credentials: 'same-origin', headers:{'Content-Type':'application/json'}, ...(method==='POST'?{body:JSON.stringify({versionId,reviewed})}:{}) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'לא הצלחנו לעדכן את הפרסום.');
      router.refresh();
      setConfirm(null);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'לא הצלחנו לעדכן את הפרסום.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="publish-site-action">
      {!isCurrentVersionPublished ? <button className="publish-site-button" type="button" onClick={() => setConfirm('POST')} disabled={busy}>
        {busy ? 'מעדכנים…' : hasLiveSite ? 'פרסום הגרסה החדשה' : 'פרסום האתר'}
      </button> : null}
      {liveUrl ? <a className="live-site-link" href={liveUrl} target="_blank" rel="noreferrer">פתיחת האתר החי ↗</a> : null}
      {hasLiveSite ? <button className="unpublish-site-button" type="button" onClick={() => setConfirm('DELETE')} disabled={busy}>{busy ? 'מעדכנים…' : 'הסרת האתר מהאוויר'}</button> : null}
      {confirm ? <div className="publication-confirm" role="group" aria-label="אישור פרסום"><p>{confirm==='POST'?'הגרסה שבחרתם תחליף את האתר החי ותהיה זמינה לכל מי שיש לו קישור.':'האתר לא יהיה זמין למבקרים. כל הגרסאות יישמרו ותוכלו לפרסם שוב.'}</p>{confirm==='POST'?<><a href={`/dashboard/projects/${projectId}/preview?version=${versionId}`} target="_blank" rel="noreferrer">לבדיקת הגרסה המדויקת ↗</a><label className="checkbox"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} />בדקתי את התוכן, התמונות ופרטי הקשר.</label></>:null}<button className="secondary-button" type="button" disabled={busy || (confirm==='POST'&&!reviewed)} onClick={()=>changePublication(confirm)}>{busy?'מעדכנים…':'אישור'}</button><button type="button" className="quiet-button" disabled={busy} onClick={()=>setConfirm(null)}>ביטול</button></div>:null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </div>
  );
}
