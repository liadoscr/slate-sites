import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/data/current-user';
import { isSitePlan, uuidPattern } from '@/lib/sites/document';
import { imageMime } from '@/lib/sites/workspace-server';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{projectId:string;versionId:string;imageId:string}> }) {
  const { projectId,versionId,imageId } = await params;
  if (![projectId,versionId,imageId].every(id=>uuidPattern.test(id))) return new Response(null,{status:404});
  const admin = createAdminClient();
  const { data: version } = await admin.from('site_versions').select('content,visibility').eq('id',versionId).eq('project_id',projectId).maybeSingle();
  if (!version || !isSitePlan(version.content)) return new Response(null,{status:404});
  if (version.visibility !== 'public') {
    const user = await getCurrentUser();
    if (!user) return new Response(null,{status:404});
    const { data: owner } = await admin.from('projects').select('id').eq('id',projectId).eq('owner_id',user.id).maybeSingle();
    if (!owner) return new Response(null,{status:404});
  }
  const image = version.content.images?.find(i=>i.id===imageId);
  if (!image || !image.path.startsWith(`${projectId}/`) || image.path.includes('..')) return new Response(null,{status:404});
  const { data } = await admin.storage.from('site-version-assets').download(image.path);
  if (!data || data.size>8*1024*1024) return new Response(null,{status:404});
  const bytes = new Uint8Array(await data.arrayBuffer());
  const mime = imageMime(bytes);
  if (!mime) return new Response(null,{status:404});
  return new Response(bytes,{headers:{'Content-Type':mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
}
