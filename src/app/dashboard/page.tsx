import {ArrowUpRight, Clock3, CreditCard, FilePlus2, MessageSquareText, PackageCheck, Sparkles} from 'lucide-react';
import {PageHeader} from '@/components/app-shell';

const activity = [
  ['Modifica volantino A5', 'Oggi, 09:41 · In lavorazione', '−2.000', 'amber'],
  ['Revisione biglietti da visita', '3 giu, 16:20 · Completata', '−1.000', 'green'],
  ['Acquisto crediti extra', '2 giu, 11:05 · Pacchetto 4.000', '+4.000', 'violet'],
  ['Ordine spedito · #WS-4821', '2 giu, 08:30 · Tracking BRT', '€189,00', 'blue'],
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="WOWPRO · Studio Lombardi Srl"
        title="Dashboard"
        action={<div className="credit-chip"><i /> <strong>11.200</strong> crediti disponibili</div>}
      />
      <main className="page-content">
        <section className="metric-grid">
          <Metric icon={<CreditCard />} label="Crediti inclusi rimanenti" value="7.200" note="su 12.000 · reset il 1° luglio" />
          <Metric icon={<Sparkles />} label="Crediti extra" value="4.000" note="Non scadono" tone="violet" />
          <Metric icon={<MessageSquareText />} label="Richieste aperte" value="2" note="1 in lavorazione · 1 nuova" tone="blue" />
          <Metric icon={<PackageCheck />} label="Ultimo ordine" value="#WS-4821" note="Spedito · 2 giu" tone="amber" />
        </section>

        <section className="progress-card">
          <div><h2>Plafond crediti mensile</h2><p>12.000 crediti inclusi nel piano, utilizzati prima dei crediti extra.</p></div>
          <strong>7.200 <small>disponibili</small></strong>
          <div className="progress-track"><span style={{width: '60%'}} /></div>
          <div className="progress-meta"><span>Consumati questo mese: <b>4.800</b></span><span>60% disponibile</span></div>
        </section>

        <section>
          <div className="section-title"><div><span className="eyebrow">ACCESSI RAPIDI</span><h2>Cosa vuoi fare?</h2></div></div>
          <div className="quick-grid">
            <Quick icon={<FilePlus2 />} title="Nuova richiesta" text="Revisione, modifica o creazione grafica" />
            <Quick icon={<Sparkles />} title="Acquista crediti" text="Aggiungi crediti extra al tuo account" />
            <Quick icon={<PackageCheck />} title="I tuoi ordini" text="Stato produzione e tracking spedizioni" />
          </div>
        </section>

        <section>
          <div className="section-title"><h2>Attività recente</h2><button className="text-button">Vedi tutto <ArrowUpRight size={15} /></button></div>
          <div className="activity-card">
            {activity.map(([title, note, amount, tone]) => (
              <div className="activity-row" key={title}>
                <span className={`activity-icon activity-icon--${tone}`}><Clock3 size={17} /></span>
                <span><strong>{title}</strong><small>{note}</small></span>
                <b className={amount.startsWith('+') ? 'positive' : amount.startsWith('−') ? 'negative' : ''}>{amount}</b>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function Metric({icon, label, value, note, tone = 'green'}: {icon: React.ReactNode; label: string; value: string; note: string; tone?: string}) {
  return <article className="metric-card"><span className={`metric-icon metric-icon--${tone}`}>{icon}</span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

function Quick({icon, title, text}: {icon: React.ReactNode; title: string; text: string}) {
  return <article className="quick-card"><span>{icon}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={18} /></article>;
}
