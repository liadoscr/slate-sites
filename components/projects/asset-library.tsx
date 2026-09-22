import Link from 'next/link';
type Asset = { id: string; original_name: string; mime_type: string; size_bytes: number };
export function AssetLibrary({ projectId, assets }: { projectId: string; assets: Asset[] }) {
  return <div className="asset-library"><h3>התמונות והחומרים שלך</h3><p>ההשראה ותמונות העסק מנוהלות בנפרד במסלול היצירה. רק תמונות עסק שנבחרו יוכלו להופיע באתר.</p>
    <Link className="secondary-action" href={`/dashboard/projects/${projectId}/edit`}>ניהול ההשראה והתמונות ←</Link>
    <ul className="file-list">{assets.map(asset => <li key={asset.id}><b>{asset.original_name}</b><span>{Math.ceil(asset.size_bytes / 1024)}KB</span></li>)}</ul>
  </div>;
}
