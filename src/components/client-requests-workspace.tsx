'use client';

import {MessageSquareText, Plus, X} from 'lucide-react';
import {FormEvent, useState} from 'react';

export type ClientWorkspaceRequest = {
  id: string;
  publicId: string;
  title: string;
  brief: string;
  status: string;
  type: string;
  creditCost: number;
  createdAt: string;
  messages: Array<{id: string; body: string; createdAt: string}>;
};

export function ClientRequestsWorkspace({requests}: {requests: ClientWorkspaceRequest[]}) {
  const [items, setItems] = useState(requests);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const selected = items.find((request) => request.id === selectedId);

  return <section className="client-requests-workspace">
    <header className="client-requests-toolbar">
      <div>
        <h2>Le tue richieste grafiche</h2>
        <p>Segui lo stato di ogni lavorazione in tempo reale</p>
      </div>
      <button className="button button--primary" onClick={() => setIsCreating(true)} type="button">
        <Plus size={17} /> Nuova richiesta
      </button>
    </header>
    {!items.length ? <section className="empty-card empty-card--section"><span className="eyebrow">NESSUNA RICHIESTA</span><h2>Non hai richieste attive</h2><p>Inizia con una nuova richiesta per coinvolgere il tuo team grafico.</p></section> : <div className="client-requests-grid">
      <div className="client-request-list client-request-list--workspace">
        {items.map((request) => <button aria-pressed={selectedId === request.id} className={'client-request-row' + (selectedId === request.id ? ' client-request-row--selected' : '')} key={request.id} onClick={() => setSelectedId(request.id)} type="button">
          <span className="client-request-row__icon"><MessageSquareText size={17} /></span>
          <span className="client-request-row__copy">
            <small>{request.publicId}</small>
            <strong>{request.title}</strong>
            <em>{requestType(request.type)} <i /> {number(request.creditCost)} crediti</em>
          </span>
          <span className="client-request-row__meta"><b className={'client-request-status client-request-status--' + statusClass(request.status)}>{status(request.status)}</b><small>{shortDate(request.createdAt)}</small></span>
        </button>)}
      </div>
      <aside className="client-request-detail">
        {selected ? <RequestDetail request={selected} /> : <div className="client-request-detail__empty"><MessageSquareText size={29} /><p>Seleziona una richiesta dalla lista<br />per vederne i dettagli.</p></div>}
      </aside>
    </div>}
    {isCreating ? <CreateRequestModal onClose={() => setIsCreating(false)} onCreated={(request) => { setItems((current) => [request, ...current]); setSelectedId(request.id); setIsCreating(false); }} /> : null}
  </section>;
}

function CreateRequestModal({onClose, onCreated}: {onClose: () => void; onCreated: (request: ClientWorkspaceRequest) => void}) {
  const [type, setType] = useState<'revision' | 'modification' | 'creation'>('modification');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const creditCost = {revision: 1_000, modification: 2_000, creation: 3_000}[type];

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(''); setIsSaving(true);
    try {
      const response = await fetch('/api/client/requests', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type, title: String(form.get('title') || ''), brief: String(form.get('brief') || '')})});
      const result = await readResponse(response);
      if (!response.ok || !result.request) throw new Error(result.error || 'Creazione non riuscita.');
      onCreated({...result.request, messages: []});
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Creazione non riuscita.'); } finally { setIsSaving(false); }
  }

  return <div aria-modal="true" className="modal-backdrop" role="dialog"><section className="client-modal"><header><div><h2>Nuova richiesta grafica</h2><p>Descrivi il lavoro: il team lo prenderà in carico.</p></div><button aria-label="Chiudi" className="modal-close" onClick={onClose} type="button"><X size={19} /></button></header>
    <form className="client-form" onSubmit={createRequest}>
      <fieldset className="credit-choice"><legend>Tipo di richiesta</legend>{(['revision', 'modification', 'creation'] as const).map((item) => <button className={type === item ? 'is-selected' : ''} key={item} onClick={() => setType(item)} type="button">{requestType(item)}<small>{number({revision: 1_000, modification: 2_000, creation: 3_000}[item])} crediti</small></button>)}</fieldset>
      <label className="client-form__wide">Titolo<input name="title" placeholder="es. Modifica volantino A5" required /></label>
      <label className="client-form__wide">Brief<textarea name="brief" placeholder="Descrivi cosa vuoi realizzare, i materiali disponibili e le indicazioni importanti..." required rows={6} /></label>
      <p className="form-hint">Al momento dell’invio verranno scalati {number(creditCost)} crediti: prima gli inclusi, poi gli extra.</p>
      {error ? <p className="form-error">{error}</p> : null}
      <footer className="modal-actions"><button className="client-action" disabled={isSaving} onClick={onClose} type="button">Annulla</button><button className="client-action client-action--primary" disabled={isSaving} type="submit"><Plus size={16} />{isSaving ? 'Invio...' : `Invia richiesta · ${number(creditCost)}`}</button></footer>
    </form>
  </section></div>;
}

function RequestDetail({request}: {request: ClientWorkspaceRequest}) {
  return <div className="client-request-detail__content">
    <div className="client-request-detail__head"><div><small>{request.publicId}</small><h3>{request.title}</h3></div><b className={'client-request-status client-request-status--' + statusClass(request.status)}>{status(request.status)}</b></div>
    <p>{request.brief}</p>
    <div className="client-request-detail__info"><span>{requestType(request.type)} · {number(request.creditCost)} crediti</span><span>Inviata il {longDate(request.createdAt)}</span></div>
    <div className="client-request-detail__messages"><strong>Messaggi dal team</strong>{request.messages.length ? request.messages.map((message) => <article key={message.id}><small>{longDate(message.createdAt)}</small><p>{message.body}</p></article>) : <p>Nessun messaggio dal team per il momento.</p>}</div>
  </div>;
}

function status(value: string) { return ({new: 'Nuova', in_progress: 'In lavorazione', completed: 'Completata', rejected: 'Rifiutata'} as Record<string, string>)[value] || 'Aggiornata'; }
function statusClass(value: string) { return value === 'in_progress' ? 'working' : value === 'completed' ? 'completed' : value === 'rejected' ? 'rejected' : 'new'; }
function requestType(value: string) { return ({revision: 'Revisione', modification: 'Modifica', creation: 'Creazione'} as Record<string, string>)[value] || value || 'Richiesta'; }
function number(value: number) { return new Intl.NumberFormat('it-IT').format(value); }
function shortDate(value: string) { return new Intl.DateTimeFormat('it-IT', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(new Date(value)); }
function longDate(value: string) { return new Intl.DateTimeFormat('it-IT', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}).format(new Date(value)); }

async function readResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await response.json() as {error?: string; request?: Omit<ClientWorkspaceRequest, 'messages'>};
  return {error: response.ok ? 'Risposta non valida dal servizio.' : 'Il servizio non è disponibile. Riprova tra qualche istante.'};
}
