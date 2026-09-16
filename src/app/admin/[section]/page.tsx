import {PageHeader} from '@/components/app-shell';

const titles: Record<string, string> = {
  clienti: 'Clienti',
  richieste: 'Richieste',
  crediti: 'Crediti',
  feedback: 'Feedback & idee',
};

export default async function AdminSectionPage({params}: {params: Promise<{section: string}>}) {
  const {section} = await params;
  const title = titles[section] || 'Back-office';

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
