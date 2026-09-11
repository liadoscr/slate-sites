'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
type Asset={id:string;original_name:string;mime_type:string;size_bytes:number};
export function AssetLibrary({projectId,assets}:{projectId:string;assets:Asset[]}) {
  const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
  const uploaded=useRef(new Map<string,{id:string;path:string;stored:boolean;saved:boolean}>());
  return <div className="asset-library"><h3>התמונות והחומרים שלך</h3><p>התמונות נשמרות בפרויקט. רק תמונות שתבחרו ליצירה יישלחו ל־AI או יופיעו באתר.</p>
    <form onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const data=new FormData(form);const files=(data.getAll('files') as File[]).filter(f=>f.size);if(data.get('rights')!=='on'){setError('אשרו שיש לכם הרשאה להשתמש בקבצים.');return;}if(files.length>6||files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>8*1024*1024)){setError('בחרו עד 6 תמונות JPG, PNG או WebP, עד 8MB לכל תמונה.');return;}
      setBusy(true);setError('');setMessage('');try{const client=createClient();for(const file of files){const key=`${file.name}-${file.size}-${file.lastModified}`;let record=uploaded.current.get(key);if(!record){const id=crypto.randomUUID();record={id,path:`${projectId}/${id}`,stored:false,saved:false};uploaded.current.set(key,record);}if(!record.stored){const {error}=await client.storage.from('project-assets').upload(record.path,file,{contentType:file.type,upsert:false});if(error)throw error;record.stored=true;}if(!record.saved){const {error}=await client.from('project_assets').upsert({id:record.id,project_id:projectId,storage_path:record.path,original_name:file.name,mime_type:file.type,size_bytes:file.size},{onConflict:'id'});if(error)throw error;record.saved=true;}}
      form.reset();setMessage('התמונות נשמרו. אפשר לבחור אותן ביצירת הכיוון החדש.');router.refresh();}catch{setError('חלק מההעלאה לא הושלם. השאירו את הקבצים שנבחרו ונסו שוב.');}finally{setBusy(false);}}}>
      <label className="field">הוספת תמונות<input name="files" type="file" accept="image/jpeg,image/png,image/webp" multiple required /></label><label className="checkbox"><input type="checkbox" name="rights" required />יש לי הרשאה להשתמש בתמונות ולפרסם אותן.</label><button className="secondary-button" disabled={busy}>{busy?'מעלים ושומרים…':'שמירת התמונות'}</button>
    </form>{error?<p className="error-message" role="alert">{error}</p>:null}{message?<p className="success-message" role="status">{message}</p>:null}
    <ul className="file-list">{assets.map(a=><li key={a.id}><b>{a.original_name}</b><span>{Math.ceil(a.size_bytes/1024)}KB</span></li>)}</ul>
  </div>;
}
