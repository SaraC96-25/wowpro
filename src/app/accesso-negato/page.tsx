import Link from 'next/link';

export default function AccessDeniedPage() {
  return (
    <main className="center-page">
      <div className="empty-card">
        <span className="eyebrow">WOWPRO</span>
        <h1>Accesso non disponibile</h1>
        <p>Il tuo account non è attivo oppure non dispone dei permessi necessari.</p>
        <Link className="button button--primary" href="/login">Torna al login</Link>
      </div>
    </main>
  );
}
