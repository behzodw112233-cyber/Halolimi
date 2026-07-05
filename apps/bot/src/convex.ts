import { ConvexHttpClient } from 'convex/browser';
import { api } from '@halolmia/backend/convex/_generated/api';
import type { Doc } from '@halolmia/backend/convex/_generated/dataModel';

const url = process.env.CONVEX_URL;
if (!url) {
  console.error('❌ CONVEX_URL topilmadi. .env fayliga CONVEX_URL ni qoʻshing.');
  process.exit(1);
}

export const convex = new ConvexHttpClient(url);
export { api };

export type Category = Doc<'categories'>;
export type Listing = Doc<'listings'>;
export type Ad = Doc<'ads'>;

// Categories change rarely — cache them in-memory (restart the bot to refresh).
let catCache: Category[] | null = null;
export async function getCategories(): Promise<Category[]> {
  if (!catCache) catCache = await convex.query(api.categories.list);
  return catCache;
}
export async function categoryBySlug(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find((c) => c.slug === slug);
}
