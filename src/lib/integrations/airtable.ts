import 'server-only';

export type AirtableRecord<T> = {id: string; fields: T};

export type AirtableWowproClient = {
  cliente_id?: string;
  ragione_sociale?: string;
  email_login?: string;
  piano?: string;
  crediti_inclusi_mese?: number;
  crediti_inclusi_residui?: number;
  crediti_extra_residui?: number;
  data_rinnovo_piano?: string;
  shopify_customer_id?: string;
  stato_abbonamento?: string;
  account_manager_nome?: string;
  grafico_dedicato_nome?: string;
};

type AirtableResponse = {
  records: AirtableRecord<AirtableWowproClient>[];
  offset?: string;
};

function getAirtableConfig() {
  const token = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_CLIENTS_TABLE || 'Clienti';
  if (!token || !baseId) throw new Error('Configurazione Airtable incompleta.');
  return {token, baseId, table};
}

export async function listWowproClients() {
  const {token, baseId, table} = getAirtableConfig();
  const records: AirtableRecord<AirtableWowproClient>[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url, {
      headers: {Authorization: `Bearer ${token}`},
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Airtable ha risposto con stato ${response.status}.`);

    const payload = await response.json() as AirtableResponse;
    records.push(...payload.records);
    offset = payload.offset;
  } while (offset);

  return records;
}

export async function getWowproClient(recordId: string) {
  const {token, baseId, table} = getAirtableConfig();
  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`,
    {headers: {Authorization: `Bearer ${token}`}, cache: 'no-store', signal: AbortSignal.timeout(10_000)},
  );
  if (!response.ok) throw new Error(`Airtable ha risposto con stato ${response.status}.`);
  return await response.json() as AirtableRecord<AirtableWowproClient>;
}

export async function updateWowproClient(recordId: string, fields: Partial<AirtableWowproClient>) {
  const {token, baseId, table} = getAirtableConfig();
  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}/${recordId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({fields}),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`Airtable ha risposto con stato ${response.status}.`);
  return await response.json() as AirtableRecord<AirtableWowproClient>;
}

export async function listAuthorizedWowproClients() {
  const records = await listWowproClients();
  return records.filter(({fields}) => fields.stato_abbonamento?.toLowerCase() === 'attivo');
}
