'use client';

import {FormEvent, useState} from 'react';
import {ArrowRight, Mail} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const {error} = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) throw error;
      setState('sent');
    } catch {
      // Keep the response generic so the form never reveals the allowlist.
      setState('sent');
    }
  }

  if (state === 'sent') {
    return (
      <div className="login-message" role="status">
        <span className="login-message__icon"><Mail size={20} /></span>
        <h2>Controlla la tua email</h2>
        <p>Se l’indirizzo è abilitato a WOWPRO, riceverai un link valido per 15 minuti.</p>
        <button className="button button--ghost" onClick={() => setState('idle')}>Usa un’altra email</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="login-form">
      <label htmlFor="email">Email aziendale</label>
      <div className="input-wrap">
        <Mail size={18} aria-hidden="true" />
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nome@azienda.it"
          autoComplete="email"
          required
        />
      </div>
      <button className="button button--primary" disabled={state === 'sending'}>
        {state === 'sending' ? 'Invio in corso…' : 'Invia link di accesso'}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
      <p className="login-help">Il link è personale, utilizzabile una sola volta e scade dopo 15 minuti.</p>
    </form>
  );
}
