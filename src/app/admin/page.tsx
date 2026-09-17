import Link from 'next/link';
import {ArrowUpRight, BadgeEuro, Clock3, Coins, MessageSquareText, Plus, UsersRound} from 'lucide-react';

import {PageHeader} from '@/components/app-shell';
import {listWowproClients} from '@/lib/integrations/airtable';
import {createAdminClient} from '@/lib/supabase/admin.server';

type Activity = {id: string; title: string; note: string; value: string; tone: 'green' | 'violet' | 'blue' | 'amber'; href: string; createdAt: string};

export default async function AdminPage() {
  const admin = createAdminClient();
  const [clientsResult, requestsResult, creditsResult] = await Promise.allSettled([
    listWowproClients(),
    admin.from('graphic_requests').select('id,public_id,title,status,created_at,companies(name)').order('created_at', {ascending: false}),
    admin.from('credit_transactions').select('id,amount,description,created_at,companies(name)').order('created_at', {ascending: false}),
  ]);
  const clients = clientsResult.status === 'fulfilled' ? clientsResult.value : [];
  const requestRows = requestsResult.status === 'fulfilled' && !requestsResult.value.error ? requestsResult.value.data || [] : [];
  const creditRows = creditsResult.status === 'fulfilled' && !creditsResult.value.error ? creditsResult.value.data || [] : [];
  const activeClients = clients.filter(({fields}) => !fields.archiviato && fields.stato_abbonamento?.toLocaleLowerCase('it-IT') === 'attivo').length;
  const openRequests = requestRows.filter((request) => request.status === 'new' || request.status === 'in_progress');
  const inProgressRequests = requestRows.filter((request) => request.status === 'in_progress');
  const currentMonthCredits = creditRows.filter((transaction) => isCurrentMonth(transaction.created_at)).reduce((total, transaction) => total + transaction.amount, 0);
  const activities = [...requestRows.map(toRequestActivity), ...creditRows.map(toCreditActivity)].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)).slice(0, 6);
  const hasDataError = clientsResult.status === 'rejected' || requestsResult.status === 'rejected' || creditsResult.status === 'rejected' || (requestsResult.status === 'fulfilled' && Boolean(requestsResult.value.error)) || (creditsResult.status === 'fulfilled' && Boolean(creditsResult.value.error));

  return <>
    <PageHeader eyebrow="WowStampa · Programma WOWPRO" title="Panoramica" />
    <main className="page-content">
      {hasDataError ? <p className="overview-notice">Alcuni dati non sono momentaneamente disponibili. I moduli operativi restano accessibili.</p> : null}
      <section className="metric-grid">
        <Metric icon={<UsersRound />} label="Clienti attivi" note={`su ${clients.filter(({fields}) => !fields.archiviato).length} in gestione`} value={String(activeClients)} />
        <Metric icon={<MessageSquareText />} label="Richieste aperte" note={`${inProgressRequests.length} in lavorazione`} tone="amber" value={String(openRequests.length)} />
        <Metric icon={<BadgeEuro />} label="Crediti accreditati" note="nel mese corrente" tone="violet" value={formatNumber(currentMonthCredits)} />
        <Metric icon={<Coins />} label="Movimenti crediti" note="registrati nel mese" tone="blue" value={String(creditRows.filter((transaction) => isCurrentMonth(transaction.created_at)).length)} />
      </section>

      <section>
        <div className="section-title"><div><span className="eyebrow">ATTIVITÀ RECENTE</span><h2>Cosa sta succedendo</h2></div><Link className="button button--ghost" href="/admin/richieste">Tutte le richieste <ArrowUpRight size={15} /></Link></div>
        <div className="activity-card">
          {activities.map((activity) => <Link className="activity-row activity-row--link" href={activity.href} key={activity.id}><span className={`activity-icon activity-icon--${activity.tone}`}><Clock3 size={17} /></span><span><strong>{activity.title}</strong><small>{activity.note}</small></span><b className={activity.value.startsWith('+') ? 'positive' : ''}>{activity.value}</b></Link>)}
          {!activities.length ? <div className="activity-empty"><Clock3 size={20} /><strong>Nessuna attività registrata</strong><span>Nuove richieste e accrediti compariranno qui.</span></div> : null}
        </div>
      </section>

      <section>
        <div className="section-title"><div><span className="eyebrow">ACCESSI RAPIDI</span><h2>Gestione operativa</h2></div></div>
        <div className="quick-grid">
          <Link className="quick-card" href="/admin/richieste"><span><Plus size={19} /></span><div><h3>Nuova richiesta</h3><p>Inserisci e assegna un nuovo lavoro grafico.</p></div><ArrowUpRight size={18} /></Link>
          <Link className="quick-card" href="/admin/clienti"><span><UsersRound size={19} /></span><div><h3>Gestisci clienti</h3><p>Modifica anagrafica, piani e crediti.</p></div><ArrowUpRight size={18} /></Link>
          <Link className="quick-card" href="/admin/crediti"><span><Coins size={19} /></span><div><h3>Registro crediti</h3><p>Consulta gli accrediti e i movimenti.</p></div><ArrowUpRight size={18} /></Link>
        </div>
      </section>
    </main>
  </>;
}

function Metric({icon, label, note, tone = 'green', value}: {icon: React.ReactNode; label: string; note: string; tone?: string; value: string}) {
  return <article className="metric-card"><span className={`metric-icon metric-icon--${tone}`}>{icon}</span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

function toRequestActivity(request: {id: string; public_id: string; title: string; status: string; created_at: string; companies: unknown}): Activity {
  return {id: `request-${request.id}`, title: request.title, note: `${companyName(request.companies)} · ${requestStatusLabel(request.status)}`, value: request.public_id, tone: request.status === 'in_progress' ? 'amber' : 'blue', href: '/admin/richieste', createdAt: request.created_at};
}

function toCreditActivity(transaction: {id: string; amount: number; description: string; created_at: string; companies: unknown}): Activity {
  return {id: `credit-${transaction.id}`, title: 'Accredito crediti', note: `${companyName(transaction.companies)} · ${transaction.description}`, value: `+${formatNumber(transaction.amount)}`, tone: 'violet', href: '/admin/crediti', createdAt: transaction.created_at};
}

function companyName(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Cliente WOWPRO';
  const name = (value as Record<string, unknown>).name;
  return typeof name === 'string' && name.trim() ? name : 'Cliente WOWPRO';
}

function requestStatusLabel(status: string) { return ({new: 'Nuova', in_progress: 'In lavorazione', completed: 'Completata', rejected: 'Rifiutata'} as Record<string, string>)[status] || 'Aggiornata'; }
function isCurrentMonth(value: string) { const date = new Date(value); const today = new Date(); return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear(); }
function formatNumber(value: number) { return new Intl.NumberFormat('it-IT').format(value); }
