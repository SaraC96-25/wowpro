import 'server-only';

type ShopifyGraphqlResponse<T> = {data?: T; errors?: Array<{message: string}>};

export async function shopifyAdminQuery<T>(query: string, variables: Record<string, unknown> = {}) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || '2026-07';
  if (!domain || !token) throw new Error('Configurazione Shopify incompleta.');

  const response = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({query, variables}),
    cache: 'no-store',
  });
  const payload = await response.json() as ShopifyGraphqlResponse<T>;
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || `Shopify ha risposto con stato ${response.status}.`);
  }
  if (!payload.data) throw new Error('Shopify non ha restituito dati.');
  return payload.data;
}
