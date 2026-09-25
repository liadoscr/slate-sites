// The model selects a category, never an arbitrary outbound search query.
// Only these generic terms are sent to Pexels, not business names/contact details.
export const stockSubjects = {
  butcher: 'fresh meat butcher counter', bakery: 'artisan bakery bread', cafe: 'coffee cafe',
  restaurant: 'restaurant food plate', catering: 'catering food buffet', hair: 'hair salon tools',
  nails: 'manicure nail polish', beauty: 'beauty skincare products', fitness: 'gym workout equipment',
  yoga: 'yoga mat studio', massage: 'spa massage room', physiotherapy: 'physical therapy equipment',
  dentistry: 'dental clinic equipment', clinic: 'medical clinic interior', therapy: 'calm interior therapy',
  gardening: 'garden plants gardening', florist: 'flower bouquet florist', cleaning: 'cleaning supplies',
  plumbing: 'plumbing tools', electrical: 'electrician tools', renovation: 'home renovation tools',
  carpentry: 'woodworking carpentry', architecture: 'architecture building', interiors: 'interior design living room',
  real_estate: 'residential house exterior', photography: 'camera photography equipment',
  pets: 'pet dog grooming', automotive: 'car workshop tools', tutoring: 'books studying desk',
  music: 'musical instruments', art: 'painting art supplies', legal: 'law books office',
  accounting: 'accounting desk calculator', consulting: 'business workspace', technology: 'computer workspace',
  fashion: 'clothing fashion fabric', jewelry: 'jewelry accessories', travel: 'travel landscape',
  events: 'event table decoration', printing: 'printing paper stationery', crafts: 'handmade craft tools',
  delivery: 'delivery cardboard packages', sports: 'sports equipment', none: '',
} as const;
export type StockSubject = keyof typeof stockSubjects;
export function stockQueriesFor(value: unknown): string[] {
  if (typeof value !== 'string' || !Object.hasOwn(stockSubjects, value)) return [];
  const query = stockSubjects[value as StockSubject];
  return query ? [query] : [];
}
