import orange from './orange-demo.json';
import businessDemos from './business-demos.json';

// Only these explicitly curated versions use a hand-crafted renderer.
export const demoCatalog = [
  { projectId: orange.projectId, template: orange.template, name: 'ORANGE.GEL', category: 'סטודיו לציפורניים', description: 'מניקור עם אופי. כתום נועז, טיפולים וצבעים לבחירה.', image: '/gel-orange-hero.png', imageAlt: 'מניקור כתום מתוך אתר ההדגמה ORANGE.GEL', color: '#171717', background: '#ff5c1a' },
  ...businessDemos.map(({ projectId, template, name, category, description, image, imageAlt, color, background }) => ({ projectId, template, name, category, description, image, imageAlt, color, background })),
];

export function getCuratedDemo(content: unknown) {
  if (!content || typeof content !== 'object' || !('template' in content)) return undefined;
  return demoCatalog.find(demo => demo.template === content.template);
}
