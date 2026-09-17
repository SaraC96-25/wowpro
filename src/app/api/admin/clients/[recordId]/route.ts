import {NextResponse} from 'next/server';
import {z} from 'zod';

import {getCurrentProfile} from '@/lib/auth';
import {updateWowproClient} from '@/lib/integrations/airtable';

const updateSchema = z.object({
  ragione_sociale: z.string().trim().min(1).max(200),
  email_login: z.string().trim().email().max(254),
  piano: z.string().trim().min(1).max(80),
  stato_abbonamento: z.string().trim().min(1).max(80),
  account_manager_nome: z.string().trim().max(120).optional(),
  shopify_customer_id: z.string().trim().max(120).optional(),
});

export async function PATCH(request: Request, {params}: {params: Promise<{recordId: string}>}) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({error: 'Non autenticato.'}, {status: 401});
  if (!['staff', 'admin'].includes(profile.role) || profile.status !== 'active') {
    return NextResponse.json({error: 'Accesso non autorizzato.'}, {status: 403});
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({error: 'Dati cliente non validi.'}, {status: 400});

  try {
    const {recordId} = await params;
    const record = await updateWowproClient(recordId, parsed.data);
    return NextResponse.json({fields: record.fields});
  } catch (error) {
    console.error('[Client update]', error);
    return NextResponse.json({error: 'Impossibile aggiornare il cliente.'}, {status: 502});
  }
}
