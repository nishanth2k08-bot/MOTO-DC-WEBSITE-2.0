import { algoliasearch } from 'algoliasearch';

const APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID || '04KTVI2AAM';
const SEARCH_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_KEY || '4cbeb62118744ad6c7c2db4e97e66059';

let _client = null;

export function getAlgoliaSearchClient() {
  if (!_client && APP_ID && SEARCH_KEY) {
    _client = algoliasearch(APP_ID, SEARCH_KEY);
  }
  return _client;
}

export async function searchOrdersWithAlgolia(query, hitsPerPage = 30) {
  if (!query || !query.trim()) return null;
  const client = getAlgoliaSearchClient();
  if (!client) return null;

  try {
    const { results } = await client.search({
      requests: [
        {
          indexName: 'motodc_orders',
          query: query.trim(),
          hitsPerPage
        }
      ]
    });
    return results[0]?.hits || [];
  } catch (err) {
    console.warn('[Algolia search error, falling back to local]', err);
    return null;
  }
}
