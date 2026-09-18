import Link from 'next/link';
import {ArrowUpRight, BadgeEuro, Euro, MessageSquareText, UsersRound} from 'lucide-react';

import {PageHeader} from '@/components/app-shell';
import {requireProfile} from '@/lib/auth';
import {listWowproClients, type AirtableWowproClient} from '@/lib/integrations/airtable';
import {createAdminClient} from '@/lib/supabase/admin.server';

type TeamMember = {id: string; name: string; role: string};
type DataRow = Record<string, unknown>;

export default async function AdminPage() {
  const profile = await requireProfile(['staff', 'admin']);
  const admin = createAdminClient();
  const [clientsResult, requestsResult, creditsResult, teamResult, subscriptionsResult] = await Promise.allSettled([
    listWowproClients(),
    admin.from('graphic_requests').select('id,public_id,title,status,created_at,completed_at,assigned_to,due_date,companies(name)').order('created_at', {ascending: false}),
    admin.from('credit_transactions').select('id,amount,created_at').order('created_at', {ascending: false}),
    admin.from('profiles').select('id,full_name,email,role').eq('status', 'active').order('full_name'),
    admin.from('subscriptions').select('status,plans(monthly_price_cents)').eq('status', 'active'),
  ]);
  const clients = clientsResult.status === 'fulfilled' ? clientsResult.value : [];
  const requests = rowsFrom(requestsResult);
  const credits = rowsFrom(creditsResult);
  const members = rowsFrom(teamResult).filter((member) => ['admin', 'staff', 'graphic_operator'].includes(String(member.role))).map((member) => ({id: String(member.id), name: String(member.full_name || member.email), role: String(member.role)} as TeamMember));
  const subscriptions = rowsFrom(subscriptionsResult);
  const activeClients = clients.filter(({fields}) => !fields.archiviato && fields.stato_abbonamento?.toLocaleLowerCase('it-IT') === 'attivo').length;
  const openRequests = requests.filter((request) => request.status === 'new' || request.status === 'in_progress');
  const inProgress = requests.filter((request) => request.status === 'in_progress').length;
  const loadedCredits = credits.filter((credit) => isCurrentMonth(String(credit.created_at))).reduce((total, credit) => total + Number(credit.amount || 0), 0);
  const mrr = subscriptions.reduce((total, subscription) => total + planPrice(subscription.plans), 0);

  if (profile.role === 'admin') {
    return <AdministrationDashboard activeClients={activeClients} clients={clients} credits={loadedCredits} inProgress={inProgress} members={members} mrr={mrr} openRequests={openRequests} requests={requests} />;
  }
  return <CommercialDashboard activeClients={activeClients} credits={loadedCredits} inProgress={inProgress} openRequests={openRequests.length} />;
}

function AdministrationDashboard({activeClients, clients, credits, inProgress, members, mrr, openRequests, requests}: {activeClients: number; clients: Array<{fields: AirtableWowproClient}>; credits: number; inProgress: number; members: TeamMember[]; mrr: number; openRequests: DataRow[]; requests: DataRow[]}) {
  const graphics = members.filter((member) => member.role === 'graphic_operator');
  const commercials = members.filter((member) => member.role === 'staff');
  const completedRecently = requests.filter((request) => request.status === 'completed' && isRecent(String(request.completed_at || request.created_at))).length;
  const overdue = requests.find(isOverdue);
  return <><PageHeader eyebrow="WowStampa · Programma WOWPRO" title="Panoramica" /><main className="page-content administration-page">
    <section className="admin-welcome"><div><h2>{greeting()} <span aria-hidden="true">👋</span></h2><p>{completedRecently ? 'Il team ha completato ' + completedRecently + ' richieste di recente.' : 'Tieni sotto controllo il lavoro del team e le prossime assegnazioni.'}</p><div className="admin-welcome__chips"><span>🎉 {completedRecently} richieste completate di recente</span>{overdue ? <Link className="admin-welcome__alert" href="/admin/richieste">⏰ In ritardo: {String(overdue.title)} · {formatDate(String(overdue.due_date))}</Link> : null}</div></div><small>{formatTime(new Date())} · Aggiornato ora</small></section>
    <section className="metric-grid administration-kpis">
      <Metric icon={<UsersRound />} label="Clienti attivi" note={'su ' + clients.filter(({fields}) => !fields.archiviato).length + ' totali'} value={String(activeClients)} />
      <Metric icon={<MessageSquareText />} label="Richieste aperte" note={inProgress + ' in lavorazione'} tone="amber" value={String(openRequests.length)} />
      <Metric icon={<BadgeEuro />} label="Crediti caricati nel mese" note="su lavorazioni grafiche" tone="violet" value={formatNumber(credits)} />
      <Metric icon={<Euro />} label="MRR ricorrente" note={mrr ? 'abbonamenti attivi' : 'piani da valorizzare'} tone="blue" value={mrr ? formatCurrency(mrr) : '—'} />
    </section>
    <section><div className="administration-title"><div><h2>Come lavora il team</h2><p>Chi è carico, chi è in difficoltà e a chi assegnare il prossimo lavoro</p></div><span>Situazione attuale</span></div><GraphicTeam members={graphics} requests={requests} /><CommercialTeam clients={clients} members={commercials} openRequests={openRequests.length} /></section>
  </main></>;
}

