# WOWPRO

Area riservata premium di WowStampa, con portale cliente e back-office interno.

## Stack

- Next.js 16 e TypeScript
- Supabase Auth (magic link), Postgres e Row Level Security
- Airtable come sorgente dell'allowlist WOWPRO
- Shopify Admin GraphQL API per ordini e tracking
- Deploy Node standalone su Render

## Avvio locale

1. Copiare `.env.example` in `.env.local` e valorizzare le chiavi.
2. Eseguire la migration `supabase/migrations/0001_wowpro_core.sql` nel progetto Supabase.
3. Configurare in Supabase il redirect `/auth/callback` e la scadenza OTP a 900 secondi.
4. Installare e avviare:

```bash
npm install
npm run dev
```

## Accesso

Gli utenti non possono registrarsi autonomamente: `shouldCreateUser` è disabilitato. Un processo server sincronizzerà gli utenti attivi della tabella Airtable `WOWPRO`, creerà gli account autorizzati e assegnerà il ruolo `client`, `staff` o `admin`.

Le route cliente e amministrative devono sempre verificare il profilo lato server. Le policy RLS rappresentano una seconda barriera e impediscono accessi incrociati tra aziende.
