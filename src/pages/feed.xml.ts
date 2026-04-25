import { buildFeedXml } from '../content/seo';
import { getEssayFeedItems } from '../content/routes';

export async function GET() {
  return new Response(buildFeedXml(getEssayFeedItems()), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
