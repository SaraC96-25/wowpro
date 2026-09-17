'use client';

import {CheckCircle2, Lightbulb, MessageSquareText, Pencil, Search, X} from 'lucide-react';
import {FormEvent, useState} from 'react';

export type AdminFeedback = {
  id: string;
  publicId: string;
  companyName: string;
  authorName: string;
  category: string;
  title: string;
  description: string;
  status: FeedbackStatus;
  publicResponse: string;
  internalNote: string;
  votes: number;
  createdAt: string;
};

type FeedbackStatus = 'new' | 'evaluating' | 'implementing' | 'completed' | 'rejected';
const statusLabels: Record<FeedbackStatus, string> = {new: 'Nuova', evaluating: 'In valutazione', implementing: 'In sviluppo', completed: 'Completata', rejected: 'Non approvata'};

export function AdminFeedbackBoard({initialFeedback}: {initialFeedback: AdminFeedback[]}) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | FeedbackStatus>('all');
  const [editingFeedback, setEditingFeedback] = useState<AdminFeedback | null>(null);
  const [error, setError] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('it-IT');
  const visibleFeedback = feedback.filter((item) => {
    const matchesStatus = filter === 'all' || item.status === filter;
    const matchesQuery = !normalizedQuery || [item.publicId, item.companyName, item.authorName, item.category, item.title, item.description].some((value) => value.toLocaleLowerCase('it-IT').includes(normalizedQuery));
    return matchesStatus && matchesQuery;
  });
  const counts = countStatuses(feedback);

  return <>
    <section className="feedback-overview" aria-label="Riepilogo feedback">
      <FeedbackMetric icon={<Lightbulb />} label="Nuove idee" note="da esaminare" value={String(counts.new)} />
      <FeedbackMetric icon={<MessageSquareText />} label="In valutazione" note="con risposta in corso" tone="blue" value={String(counts.evaluating)} />
      <FeedbackMetric icon={<Pencil />} label="In sviluppo" note="in lavorazione dal team" tone="violet" value={String(counts.implementing)} />
      <FeedbackMetric icon={<CheckCircle2 />} label="Completate" note="idee realizzate" tone="green" value={String(counts.completed)} />
    </section>

    <section className="feedback-toolbar"><div><span className="eyebrow">COMMUNITY</span><h2>Feedback & idee</h2><p>Valuta le proposte dei clienti e rispondi dal portale.</p></div></section>
    {error ? <p className="directory-error">{error}</p> : null}
    <section className="feedback-board" aria-label="Elenco feedback e idee">
      <div className="feedback-board__filters"><label className="client-search"><Search size={17} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Cerca idea, cliente o categoria..." value={query} /></label><div className="credit-filter" role="group" aria-label="Filtra feedback"><button className={filter === 'all' ? 'is-selected' : ''} onClick={() => setFilter('all')} type="button">Tutti</button><button className={filter === 'new' ? 'is-selected' : ''} onClick={() => setFilter('new')} type="button">Nuovi</button><button className={filter === 'evaluating' ? 'is-selected' : ''} onClick={() => setFilter('evaluating')} type="button">In valutazione</button><button className={filter === 'implementing' ? 'is-selected' : ''} onClick={() => setFilter('implementing')} type="button">In sviluppo</button></div></div>
      <div className="feedback-board__head"><span>Idea</span><span>Cliente</span><span>Categoria</span><span>Voti</span><span>Stato</span><span>Azioni</span></div>
      {visibleFeedback.map((item) => <FeedbackRow item={item} key={item.id} onEdit={() => setEditingFeedback(item)} />)}
      {!visibleFeedback.length ? <div className="feedback-board__empty"><Lightbulb size={22} /><strong>Nessun feedback trovato</strong><p>{feedback.length ? 'Modifica i filtri o la ricerca per visualizzare altre proposte.' : 'Le proposte inviate dai clienti compariranno qui.'}</p></div> : null}
    </section>
    {editingFeedback ? <EditFeedbackModal feedback={editingFeedback} onClose={() => setEditingFeedback(null)} onError={setError} onSaved={(updated) => { setFeedback((current) => current.map((item) => item.id === updated.id ? updated : item)); setEditingFeedback(null); }} /> : null}
  </>;
}

