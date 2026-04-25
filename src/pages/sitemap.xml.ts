import { buildSitemapXml } from '../content/seo';
import { getSitemapEntries } from '../content/routes';

export async function GET() {
  return new Response(buildSitemapXml(getSitemapEntries()), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
