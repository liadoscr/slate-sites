export type ReferenceAnalysis = {
  summary: string;
  palette: string[];
  layout: 'split' | 'editorial' | 'centered' | 'immersive' | 'bento';
  mode: 'light' | 'dark';
  density: 'airy' | 'compact';
  typography: 'modern' | 'editorial';
  features: string[];
};

export type FocalPoint = { x: number; y: number; mobileX: number; mobileY: number };
export type CreationImage = {
  id: string;
  role: 'reference' | 'logo' | 'hero' | 'gallery';
  alt: string;
  focalPoint?: FocalPoint;
};
export type CreationSettings = {
  schemaVersion: 1;
  referenceAssetId: string | null;
  referenceFocus: 'structure' | 'colors' | 'both';
  starter: 'minimal' | 'editorial' | 'bold';
  brandColor: string;
  notes: string;
  contactPreference: 'whatsapp' | 'phone' | 'email' | 'form';
  images: CreationImage[];
  analysis?: ReferenceAnalysis;
  locks: { design: boolean; text: boolean };
};

export function defaultCreationSettings(): CreationSettings {
  return {
    schemaVersion: 1, referenceAssetId: null, referenceFocus: 'both',
    starter: 'minimal', brandColor: '', notes: '', contactPreference: 'whatsapp',
    images: [], locks: { design: false, text: false },
  };
}
