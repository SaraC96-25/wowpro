import Link from 'next/link';
import {ArrowUpRight, CreditCard, MessageSquareText, Sparkles} from 'lucide-react';

import {PageHeader} from '@/components/app-shell';
import {requireProfile} from '@/lib/auth';
import {getWowproClient} from '@/lib/integrations/airtable';
import {createClient} from '@/lib/supabase/server';

export default async function DashboardPage() {
  const profile = await requireProfile(['client']);
  const supabase = await createClient();
  const [{data: company}, {data: requests}, {data: transactions}] = await Promise.all([
    supabase.from('companies').select('name,airtable_record_id').eq('id', profile.company_id || '').maybeSingle(),
    supabase.from('graphic_requests').select('id,public_id,title,status,created_at').order('created_at', {ascending: false}).limit(5),
    supabase.from('credit_transactions').select('id,bucket,amount,description,created_at').order('created_at', {ascending: false}).limit(5),
  ]);
  let included = 0; let extra = 0; let monthly = 0;
  if (company?.airtable_record_id) {
    try {
      const airtable = await getWowproClient(company.airtable_record_id);
      included = Number(airtable.fields.crediti_inclusi_residui || 0);
      extra = Number(airtable.fields.crediti_extra_residui || 0);
      monthly = Number(airtable.fields.crediti_inclusi_mese || 0);
    } catch { /* Balances are temporarily unavailable. */ }
  }
  const open = (requests || []).filter((request) => request.status === 'new' || request.status === 'in_progress');
  return <><PageHeader eyebrow={'WOWPRO · ' + (company?.name || 'Area cliente')} title="Dashboard" action={<div className="credit-chip"><i /> <strong>{number(included + extra)}</strong> crediti disponibili</div>} /><main className="page-content">
    <section className="metric-grid"><Metric icon={<CreditCard />} label="Crediti inclusi rimanenti" note={monthly ? 'su ' + number(monthly) + ' mensili' : 'saldo del piano'} value={number(included)} /><Metric icon={<Sparkles />} label="Crediti extra" note="Non scadono" tone="violet" value={number(extra)} /><Metric icon={<MessageSquareText />} label="Richieste aperte" note={open.length ? 'in gestione dal team' : 'nessuna richiesta aperta'} tone="blue" value={String(open.length)} /><Metric icon={<ArrowUpRight />} label="Ultima richiesta" note={requests?.[0] ? date(requests[0].created_at) : 'nessuna attività'} tone="amber" value={requests?.[0]?.public_id || '—'} /></section>
    <section className="progress-card"><div><h2>Plafond crediti mensile</h2><p>I crediti inclusi vengono utilizzati prima dei crediti extra.</p></div><strong>{number(included)} <small>disponibili</small></strong><div className="progress-track"><span style={{width: monthly ? String(Math.min(included / monthly, 1) * 100) + '%' : '0%'}} /></div><div className="progress-meta"><span>Crediti inclusi: <b>{number(included)}</b></span><span>{monthly ? Math.round(included / monthly * 100) + '% disponibile' : 'Piano non configurato'}</span></div></section>
    <section><div className="section-title"><div><span className="eyebrow">LE TUE RICHIESTE</span><h2>Attività recente</h2></div><Link className="button button--ghost" href="/dashboard/richieste">Vedi richieste <ArrowUpRight size={15} /></Link></div><div className="activity-card">{(requests || []).map((request) => <Link className="activity-row activity-row--link" href="/dashboard/richieste" key={request.id}><span className="activity-icon"><MessageSquareText size={17} /></span><span><strong>{request.title}</strong><small>{request.public_id} · {status(request.status)}</small></span><b>{date(request.created_at)}</b></Link>)}{!requests?.length ? <Empty icon={<MessageSquareText size={20} />} title="Nessuna richiesta ancora" text="Quando avrai una richiesta attiva, la vedrai qui." /> : null}</div></section>
    <section><div className="section-title"><div><span className="eyebrow">MOVIMENTI</span><h2>Crediti caricati</h2></div><Link className="button button--ghost" href="/dashboard/crediti">Storico crediti <ArrowUpRight size={15} /></Link></div><div className="activity-card">{(transactions || []).map((transaction) => <Link className="activity-row activity-row--link" href="/dashboard/crediti" key={transaction.id}><span className={'activity-icon ' + (transaction.bucket === 'extra' ? 'activity-icon--violet' : '')}><CreditCard size={17} /></span><span><strong>{transaction.description}</strong><small>{transaction.bucket === 'extra' ? 'Crediti extra' : 'Crediti inclusi'} · {date(transaction.created_at)}</small></span><b className="positive">+{number(transaction.amount)}</b></Link>)}{!transactions?.length ? <Empty icon={<CreditCard size={20} />} title="Nessun movimento" text="I crediti caricati dal team compariranno qui." /> : null}</div></section>
  </main></>;
}

function Metric({icon, label, note, tone = 'green', value}: {icon: React.ReactNode; label: string; note: string; tone?: string; value: string}) { return <article className="metric-card"><span className={'metric-icon metric-icon--' + tone}>{icon}</span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>; }
function Empty({icon, text, title}: {icon: React.ReactNode; text: string; title: string}) { return <div className="activity-empty">{icon}<strong>{title}</strong><span>{text}</span></div>; }
function number(value: number) { return new Intl.NumberFormat('it-IT').format(value); }
function date(value: string) { return new Intl.DateTimeFormat('it-IT', {day: '2-digit', month: 'short', year: 'numeric'}).format(new Date(value)); }
function status(value: string) { return ({new: 'Nuova', in_progress: 'In lavorazione', completed: 'Completata', rejected: 'Rifiutata'} as Record<string, string>)[value] || 'Aggiornata'; }
