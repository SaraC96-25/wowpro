'use client';

import {Check, MessageSquareText, Plus, Upload, X} from 'lucide-react';
import {ChangeEvent, FormEvent, useState} from 'react';

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

export function ClientRequestsWorkspace({extraCredits, includedCredits, requests}: {extraCredits: number; includedCredits: number; requests: ClientWorkspaceRequest[]}) {
  const [items, setItems] = useState(requests);
  const [balances, setBalances] = useState({included: includedCredits, extra: extraCredits});
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
    {isCreating ? <CreateRequestModal extraCredits={balances.extra} includedCredits={balances.included} onClose={() => setIsCreating(false)} onCreated={(request) => { const usedIncluded = Math.min(balances.included, request.creditCost); setBalances({included: balances.included - usedIncluded, extra: balances.extra - (request.creditCost - usedIncluded)}); setItems((current) => [request, ...current]); setSelectedId(request.id); setIsCreating(false); }} /> : null}
  </section>;
}

function CreateRequestModal({extraCredits, includedCredits, onClose, onCreated}: {extraCredits: number; includedCredits: number; onClose: () => void; onCreated: (request: ClientWorkspaceRequest) => void}) {
  const [type, setType] = useState<'revision' | 'modification' | 'creation'>('modification');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const creditCost = {revision: 1_000, modification: 2_000, creation: 3_000}[type];
  const available = includedCredits + extraCredits;
  const after = available - creditCost;

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(''); setIsSaving(true);
    try {
      const response = await fetch('/api/client/requests', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type, brief: String(form.get('brief') || '')})});
      const result = await readResponse(response);
      if (!response.ok || !result.request) throw new Error(result.error || 'Creazione non riuscita.');
      onCreated({...result.request, messages: []});
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Creazione non riuscita.'); } finally { setIsSaving(false); }
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    if (selected.some((file) => file.size > 50 * 1024 * 1024)) { setError('Ogni file può avere una dimensione massima di 50 MB.'); return; }
    setError(''); setFiles(selected);
  }

  return <div aria-modal="true" className="modal-backdrop" role="dialog"><section aria-labelledby="clientRequestTitle" className="client-request-modal"><header className="client-request-modal__head"><div><h2 id="clientRequestTitle">Nuova richiesta grafica</h2><p>Scegli il servizio, descrivi cosa ti serve e carica i file.</p></div><button aria-label="Chiudi" className="modal-close" onClick={onClose} type="button"><X size={19} /></button></header>
    <form onSubmit={createRequest}>
      <div className="client-request-modal__body">
        <fieldset className="service-picker"><legend>Tipo di servizio <b>*</b></legend>{(['revision', 'modification', 'creation'] as const).map((item) => <button aria-pressed={type === item} className={type === item ? 'is-selected' : ''} key={item} onClick={() => setType(item)} type="button"><span className="service-picker__check">{type === item ? <Check size={14} /> : null}</span><span>{requestType(item)}</span><small><b>{number({revision: 1_000, modification: 2_000, creation: 3_000}[item])}</b> crediti</small></button>)}</fieldset>
        <label className="request-modal-field"><span>Descrizione della richiesta <b>*</b></span><textarea name="brief" placeholder="Es. Modificare il volantino A5 cambiando data e logo, mantenendo lo stesso stile..." required rows={5} /></label>
        <label className="request-modal-field">File di riferimento<input accept=".pdf,.ai,.psd,.jpg,.jpeg,.png" multiple onChange={selectFiles} type="file" /><span className="request-file-drop"><i><Upload size={19} /></i><strong>Trascina i file qui o <b>sfoglia</b></strong><small>PDF, AI, PSD, JPG, PNG · max 50 MB</small></span></label>
        {files.length ? <div className="request-file-list">{files.map((file) => <span key={`${file.name}-${file.lastModified}`}>{file.name}</span>)}</div> : null}
        <section className="request-credit-check"><h3>Verifica crediti in tempo reale</h3><div><span>Costo del servizio</span><b>−{number(creditCost)}</b></div><div><span>Disponibili ora <small>({number(includedCredits)} inclusi + {number(extraCredits)} extra)</small></span><b>{number(available)}</b></div><div className="request-credit-check__total"><span>Saldo dopo la richiesta</span><b className={after < 0 ? 'negative' : ''}>{number(Math.max(after, 0))}</b></div><p><Check size={15} /> {after >= 0 ? 'Crediti sufficienti per inviare la richiesta.' : 'Crediti insufficienti per questo servizio.'}</p></section>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
      <footer className="client-request-modal__foot"><small>I crediti inclusi vengono usati per primi, poi gli extra.</small><span /><button className="client-action" disabled={isSaving} onClick={onClose} type="button">Annulla</button><button className="client-action client-action--primary" disabled={isSaving || after < 0} type="submit"><Check size={16} />{isSaving ? 'Invio...' : 'Invia richiesta'}</button></footer>
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
