'use client';

import {CheckCircle2, Clock3, MessageSquareText, Search, TriangleAlert} from 'lucide-react';
import {useState} from 'react';

export type AdminGraphicRequest = {
  id: string;
  publicId: string;
  companyName: string;
  requesterName: string;
  title: string;
  brief: string;
  type: 'revision' | 'modification' | 'creation';
  status: RequestStatus;
  creditCost: number;
  createdAt: string;
};

type RequestStatus = 'new' | 'in_progress' | 'completed' | 'rejected';

const statusLabels: Record<RequestStatus, string> = {new: 'Nuova', in_progress: 'In lavorazione', completed: 'Completata', rejected: 'Rifiutata'};
const typeLabels: Record<AdminGraphicRequest['type'], string> = {revision: 'Revisione', modification: 'Modifica', creation: 'Creazione'};

export function AdminRequestBoard({initialRequests}: {initialRequests: AdminGraphicRequest[]}) {
  const [requests, setRequests] = useState(initialRequests);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | RequestStatus>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('it-IT');
  const visibleRequests = requests.filter((request) => {
    const matchesFilter = filter === 'all' || request.status === filter;
    const matchesQuery = !normalizedQuery || [request.publicId, request.companyName, request.requesterName, request.title, request.brief]
      .some((value) => value.toLocaleLowerCase('it-IT').includes(normalizedQuery));
    return matchesFilter && matchesQuery;
  });
  const counts = countStatuses(requests);

  async function updateStatus(requestId: string, status: RequestStatus) {
    setUpdatingId(requestId); setError('');
    try {
      const response = await fetch(`/api/admin/requests/${requestId}`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({status})});
      const result = await readApiResponse(response);
      if (!response.ok || !result.request) throw new Error(result.error || 'Aggiornamento non riuscito.');
      const updatedStatus = result.request.status;
      setRequests((current) => current.map((request) => request.id === requestId ? {...request, status: updatedStatus} : request));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Aggiornamento non riuscito.');
    } finally { setUpdatingId(null); }
  }

  return <>
    <section className="request-overview" aria-label="Riepilogo richieste">
      <RequestMetric icon={<MessageSquareText />} label="Aperte" note="nuove e in lavorazione" value={String(counts.new + counts.in_progress)} />
      <RequestMetric icon={<Clock3 />} label="Da assegnare" note="richieste appena ricevute" tone="blue" value={String(counts.new)} />
      <RequestMetric icon={<CheckCircle2 />} label="Completate" note="archivio operativo" tone="green" value={String(counts.completed)} />
      <RequestMetric icon={<TriangleAlert />} label="Rifiutate" note="non procedibili" tone="amber" value={String(counts.rejected)} />
    </section>

    <section className="request-toolbar">
      <div><span className="eyebrow">OPERATIVITÀ</span><h2>Richieste grafiche</h2><p>Gestisci le richieste e aggiorna lo stato di lavorazione.</p></div>
    </section>
    {error ? <p className="directory-error">{error}</p> : null}

    <section className="request-board" aria-label="Elenco richieste grafiche">
      <div className="request-board__filters">
        <label className="client-search"><Search size={17} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Cerca richiesta o cliente..." value={query} /></label>
        <div className="credit-filter" role="group" aria-label="Filtra richieste">
          <button className={filter === 'all' ? 'is-selected' : ''} onClick={() => setFilter('all')} type="button">Tutte</button>
          <button className={filter === 'new' ? 'is-selected' : ''} onClick={() => setFilter('new')} type="button">Nuove</button>
          <button className={filter === 'in_progress' ? 'is-selected' : ''} onClick={() => setFilter('in_progress')} type="button">In corso</button>
          <button className={filter === 'completed' ? 'is-selected' : ''} onClick={() => setFilter('completed')} type="button">Completate</button>
        </div>
      </div>
      <div className="request-board__head"><span>Richiesta</span><span>Cliente</span><span>Brief</span><span>Crediti</span><span>Data</span><span>Stato</span></div>
      {visibleRequests.map((request) => <RequestRow isUpdating={updatingId === request.id} key={request.id} onStatusChange={(status) => updateStatus(request.id, status)} request={request} />)}
      {!visibleRequests.length ? <div className="request-board__empty"><MessageSquareText size={22} /><strong>Nessuna richiesta trovata</strong><p>{requests.length ? 'Modifica i filtri o la ricerca per vedere altre richieste.' : 'Le richieste inviate dai clienti compariranno qui.'}</p></div> : null}
    </section>
  </>;
}

function RequestRow({isUpdating, onStatusChange, request}: {isUpdating: boolean; onStatusChange: (status: RequestStatus) => void; request: AdminGraphicRequest}) {
  return <article className="request-board__row">
    <div><span className="admin-row__id">{request.publicId}</span><strong>{request.title}</strong><small>{typeLabels[request.type]}</small></div>
    <div><strong>{request.companyName}</strong><small>{request.requesterName}</small></div>
    <p title={request.brief}>{request.brief}</p>
    <strong className="request-cost">{formatNumber(request.creditCost)}</strong>
    <span className="request-date">{formatDate(request.createdAt)}</span>
    <select aria-label={`Aggiorna stato ${request.publicId}`} disabled={isUpdating} onChange={(event) => onStatusChange(event.target.value as RequestStatus)} value={request.status}>
      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  </article>;
}

function RequestMetric({icon, label, note, tone = 'green', value}: {icon: React.ReactNode; label: string; note: string; tone?: string; value: string}) {
  return <article className="credit-overview__metric"><span className={`metric-icon metric-icon--${tone}`}>{icon}</span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

function countStatuses(requests: AdminGraphicRequest[]) { return requests.reduce<Record<RequestStatus, number>>((counts, request) => ({...counts, [request.status]: counts[request.status] + 1}), {new: 0, in_progress: 0, completed: 0, rejected: 0}); }
function formatDate(value: string) { return new Intl.DateTimeFormat('it-IT', {day: '2-digit', month: 'short', year: 'numeric'}).format(new Date(value)); }
function formatNumber(value: number) { return new Intl.NumberFormat('it-IT').format(value); }

async function readApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await response.json() as {error?: string; request?: {status: RequestStatus}};
  return {error: response.ok ? 'Risposta non valida dal server.' : 'Il servizio non è disponibile. Riprova tra qualche istante.'};
}