function FeedbackRow({item, onEdit}: {item: AdminFeedback; onEdit: () => void}) {
  return <article className="feedback-board__row"><div><span className="admin-row__id">{item.publicId}</span><strong>{item.title}</strong><small>{truncate(item.description, 82)}</small></div><div><strong>{item.companyName}</strong><small>{item.authorName}</small></div><span className="feedback-category">{item.category}</span><strong className="feedback-votes">{item.votes}</strong><span className={`feedback-status feedback-status--${item.status}`}>{statusLabels[item.status]}</span><button className="client-action" onClick={onEdit} type="button"><Pencil size={15} />Gestisci</button></article>;
}

function EditFeedbackModal({feedback, onClose, onError, onSaved}: {feedback: AdminFeedback; onClose: () => void; onError: (error: string) => void; onSaved: (feedback: AdminFeedback) => void}) {
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSaving(true); setError(''); onError('');
    const form = new FormData(event.currentTarget);
    const payload = {status: String(form.get('status') || ''), publicResponse: String(form.get('publicResponse') || ''), internalNote: String(form.get('internalNote') || '')};
    try {
      const response = await fetch(`/api/admin/feedback/${feedback.id}`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
      const result = await readApiResponse(response);
      if (!response.ok || !result.feedback) throw new Error(result.error || 'Salvataggio non riuscito.');
      onSaved({...feedback, status: result.feedback.status, publicResponse: result.feedback.publicResponse, internalNote: result.feedback.internalNote});
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Salvataggio non riuscito.'); } finally { setIsSaving(false); }
  }
  return <div aria-modal="true" className="modal-backdrop" role="dialog"><section className="client-modal"><header><div><h2>Gestisci feedback</h2><p>{feedback.companyName} · {feedback.publicId}</p></div><button aria-label="Chiudi" className="modal-close" onClick={onClose} type="button"><X size={19} /></button></header><form className="client-form" onSubmit={save}><p className="feedback-description client-form__wide"><strong>{feedback.title}</strong>{feedback.description}</p><label className="client-form__wide">Stato<select defaultValue={feedback.status} name="status">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="client-form__wide">Risposta visibile al cliente<textarea defaultValue={feedback.publicResponse} name="publicResponse" placeholder="Aggiornamento che il cliente vedrà nel portale..." rows={4} /></label><label className="client-form__wide">Nota interna<textarea defaultValue={feedback.internalNote} name="internalNote" placeholder="Contesto operativo solo per il team..." rows={3} /></label>{error ? <p className="form-error">{error}</p> : null}<footer className="modal-actions"><button className="client-action" disabled={isSaving} onClick={onClose} type="button">Annulla</button><button className="client-action client-action--primary" disabled={isSaving} type="submit">{isSaving ? 'Salvataggio...' : 'Salva aggiornamento'}</button></footer></form></section></div>;
}

function FeedbackMetric({icon, label, note, tone = 'green', value}: {icon: React.ReactNode; label: string; note: string; tone?: string; value: string}) { return <article className="credit-overview__metric"><span className={`metric-icon metric-icon--${tone}`}>{icon}</span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>; }
function countStatuses(items: AdminFeedback[]) { return items.reduce<Record<FeedbackStatus, number>>((counts, item) => ({...counts, [item.status]: counts[item.status] + 1}), {new: 0, evaluating: 0, implementing: 0, completed: 0, rejected: 0}); }
function truncate(value: string, length: number) { return value.length > length ? `${value.slice(0, length - 1)}...` : value; }
async function readApiResponse(response: Response) { const contentType = response.headers.get('content-type') || ''; if (contentType.includes('application/json')) return await response.json() as {error?: string; feedback?: {status: FeedbackStatus; publicResponse: string; internalNote: string}}; return {error: response.ok ? 'Risposta non valida dal server.' : 'Il servizio non è disponibile. Riprova tra qualche istante.'}; }
