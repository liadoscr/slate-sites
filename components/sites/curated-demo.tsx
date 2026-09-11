import { getCuratedDemo } from '@/lib/sites/demo-catalog';
import { OrangeGelDemo } from './orange-gel-demo';
import { HairSalonDemo } from './hair-salon-demo';
import { PersonalTrainerDemo } from './personal-trainer-demo';

export function CuratedDemo({ content }: { content: unknown }) {
  switch (getCuratedDemo(content)?.template) {
    case 'orange-gel-v1': return <OrangeGelDemo />;
    case 'forma-hair-v1': return <HairSalonDemo />;
    case 'move-trainer-v1': return <PersonalTrainerDemo />;
    default: return null;
  }
}
