import {BadgeEuro, MessageSquareText, TrendingUp, UsersRound} from 'lucide-react';
import {PageHeader} from '@/components/app-shell';

const requests = [
  ['RG-1042', 'Modifica volantino A5', 'Studio Lombardi Srl', 'In lavorazione'],
  ['RG-1041', 'Locandina concerto', 'Studio Lombardi Srl', 'Nuova'],
  ['RG-1050', 'Revisione manifesto 70×100', 'Tipografia Verdi', 'Nuova'],
  ['RG-1048', 'Menu da tavolo', 'Caffè Centrale', 'In lavorazione'],
];

export default function AdminPage() {
  return (
    <>
      <PageHeader eyebrow="WowStampa · Programma WOWPRO" title="Panoramica" />
      <main className="page-content">
        <section className="metric-grid">
          <Metric icon={<UsersRound />} label="Clienti attivi" value="3" note="su 5 clienti totali" />
          <Metric icon={<MessageSquareText />} label="Richieste aperte" value="4" note="2 in lavorazione" tone="amber" />
          <Metric icon={<BadgeEuro />} label="Crediti erogati" value="9.000" note="nel mese corrente" tone="violet" />
          <Metric icon={<TrendingUp />} label="MRR ricorrente" value="€891" note="3 abbonati × €297" tone="blue" />
        </section>

        <section>
          <div className="section-title"><div><span className="eyebrow">OPERATIVITÀ</span><h2>Richieste da gestire</h2></div><button className="button button--ghost">Tutte le richieste</button></div>
          <div className="admin-list">
            {requests.map(([id, title, company, status]) => (
              <article className="admin-row" key={id}>
                <span className="admin-row__id">{id}</span>
                <div><h3>{title}</h3><p>{company} · 04 giu 2026</p></div>
                <span className={status === 'Nuova' ? 'status status--blue' : 'status status--amber'}>{status}</span>
                <select aria-label={`Aggiorna stato ${id}`} defaultValue={status}>
                  <option>Nuova</option><option>In lavorazione</option><option>Completata</option><option>Rifiutata</option>
                </select>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="section-title"><div><span className="eyebrow">COMMUNITY</span><h2>Idee più richieste</h2></div></div>
          <div className="idea-grid">
            <article><strong>64</strong><div><small>SITO WEB · IN VALUTAZIONE</small><h3>Anteprima 3D del prodotto prima di ordinare</h3><p>Proposta da Martina R.</p></div></article>
            <article><strong>58</strong><div><small>NUOVO PRODOTTO · IN IMPLEMENTAZIONE</small><h3>Packaging e scatole personalizzate</h3><p>Proposta da Studio Vianello</p></div></article>
          </div>
        </section>
      </main>
    </>
  );
}

function Metric({icon, label, value, note, tone = 'green'}: {icon: React.ReactNode; label: string; value: string; note: string; tone?: string}) {
  return <article className="metric-card"><span className={`metric-icon metric-icon--${tone}`}>{icon}</span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}