function GraphicTeam({members, requests}: {members: TeamMember[]; requests: DataRow[]}) {
  const assigned = requests.filter((request) => Boolean(request.assigned_to)).length;
  const working = requests.filter((request) => request.status === 'in_progress' && request.assigned_to).length;
  const delayed = requests.filter(isOverdue).length;
  return <section className="team-panel"><div className="team-panel__title"><h3>Team Grafico</h3><span>{assigned} assegnate · {working} in lavorazione · {delayed} in ritardo</span></div><div className="graphic-team-head"><span>Operatore</span><span>Carico</span><span>In corso</span><span>Completate</span><span>Ritardi</span><span>Disponibilità</span></div>{members.map((member) => <GraphicRow key={member.id} member={member} requests={requests} />)}{!members.length ? <p className="client-list__empty">Nessun operatore grafico attivo. Aggiungilo in Team & ruoli.</p> : null}</section>;
}

function GraphicRow({member, requests}: {member: TeamMember; requests: DataRow[]}) {
  const assigned = requests.filter((request) => request.assigned_to === member.id);
  const load = Math.min(assigned.filter((request) => request.status === 'new' || request.status === 'in_progress').length, 5);
  const working = assigned.filter((request) => request.status === 'in_progress').length;
  const completed = assigned.filter((request) => request.status === 'completed').length;
  const delayed = assigned.filter(isOverdue).length;
  return <article className="graphic-team-row"><OperatorName member={member} /><div><strong>{load} / 5</strong><span className="load-meter"><i className={load >= 4 ? 'load-meter--amber' : ''} style={{width: String(load * 20) + '%'}} /></span></div><strong>{working}</strong><strong>{completed}</strong><span className={delayed ? 'delay-pill' : 'delay-pill delay-pill--none'}>{delayed || '—'}</span><strong className={load >= 4 ? 'availability availability--busy' : 'availability'}>{load >= 4 ? 'Quasi piena' : 'Carico regolare'}</strong></article>;
}

function CommercialTeam({clients, members, openRequests}: {clients: Array<{fields: AirtableWowproClient}>; members: TeamMember[]; openRequests: number}) {
  return <section className="team-panel"><div className="team-panel__title"><h3>Team Commerciale</h3><span>{clients.length} clienti gestiti · {openRequests} richieste aperte</span></div><div className="commercial-team-head"><span>Operatore</span><span>Clienti</span><span>Aperte</span><span>Da seguire</span></div>{members.map((member) => { const clientsCount = clients.filter(({fields}) => fields.account_manager_nome?.trim().toLocaleLowerCase('it-IT') === member.name.trim().toLocaleLowerCase('it-IT')).length; return <article className="commercial-team-row" key={member.id}><OperatorName member={member} /><strong>{clientsCount}</strong><strong>—</strong><span className="delay-pill delay-pill--none">—</span></article>; })}{!members.length ? <p className="client-list__empty">Nessun operatore commerciale attivo.</p> : null}</section>;
}

function OperatorName({member}: {member: TeamMember}) { return <div className="operator-name"><span>{initials(member.name)}</span><div><strong>{member.name}</strong><small>{member.role === 'graphic_operator' ? 'Operatore Grafico' : 'Operatore Commerciale'}</small></div></div>; }

function CommercialDashboard({activeClients, credits, inProgress, openRequests}: {activeClients: number; credits: number; inProgress: number; openRequests: number}) {
  return <><PageHeader eyebrow="WowStampa · Programma WOWPRO" title="Panoramica" /><main className="page-content"><section className="metric-grid"><Metric icon={<UsersRound />} label="Clienti attivi" note="gestione operativa" value={String(activeClients)} /><Metric icon={<MessageSquareText />} label="Richieste aperte" note={inProgress + ' in lavorazione'} tone="amber" value={String(openRequests)} /><Metric icon={<BadgeEuro />} label="Crediti caricati" note="nel mese corrente" tone="violet" value={formatNumber(credits)} /><Metric icon={<ArrowUpRight />} label="Gestione team" note="accesso riservato all’amministrazione" tone="blue" value="—" /></section></main></>;
}

function Metric({icon, label, note, tone = 'green', value}: {icon: React.ReactNode; label: string; note: string; tone?: string; value: string}) { return <article className="metric-card"><span className={'metric-icon metric-icon--' + tone}>{icon}</span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>; }
function rowsFrom(result: unknown): DataRow[] { if (!result || typeof result !== 'object') return []; const settled = result as {status?: string; value?: {data?: DataRow[] | null; error?: unknown}}; const value = settled.value; return settled.status === 'fulfilled' && value && !value.error ? value.data || [] : []; }
function planPrice(value: unknown) { if (!value || typeof value !== 'object' || Array.isArray(value)) return 0; const cents = (value as Record<string, unknown>).monthly_price_cents; return typeof cents === 'number' ? cents : 0; }
function isCurrentMonth(value: string) { const date = new Date(value); const today = new Date(); return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear(); }
function isRecent(value: string) { return Date.now() - Date.parse(value) < 7 * 24 * 60 * 60 * 1000; }
function isOverdue(request: DataRow) { return Boolean(request.due_date) && Date.parse(String(request.due_date)) < Date.now() && !['completed', 'rejected'].includes(String(request.status)); }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'; }
function formatDate(value: string) { return new Intl.DateTimeFormat('it-IT', {day: '2-digit', month: 'short', year: 'numeric'}).format(new Date(value)); }
function formatTime(value: Date) { return new Intl.DateTimeFormat('it-IT', {hour: '2-digit', minute: '2-digit'}).format(value); }
function formatNumber(value: number) { return new Intl.NumberFormat('it-IT').format(value); }
function formatCurrency(value: number) { return new Intl.NumberFormat('it-IT', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0}).format(value / 100); }
function initials(value: string) { return value.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
