import Link from 'next/link';
import {BadgePlus, Box, CreditCard, Headphones, MessageSquareText, PackageCheck, Plus, ShoppingBag, Star} from 'lucide-react';

import {PageHeader} from '@/components/app-shell';
import {requireProfile} from '@/lib/auth';
import {getWowproClient} from '@/lib/integrations/airtable';
import {createClient} from '@/lib/supabase/server';

type Activity = {id: string; title: string; detail: string; createdAt: string; value?: string; tone: 'amber' | 'green' | 'violet'; icon: 'request' | 'complete' | 'credit'};

export default async function DashboardPage() {
  const profile = await requireProfile(['client']);
  const supabase = await createClient();
  const [{data: company}, {data: requests}, {data: transactions}] = await Promise.all([
    supabase.from('companies').select('name,airtable_record_id').eq('id', profile.company_id || '').maybeSingle(),
    supabase.from('graphic_requests').select('id,public_id,title,status,created_at,completed_at').order('created_at', {ascending: false}).limit(8),
    supabase.from('credit_transactions').select('id,bucket,amount,description,created_at').order('created_at', {ascending: false}).limit(8),
  ]);
  let included = 0; let extra = 0; let monthly = 0; let manager = '';
  if (company?.airtable_record_id) {
    try {
      const airtable = await getWowproClient(company.airtable_record_id);
      included = Number(airtable.fields.crediti_inclusi_residui || 0);
      extra = Number(airtable.fields.crediti_extra_residui || 0);
      monthly = Number(airtable.fields.crediti_inclusi_mese || 0);
      manager = airtable.fields.account_manager_nome || '';
    } catch { /* Dashboard data remains available when Airtable is unreachable. */ }
  }
  const available = included + extra;
  const open = (requests || []).filter((request) => request.status === 'new' || request.status === 'in_progress');
  const activities: Activity[] = [
    ...(requests || []).map((request) => ({
      id: `request-${request.id}`,
      title: `${request.status === 'completed' ? 'Completata' : 'Nuova richiesta'} · ${request.title}`,
      detail: request.status === 'in_progress' ? 'In lavorazione' : request.status === 'completed' ? 'Richiesta completata' : 'In attesa di lavorazione',
      createdAt: request.completed_at || request.created_at,
      tone: request.status === 'completed' ? 'green' as const : 'amber' as const,
      icon: request.status === 'completed' ? 'complete' as const : 'request' as const,
    })),
    ...(transactions || []).map((transaction) => ({
      id: `credit-${transaction.id}`,
      title: transaction.description,
      detail: transaction.bucket === 'extra' ? 'Crediti extra' : 'Crediti inclusi',
      createdAt: transaction.created_at,
      value: `${transaction.amount > 0 ? '+' : ''}${number(transaction.amount)}`,
      tone: transaction.bucket === 'extra' ? 'violet' as const : 'green' as const,
      icon: 'credit' as const,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  return <><PageHeader eyebrow={'WOWPRO · ' + (company?.name || 'Area cliente')} title="Dashboard" action={<div className="credit-chip"><i /> <strong>{number(available)}</strong> crediti disponibili</div>} /><main className="page-content client-dashboard">
    <section className="client-dashboard__metrics">
      <article className="dashboard-metric dashboard-metric--credits"><span><CreditCard size={19} /></span><p>Crediti disponibili</p><strong>{number(available)}</strong><i><b style={{width: monthly ? `${Math.min(available / monthly, 1) * 100}%` : '0%'}} /></i><Link href="/dashboard/crediti">Vedi dettaglio crediti <span>→</span></Link></article>
      <article className="dashboard-metric"><span className="dashboard-metric__blue"><MessageSquareText size={19} /></span><p>Richieste aperte</p><strong>{open.length}</strong><small><i /> {open.filter((request) => request.status === 'in_progress').length} in lavorazione · {open.filter((request) => request.status === 'new').length} nuova{open.filter((request) => request.status === 'new').length === 1 ? '' : 'e'}</small></article>
      <article className="dashboard-metric"><span className="dashboard-metric__amber"><ShoppingBag size={19} /></span><p>Ultimo ordine</p><strong className="dashboard-metric__empty">—</strong><small>Collega Shopify per visualizzare gli ordini.</small></article>
    </section>
    <section><div className="client-dashboard__section-title"><h2>Azioni rapide</h2></div><div className="client-dashboard__quick-actions">
      <Link href="/dashboard/richieste"><span><Plus size={21} /></span><strong>Nuova richiesta</strong><p>Revisione, modifica o creazione grafica</p></Link>
      <Link href="/dashboard/crediti"><span><BadgePlus size={19} /></span><strong>Acquista crediti</strong><p>Gestisci i crediti extra del tuo account</p></Link>
      <Link href="/dashboard/ordini"><span><PackageCheck size={19} /></span><strong>I tuoi ordini</strong><p>Stato produzione e tracking spedizioni</p></Link>
      <Link href="/dashboard/supporto"><span><Headphones size={19} /></span><strong>Account manager</strong><p>{manager ? `Parla con ${manager}, la tua referente WOWPRO` : 'Il tuo referente WOWPRO è a disposizione'}</p></Link>
    </div></section>
    <section><div className="client-dashboard__section-title"><h2>Attività recenti</h2><Link className="button button--ghost" href="/dashboard/crediti">Vedi storico crediti</Link></div><div className="client-dashboard__activity">{activities.map((activity) => <Link href={activity.icon === 'credit' ? '/dashboard/crediti' : '/dashboard/richieste'} key={activity.id}><span className={`client-activity-icon client-activity-icon--${activity.tone}`}>{activity.icon === 'credit' ? <BadgePlus size={17} /> : activity.icon === 'complete' ? <Star size={16} /> : <MessageSquareText size={16} />}</span><span><strong>{activity.title}</strong><small>{date(activity.createdAt)} · {activity.detail}</small></span>{activity.value ? <b className={activity.value.startsWith('+') ? 'positive' : 'negative'}>{activity.value}</b> : null}</Link>)}{!activities.length ? <div className="client-dashboard__activity-empty"><Box size={21} /><strong>Nessuna attività ancora</strong><p>Richieste e movimenti crediti compariranno qui.</p></div> : null}</div></section>
  </main></>;
}

function number(value: number) { return new Intl.NumberFormat('it-IT').format(value); }
function date(value: string) { return new Intl.DateTimeFormat('it-IT', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}).format(new Date(value)); }
