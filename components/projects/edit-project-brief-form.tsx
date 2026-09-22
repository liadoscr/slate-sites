'use client';
import { CreationWizard, type CreationBrief } from './creation-wizard';
type ProjectDetails = {
  id: string; businessName: string; businessType: string | null; location: string | null;
  businessStory: string | null; primaryGoal: string | null; websiteCopy: string | null;
  importantLinks: string | null; tone: string | null; colorPreference: string | null;
  contactEmail: string | null; contactPhone: string | null; designNotes: string | null;
  designReference?: { id: string; url: string; notes: string | null } | null;
};
export function EditProjectBriefForm({ project, userId }: { project: ProjectDetails; userId: string }) {
  const initial: CreationBrief = {
    businessName: project.businessName, businessType: project.businessType ?? '',
    location: project.location ?? '', businessStory: project.businessStory ?? '',
    primaryGoal: project.primaryGoal ?? '', websiteCopy: project.websiteCopy ?? '',
    importantLinks: project.importantLinks ?? '', tone: project.tone ?? '',
    colors: project.colorPreference ?? '', contactEmail: project.contactEmail ?? '',
    contactPhone: project.contactPhone ?? '', designNotes: project.designNotes ?? '', designUrl: '',
  };
  return <CreationWizard userId={userId} projectId={project.id} initialBrief={initial} />;
}
