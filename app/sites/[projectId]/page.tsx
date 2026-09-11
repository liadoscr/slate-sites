import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicContactForm } from '@/components/sites/public-contact-form';
import { getPublishedSite } from '@/lib/sites/public-site';
import { isOrangeGelDemo } from '@/lib/sites/orange-demo';
import { OrangeGelDemo } from '@/components/sites/orange-gel-demo';
import { SiteRenderer } from '@/components/sites/site-renderer';
import { isSitePlan } from '@/lib/sites/document';
export const dynamic = 'force-dynamic';
type Props = {params:Promise<{projectId:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const site=await getPublishedSite((await params).projectId); const plan=site?.version.content;
  if (!isSitePlan(plan)) return {title:'האתר אינו זמין | Slate Sites',description:'',robots:{index:false}};
  return {title:plan.seo.title,description:plan.seo.description,...(isOrangeGelDemo(plan)?{robots:{index:false,follow:true}}:{})};
}
export default async function PublicSitePage({params}:Props) {
  const {projectId}=await params; const site=await getPublishedSite(projectId);
  if (!site || !isSitePlan(site.version.content)) notFound();
  if (isOrangeGelDemo(site.version.content)) return <OrangeGelDemo />;
  return <main><SiteRenderer plan={site.version.content} projectId={projectId} versionId={site.version.id} contact={<PublicContactForm projectId={projectId} heading="בואו נדבר" />} /></main>;
}
