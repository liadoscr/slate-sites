import demo from './orange-demo.json';

export const ORANGE_DEMO_PROJECT_ID = demo.projectId;

export function isOrangeGelDemo(content: unknown): boolean {
  return Boolean(content && typeof content === 'object' && 'template' in content && content.template === demo.template);
}
