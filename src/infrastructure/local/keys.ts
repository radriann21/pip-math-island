/** Namespaced localStorage keys. Bump the version segment when the stored shape changes incompatibly. */
export const MODE_KEY = 'pip.v2.mode';
export const CHILDREN_KEY = 'pip.v2.children';
export const progressKeyFor = (childId: string): string => `pip.v2.progress.${childId}`;
