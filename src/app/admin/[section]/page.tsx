import {PageHeader} from '@/components/app-shell';
import {listWowproClients, type AirtableWowproClient} from '@/lib/integrations/airtable';

const titles: Record<string, string> = {
  clienti: 'Clienti',
  richieste: 'Richieste',
  crediti: 'Crediti',
  feedback: 'Feedback & idee',
};

export default async function AdminSectionPage({params}: {params: Promise<{section: string}>}) {
  const {section} = await params;
  const title = titles[section] || 'Back-office';

  if (section === 'clienti') return <ClientsPage />;

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

async function ClientsPage() {
  try {
    const records = await listWowproClients();
    return (
      <>
        <PageHeader eyebrow="WowStampa · Programma WOWPRO" title="Clienti" />
        <main className="page-content">
          <section className="section-title">
            <div><span className="eyebrow">ANAGRAFICA AIRTABLE</span><h2>{records.length} clienti collegati</h2></div>
            <span className="sync-note">Dati aggiornati in tempo reale</span>
          </section>
          <section className="client-list" aria-label="Elenco clienti WOWPRO">
            {records.map(({id, fields}) => <ClientRow client={fields} key={id} />)}
          </section>
        </main>
      </>
    );
  } catch {
    return (
      <>
        <PageHeader eyebrow="WowStampa · Programma WOWPRO" title="Clienti" />
        <main className="page-content">
          <section className="empty-card empty-card--section">
            <span className="eyebrow">COLLEGAMENTO NON DISPONIBILE</span>
            <h2>Impossibile caricare i clienti</h2>
            <p>Verifica le credenziali Airtable configurate nel servizio e riprova.</p>
          </section>
        </main>
      </>
    );
  }
}

function ClientRow({client}: {client: AirtableWowproClient}) {
  const includedCredits = Number(client.crediti_inclusi_residui || 0);
  const extraCredits = Number(client.crediti_extra_residui || 0);
  const creditBalance = includedCredits + extraCredits;

  return (
    <article className="client-row">
      <div><span className="client-row__id">{client.cliente_id || 'SENZA ID'}</span><h3>{client.ragione_sociale || 'Azienda senza nome'}</h3><p>{client.email_login || 'Email non disponibile'}</p></div>
      <div><span className="client-row__label">Piano</span><strong>{client.piano || 'Non assegnato'}</strong><small>{client.stato_abbonamento || 'Stato non disponibile'}</small></div>
      <div><span className="client-row__label">Crediti disponibili</span><strong>{formatNumber(creditBalance)}</strong><small>{formatNumber(includedCredits)} inclusi · {formatNumber(extraCredits)} extra</small></div>
      <div><span className="client-row__label">Rinnovo</span><strong>{formatDate(client.data_rinnovo_piano)}</strong><small>{client.shopify_customer_id ? 'Shopify collegato' : 'Shopify non collegato'}</small></div>
    </article>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('it-IT').format(value);
}

function formatDate(value?: string) {
  if (!value) return 'Non impostato';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('it-IT', {day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(date);
}
