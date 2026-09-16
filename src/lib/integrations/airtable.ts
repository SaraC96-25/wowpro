import 'server-only';

type AirtableRecord<T> = {id: string; fields: T};

export type AirtableWowproClient = {
  Email?: string;
  Azienda?: string;
  Referente?: string;
  Stato?: string;
  Piano?: string;
  'Shopify Customer ID'?: string;
};

export async function listAuthorizedWowproClients() {
  const token = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_CLIENTS_TABLE || 'WOWPRO';
  if (!token || !baseId) throw new Error('Configurazione Airtable incompleta.');

  const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`);
  url.searchParams.set('filterByFormula', "{Stato}='Attivo'");
  const response = await fetch(url, {
    headers: {Authorization: `Bearer ${token}`},
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Airtable ha risposto con stato ${response.status}.`);

  const payload = await response.json() as {records: AirtableRecord<AirtableWowproClient>[]};
  return payload.records;
}
