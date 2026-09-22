import { focalPointFor, themeFor, type GeneratedSitePlan } from './document';

type Locks = { design: boolean; text: boolean };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function designFields(plan: GeneratedSitePlan) {
  return {
    template: 'template' in plan ? plan.template : undefined,
    theme: themeFor(plan), visualDirection: plan.visualDirection, heroImageId: plan.heroImageId,
    sections: plan.sections.map(section => ({ id: section.id, kind: section.kind, imageId: section.imageId, presentation: section.presentation })),
    images: plan.images?.map(image => ({ id: image.id, path: image.path, role: image.role, mimeType: image.mimeType, focalPoint: focalPointFor(image) })),
  };
}

function textFields(plan: GeneratedSitePlan) {
  return {
    template: 'template' in plan ? plan.template : undefined,
    siteTitle: plan.siteTitle, positioning: plan.positioning, contactCta: plan.contactCta,
    seo: plan.seo, business: plan.business, contactPreference: plan.contactPreference,
    sections: plan.sections.map(section => ({ id: section.id, label: section.label, headline: section.headline, body: section.body, cta: section.cta })).sort((a, b) => a.id.localeCompare(b.id)),
    images: plan.images?.map(image => ({ id: image.id, alt: image.alt })).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

/** Compare stored plans, including restore/apply, never request-supplied lock flags. */
export function revisionLockError(base: GeneratedSitePlan, next: GeneratedSitePlan, locks: Locks): string | null {
  if (locks.design && canonical(designFields(base)) !== canonical(designFields(next))) return 'העיצוב נעול. כדי לשנות מבנה, צבעים, תמונות או חיתוך, בטלו קודם את נעילת העיצוב.';
  if (locks.text && canonical(textFields(base)) !== canonical(textFields(next))) return 'התוכן נעול. כדי לשנות טקסט, פרטי קשר, תיאורי תמונות או הגדרות חיפוש, בטלו קודם את נעילת התוכן.';
  return null;
}
