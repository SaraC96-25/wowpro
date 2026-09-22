import {AdminLoginForm} from './admin-login-form';

export default function AdminLoginPage() {
  return <main className="login-page login-page--staff"><section className="login-card"><div className="brand brand--login"><span className="brand__mark">W</span><span><strong>WOWPRO</strong><small>by WowStampa</small></span></div><div className="login-copy"><span className="eyebrow">ACCESSO RISERVATO</span><h1>Il tuo spazio<br />di lavoro interno.</h1><p>Accedi con le credenziali personali assegnate al tuo ruolo WOWPRO.</p></div><AdminLoginForm /><p className="login-help">Amministrazione · Account Manager · Grafico</p></section><aside aria-hidden="true" className="login-art"><div className="login-art__orb login-art__orb--one" /><div className="login-art__orb login-art__orb--two" /><p>WOWPRO TEAM</p><strong>Ogni progetto,<br />nel posto giusto.</strong></aside></main>;
}
