import {PageHeader} from '@/components/app-shell';
import {listWowproClients, type AirtableWowproClient} from '@/lib/integrations/airtable';
import {AdminClientDirectory, type AdminClient} from '@/components/admin-client-directory';
import {AdminCreditLedger, type CreditLedgerEntry} from '@/components/admin-credit-ledger';
import {AdminRequestBoard, type AdminGraphicRequest} from '@/components/admin-request-board';
import {createAdminClient} from '@/lib/supabase/admin.server';

const titles: Record<string, string> = {
  clienti: 'Clienti',
  'archivio-clienti': 'Archivio clienti',
  richieste: 'Richieste',
  crediti: 'Crediti',
  feedback: 'Feedback & idee',
};

export default async function AdminSectionPage({params}: {params: Promise<{section: string}>}) {
  const {section} = await params;
  const title = titles[section] || 'Back-office';

  if (section === 'clienti') return <ClientsPage archived={false} />;
  if (section === 'archivio-clienti') return <ClientsPage archived />;
  if (section === 'crediti') return <CreditsPage />;
  if (section === 'richieste') return <RequestsPage />;

  return (
    <>
      <PageHeader eyebrow="WowStampa · Programma WOWPRO" title={title} />
      <main className="page-content">
        <section className="empty-card empty-card--section">
          <span className="eyebrow">MODULO IN PREPARAZIONE</span>
          <h2>{title}</h2>
          <p>La struttura amministrativa è pronta per il collegamento ai dati operativi.</p>
        </section>
      </main>
    </>
  );
}

async function RequestsPage() {
  let requests: AdminGraphicRequest[] = [];
  let clients: {recordId: string; companyName: string}[] = [];
  let hasLoadError = false;
  try {
    const admin = createAdminClient();
    const [{data, error}, airtableClients] = await Promise.all([
      admin
      .from('graphic_requests')
      .select('id,public_id,title,brief,type,status,credit_cost,created_at,companies(name),requester:requested_by(full_name,email)')
      .order('created_at', {ascending: false}),
      listWowproClients(),
    ]);
    if (error) throw error;
    clients = airtableClients
      .filter(({fields}) => !fields.archiviato)
      .map(({id, fields}) => ({recordId: id, companyName: fields.ragione_sociale || fields.cliente_id || 'Cliente WOWPRO'}));
    requests = (data || []).map((graphicRequest) => {
      const company = asRecord(graphicRequest.companies);
      const requester = asRecord(graphicRequest.requester);
      return {
        id: graphicRequest.id,
        publicId: graphicRequest.public_id,
        companyName: stringValue(company.name, 'Cliente WOWPRO'),
        requesterName: stringValue(requester.full_name, stringValue(requester.email, 'Utente cliente')),
        title: graphicRequest.title,
        brief: graphicRequest.brief,
        type: graphicRequest.type,
        status: graphicRequest.status,
        creditCost: graphicRequest.credit_cost,
        createdAt: graphicRequest.created_at,
      };
    });
  } catch (error) {
    console.error('[Request board]', error);
    hasLoadError = true;
  }

  return <>
    <PageHeader eyebrow="WowStampa · Programma WOWPRO" title="Richieste" />
    <main className="page-content">
      {hasLoadError ? <section className="empty-card empty-card--section"><span className="eyebrow">REGISTRO NON DISPONIBILE</span><h2>Impossibile caricare le richieste</h2><p>Verifica la configurazione Supabase del servizio e riprova.</p></section> : <AdminRequestBoard clients={clients} initialRequests={requests} />}
    </main>
  </>;
}

async function CreditsPage() {
  let entries: CreditLedgerEntry[] = [];
  let hasLoadError = false;
  try {
    const admin = createAdminClient();
    const {data, error} = await admin
      .from('credit_transactions')
      .select('id,bucket,amount,description,created_at,companies(name),profiles:created_by(full_name,email)')
      .order('created_at', {ascending: false});
    if (error) throw error;
    entries = (data || []).map((transaction) => {
      const company = asRecord(transaction.companies);
      const operator = asRecord(transaction.profiles);
      return {
        id: transaction.id,
        bucket: transaction.bucket,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.created_at,
        companyName: stringValue(company.name, 'Cliente WOWPRO'),
        createdBy: stringValue(operator.full_name, stringValue(operator.email, 'Operatore WOWPRO')),
      };
    });
  } catch (error) {
    console.error('[Credit ledger]', error);
    hasLoadError = true;
  }

  return <>
    <PageHeader eyebrow="WowStampa · Programma WOWPRO" title="Crediti" />
    <main className="page-content">
      {hasLoadError ? <section className="empty-card empty-card--section"><span className="eyebrow">REGISTRO NON DISPONIBILE</span><h2>Impossibile caricare i movimenti</h2><p>Verifica la configurazione Supabase del servizio e riprova.</p></section> : <AdminCreditLedger entries={entries} />}
    </main>
  </>;
}

async function ClientsPage({archived}: {archived: boolean}) {
  let clients: AdminClient[] = [];
  let hasLoadError = false;
  try {
    const records = await listWowproClients();
    clients = records.map(({id, fields}) => toAdminClient(id, fields));
  } catch {
    hasLoadError = true;
  }

  return (
    <>
      <PageHeader eyebrow="WowStampa · Programma WOWPRO" title={archived ? 'Archivio clienti' : 'Clienti'} />
      <main className="page-content">
        {hasLoadError ? <section className="empty-card empty-card--section">
          <span className="eyebrow">COLLEGAMENTO NON DISPONIBILE</span>
          <h2>Impossibile caricare i clienti</h2>
          <p>Verifica le credenziali Airtable configurate nel servizio e riprova.</p>
        </section> : <AdminClientDirectory archived={archived} initialClients={clients} />}
      </main>
    </>
  );
}

function toAdminClient(recordId: string, fields: AirtableWowproClient): AdminClient {
  return {
    recordId,
    clientId: fields.cliente_id || 'SENZA ID',
    companyName: fields.ragione_sociale || 'Azienda senza nome',
    email: fields.email_login || 'Email non disponibile',
    plan: fields.piano || '',
    subscriptionStatus: fields.stato_abbonamento || '',
    accountManager: fields.account_manager_nome || '',
    shopifyCustomerId: fields.shopify_customer_id || '',
    includedCredits: Number(fields.crediti_inclusi_residui || 0),
    extraCredits: Number(fields.crediti_extra_residui || 0),
    renewalDate: fields.data_rinnovo_piano || '',
    isArchived: Boolean(fields.archiviato),
  };
}

function asRecord(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function stringValue(value: unknown, fallback: string) { return typeof value === 'string' && value.trim() ? value : fallback; }
