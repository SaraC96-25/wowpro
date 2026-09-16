import {PageHeader} from '@/components/app-shell';

const titles: Record<string, string> = {
  crediti: 'Crediti',
  richieste: 'Richieste grafiche',
  ordini: 'Ordini',
  supporto: 'Supporto',
  feedback: 'Feedback & idee',
};

export default async function ClientSectionPage({params}: {params: Promise<{section: string}>}) {
  const {section} = await params;
  const title = titles[section] || 'WOWPRO';

  return (
    <>
      <PageHeader eyebrow="WOWPRO · Area cliente" title={title} />
      <main className="page-content">
        <section className="empty-card empty-card--section">
          <span className="eyebrow">MODULO IN PREPARAZIONE</span>
          <h2>{title}</h2>
          <p>La struttura protetta è pronta. In questo modulo collegheremo i dati reali di WOWPRO.</p>
        </section>
      </main>
    </>
  );
}
