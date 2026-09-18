import Link from 'next/link';
import {ArrowRight, BadgePercent, Box, Gift, Headphones, ScanSearch, ShieldCheck, Sparkles, Truck} from 'lucide-react';

import {PageHeader} from '@/components/app-shell';
import {requireProfile} from '@/lib/auth';
import {getWowproClient} from '@/lib/integrations/airtable';
import {createClient} from '@/lib/supabase/server';

const benefits = [
  {icon: Headphones, title: 'Account manager dedicato', text: 'Una referente che conosce i tuoi progetti, raggiungibile via email, chat e telefono.'},
  {icon: BadgePercent, title: 'Listino prezzi dedicato', text: 'Prezzi riservati WOWPRO su tutto il catalogo, applicati in automatico al checkout.'},
  {icon: Sparkles, title: 'Produzione prioritaria', tag: 'FAST LANE', text: 'I tuoi ordini saltano in cima alla coda di stampa, lavorati prima degli altri.'},
  {icon: Truck, title: 'Priority gratuita', tag: 'SOPRA 250 EUR', text: 'Spedizione Priority inclusa senza costi per ogni ordine oltre i 250 EUR.'},
  {icon: Box, title: 'Spedizione white label', text: 'Pacco anonimo e mittente personalizzato: spedisci ai tuoi clienti a tuo nome.'},
  {icon: ScanSearch, title: 'Preventivi rapidi', text: 'Quotazioni su misura in tempi brevi, senza attese e senza trafile.'},
  {icon: Gift, title: 'Accesso prioritario alle promo', tag: 'RISERVATO', text: 'Sei tra i primi ad accedere a offerte e promozioni dedicate ai clienti WOWPRO, prima del pubblico.'},
];

export default async function ClientHomePage() {
  const profile = await requireProfile(['client']);
  const supabase = await createClient();
  const {data: company} = await supabase.from('companies').select('name,airtable_record_id').eq('id', profile.company_id || '').maybeSingle();
  let credits = 0;
  let plan = 'WOWPRO';
  let manager = '';
  if (company?.airtable_record_id) {
    try {
      const airtable = await getWowproClient(company.airtable_record_id);
      credits = Number(airtable.fields.crediti_inclusi_residui || 0) + Number(airtable.fields.crediti_extra_residui || 0);
      plan = airtable.fields.piano ? `WOWPRO ${airtable.fields.piano}` : plan;
      manager = airtable.fields.account_manager_nome || '';
    } catch { /* The welcome page stays available when Airtable is unreachable. */ }
  }
  const firstName = (profile.full_name || company?.name || 'cliente').trim().split(/\s+/)[0];

  return <><PageHeader eyebrow={`WOWPRO · ${company?.name || 'Area cliente'}`} title="Home" action={<div className="credit-chip"><i /> <strong>{number(credits)}</strong> crediti disponibili</div>} /><main className="page-content client-home">
    <section className="client-home__hero">
      <div className="client-home__greeting"><span>👋</span><strong>Bentornato, <em>{firstName}</em></strong><small>{company?.name || 'Cliente WOWPRO'} · Piano {plan}</small></div>
      <h2>Il tuo reparto<br />grafico è <em>pronto.</em></h2>
      <p>Con WOWPRO hai un team grafico dedicato sempre a disposizione. Ogni mese un plafond di crediti da usare quando vuoi: su revisioni, modifiche e creazioni grafiche. Tu pensi al business, al resto pensiamo noi.</p>
      <div className="client-home__actions"><Link className="button button--primary" href="/dashboard/richieste">Inizia una nuova richiesta <ArrowRight size={17} /></Link><Link className="button button--ghost" href="/dashboard">Esplora la dashboard</Link></div>
      {manager ? <div className="client-home__manager"><ShieldCheck size={16} /><span>Il tuo account manager: <strong>{manager}</strong></span></div> : null}
    </section>
    <section className="client-home__benefits"><div className="section-title"><div><h2>Vantaggi inclusi nel piano</h2><p>Tutto quello che ottieni con il piano {plan}</p></div></div><div className="benefit-grid">{benefits.map(({icon: Icon, title, tag, text}) => <article key={title}><span><Icon size={21} /></span><div><h3>{title} {tag ? <small>{tag}</small> : null}</h3><p>{text}</p></div></article>)}</div></section>
  </main></>;
}

function number(value: number) { return new Intl.NumberFormat('it-IT').format(value); }
