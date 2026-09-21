'use client';

import {MessageSquareText, Plus} from 'lucide-react';
import {useState} from 'react';

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = requests.find((request) => request.id === selectedId);

  return <section className="client-requests-workspace">
    <header className="client-requests-toolbar">
      <div>
        <h2>Le tue richieste grafiche</h2>
        <p>Segui lo stato di ogni lavorazione in tempo reale</p>
      </div>
      <button className="button button--primary" type="button" title="La creazione guidata sarà disponibile a breve">
        <Plus size={17} /> Nuova richiesta
      </button>
    </header>
    {!requests.length ? <section className="empty-card empty-card--section"><span className="eyebrow">NESSUNA RICHIESTA</span><h2>Non hai richieste attive</h2><p>Le richieste gestite dal team compariranno qui.</p></section> : <div className="client-requests-grid">
      <div className="client-request-list client-request-list--workspace">
        {requests.map((request) => <button aria-pressed={selectedId === request.id} className={'client-request-row' + (selectedId === request.id ? ' client-request-row--selected' : '')} key={request.id} onClick={() => setSelectedId(request.id)} type="button">
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
  </section>;
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
