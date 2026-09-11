import { createClient } from '@/lib/supabase/server';
import { uuidPattern } from '@/lib/sites/document';
import { imageMime } from '@/lib/sites/workspace-server';
export async function GET(_request:Request,{params}:{params:Promise<{projectId:string;assetId:string}>}) {
  const {projectId,assetId}=await params;if(![projectId,assetId].every(id=>uuidPattern.test(id)))return new Response(null,{status:404});
  const client=await createClient();
  const {data:asset}=await client.from('project_assets').select('storage_path,size_bytes').eq('project_id',projectId).eq('id',assetId).maybeSingle();
  if(!asset||!asset.storage_path.startsWith(`${projectId}/`)||asset.storage_path.includes('..')||asset.size_bytes>8*1024*1024)return new Response(null,{status:404});
  const {data}=await client.storage.from('project-assets').download(asset.storage_path);
  if(!data||data.size>8*1024*1024)return new Response(null,{status:404});
  const bytes=new Uint8Array(await data.arrayBuffer());const mime=imageMime(bytes);
  return mime?new Response(bytes,{headers:{'Content-Type':mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}):new Response(null,{status:404});
}
