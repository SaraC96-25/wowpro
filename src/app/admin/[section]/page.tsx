import {PageHeader} from '@/components/app-shell';
import {listWowproClients, type AirtableWowproClient} from '@/lib/integrations/airtable';
import {AdminClientDirectory, type AdminClient} from '@/components/admin-client-directory';

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
