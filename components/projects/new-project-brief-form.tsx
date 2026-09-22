'use client';
import { CreationWizard } from './creation-wizard';
export function NewProjectBriefForm({ userId }: { userId: string }) {
  return <CreationWizard userId={userId} />;
}
