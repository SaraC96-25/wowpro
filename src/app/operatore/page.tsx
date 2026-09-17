import Link from 'next/link';
import {ArrowUpRight, CheckCircle2, Clock3, ListTodo, PlayCircle} from 'lucide-react';

import {PageHeader} from '@/components/app-shell';
import {requireProfile} from '@/lib/auth';
import {createAdminClient} from '@/lib/supabase/admin.server';

export default async function GraphicOperatorOverview() {
  const profile = await requireProfile(['graphic_operator']);
  const {data, error} = await createAdminClient()
    .from('graphic_requests')
    .select('id,public_id,title,status,due_date,priority,created_at,companies(name)')
    .eq('assigned_to', profile.id)
    .order('due_date', {ascending: true, nullsFirst: false});
  const requests = error ? [] : data || [];
  const pending = requests.filter((request) => request.status === 'new' || request.status === 'in_progress');
  const completed = requests.filter((request) => request.status === 'completed').slice(0, 5);

  return <><PageHeader eyebrow="WowStampa · Operatore grafico" title="Panoramica" /><main className="page-content">
    <section className="metric-grid">
      <Metric icon={<ListTodo />} label="Assegnate a te" note="tutte le richieste" value={String(requests.length)} />
      <Metric icon={<Clock3 />} label="Da iniziare" note="in attesa di lavorazione" tone="blue" value={String(requests.filter((request) => request.status === 'new').length)} />
      <Metric icon={<PlayCircle />} label="In lavorazione" note="lavori attivi" tone="amber" value={String(requests.filter((request) => request.status === 'in_progress').length)} />
      <Metric icon={<CheckCircle2 />} label="Completate" note="storico personale" tone="green" value={String(requests.filter((request) => request.status === 'completed').length)} />
    </section>
    <section><div className="section-title"><div><span className="eyebrow">IL TUO LAVORO</span><h2>Richieste da lavorare</h2></div><Link className="button button--ghost" href="/operatore/richieste">Tutte le tue richieste <ArrowUpRight size={15} /></Link></div><div className="graphic-work-list">{pending.slice(0, 5).map((request) => <article className="graphic-work-card" key={request.id}><span className={`feedback-status feedback-status--${request.status === 'new' ? 'new' : 'evaluating'}`}>{request.status === 'new' ? 'Da iniziare' : 'In lavorazione'}</span><div><span className="admin-row__id">{request.public_id}</span><h3>{request.title}</h3><p>{companyName(request.companies)} · {request.due_date ? `Scadenza ${formatDate(request.due_date)}` : 'Nessuna scadenza impostata'}</p></div><span className={`priority-chip priority-chip--${request.priority}`}>{priorityLabel(request.priority)}</span></article>)}{!pending.length ? <p className="client-list__empty">Non hai richieste da lavorare.</p> : null}</div></section>
    {completed.length ? <section><div className="section-title"><div><span className="eyebrow">STORICO PERSONALE</span><h2>Completate di recente</h2></div></div><div className="activity-card">{completed.map((request) => <div className="activity-row" key={request.id}><span className="activity-icon"><CheckCircle2 size={17} /></span><span><strong>{request.title}</strong><small>{request.public_id} · {companyName(request.companies)} · consegnata il {formatDate(request.created_at)}</small></span><b className="positive">Completata</b></div>)}</div></section> : null}
  </main></>;
}

function Metric({icon, label, note, tone = 'green', value}: {icon: React.ReactNode; label: string; note: string; tone?: string; value: string}) { return <article className="metric-card"><span className={`metric-icon metric-icon--${tone}`}>{icon}</span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>; }
function companyName(value: unknown) { if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Cliente WOWPRO'; const name = (value as Record<string, unknown>).name; return typeof name === 'string' && name ? name : 'Cliente WOWPRO'; }
function formatDate(value: string) { return new Intl.DateTimeFormat('it-IT', {day: '2-digit', month: 'short', year: 'numeric'}).format(new Date(value)); }
function priorityLabel(value: string) { return ({high: 'Priorità alta', medium: 'Priorità media', low: 'Priorità bassa'} as Record<string, string>)[value] || 'Priorità media'; }
