import {CreditCard} from 'lucide-react';

import {PageHeader} from '@/components/app-shell';
import {requireProfile} from '@/lib/auth';
import {getWowproClient} from '@/lib/integrations/airtable';
import {createClient} from '@/lib/supabase/server';

const titles: Record<string, string> = {crediti: 'Crediti', richieste: 'Richieste grafiche', ordini: 'Ordini', supporto: 'Supporto', feedback: 'Feedback & idee'};

export default async function ClientSectionPage({params}: {params: Promise<{section: string}>}) {
  const {section} = await params;
  if (section === 'crediti') return <CreditsPage />;
  if (section === 'richieste') return <RequestsPage />;
  const title = titles[section] || 'WOWPRO';
  return <><PageHeader eyebrow="WOWPRO · Area cliente" title={title} /><main className="page-content"><section className="empty-card empty-card--section"><span className="eyebrow">IN PREPARAZIONE</span><h2>{title}</h2><p>Questo spazio verrà collegato ai dati del tuo account.</p></section></main></>;
}

async function CreditsPage() {
  const profile = await requireProfile(['client']);
  const supabase = await createClient();
  const [{data: company}, {data: transactions}] = await Promise.all([supabase.from('companies').select('airtable_record_id').eq('id', profile.company_id || '').maybeSingle(), supabase.from('credit_transactions').select('id,bucket,amount,description,created_at').order('created_at', {ascending: false})]);
  let included = 0; let extra = 0;
  if (company?.airtable_record_id) { try { const record = await getWowproClient(company.airtable_record_id); included = Number(record.fields.crediti_inclusi_residui || 0); extra = Number(record.fields.crediti_extra_residui || 0); } catch { /* Balances are temporarily unavailable. */ } }
  return <><PageHeader eyebrow="WOWPRO · Area cliente" title="Crediti" action={<div className="credit-chip"><i /> <strong>{number(included + extra)}</strong> crediti disponibili</div>} /><main className="page-content"><section className="metric-grid"><Metric label="Inclusi disponibili" note="saldo del piano" value={number(included)} /><Metric label="Extra disponibili" note="non scadono" tone="violet" value={number(extra)} /><Metric label="Movimenti" note="registrati nel portale" tone="blue" value={String(transactions?.length || 0)} /></section><section><div className="section-title"><div><span className="eyebrow">STORICO</span><h2>Movimenti crediti</h2></div></div><div className="activity-card">{(transactions || []).map((transaction) => <div className="activity-row" key={transaction.id}><span className={'activity-icon ' + (transaction.bucket === 'extra' ? 'activity-icon--violet' : '')}><CreditCard size={17} /></span><span><strong>{transaction.description}</strong><small>{transaction.bucket === 'extra' ? 'Crediti extra' : 'Crediti inclusi'} · {date(transaction.created_at)}</small></span><b className="positive">+{number(transaction.amount)}</b></div>)}{!transactions?.length ? <Empty icon={<CreditCard size={20} />} title="Nessun movimento" text="Gli accrediti registrati dal team compariranno qui." /> : null}</div></section></main></>;
}

async function RequestsPage() {
  await requireProfile(['client']);
  const supabase = await createClient();
  const {data: requests} = await supabase.from('graphic_requests').select('id,public_id,title,brief,status,created_at').order('created_at', {ascending: false});
  const requestIds = (requests || []).map((request) => request.id);
  const messagesByRequest = new Map<string, Array<{id: string; body: string; created_at: string}>>();
  if (requestIds.length) {
    // The message log is optional until the graphic-workspace migration is applied.
    const {data: messages, error} = await supabase.from('request_messages').select('id,request_id,body,created_at').in('request_id', requestIds).order('created_at', {ascending: true});
    if (!error) for (const message of messages || []) messagesByRequest.set(message.request_id, [...(messagesByRequest.get(message.request_id) || []), message]);
  }
  return <><PageHeader eyebrow="WOWPRO · Area cliente" title="Richieste grafiche" /><main className="page-content"><section className="client-request-list">{(requests || []).map((request) => { const messages = messagesByRequest.get(request.id) || []; return <article className="client-request-card" key={request.id}><div><span className="admin-row__id">{request.public_id}</span><h2>{request.title}</h2><p>{request.brief}</p><span className={'feedback-status feedback-status--' + statusClass(request.status)}>{status(request.status)}</span></div><aside><span className="eyebrow">MESSAGGI DAL TEAM</span>{messages.length ? messages.map((message) => <div className="message-bubble" key={message.id}><small>{date(message.created_at)}</small><p>{message.body}</p></div>) : <p>Nessun messaggio dal team.</p>}</aside></article>; })}{!requests?.length ? <section className="empty-card empty-card--section"><span className="eyebrow">NESSUNA RICHIESTA</span><h2>Non hai richieste attive</h2><p>Le richieste gestite dal team compariranno qui.</p></section> : null}</section></main></>;
}

function Metric({label, note, tone = 'green', value}: {label: string; note: string; tone?: string; value: string}) { return <article className="metric-card"><span className={'metric-icon metric-icon--' + tone}><CreditCard /></span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>; }
function Empty({icon, text, title}: {icon: React.ReactNode; text: string; title: string}) { return <div className="activity-empty">{icon}<strong>{title}</strong><span>{text}</span></div>; }
function number(value: number) { return new Intl.NumberFormat('it-IT').format(value); }
function date(value: string) { return new Intl.DateTimeFormat('it-IT', {day: '2-digit', month: 'short', year: 'numeric'}).format(new Date(value)); }
function status(value: string) { return ({new: 'Nuova', in_progress: 'In lavorazione', completed: 'Completata', rejected: 'Rifiutata'} as Record<string, string>)[value] || 'Aggiornata'; }
function statusClass(value: string) { return value === 'in_progress' ? 'evaluating' : value === 'completed' ? 'completed' : value === 'rejected' ? 'rejected' : 'new'; }
