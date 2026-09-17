import {NextResponse} from 'next/server';
import {z} from 'zod';

import {getCurrentProfile} from '@/lib/auth';
import {getWowproClient, updateWowproClient} from '@/lib/integrations/airtable';
import {createAdminClient} from '@/lib/supabase/admin.server';

const creditSchema = z.object({
  bucket: z.enum(['included', 'extra']),
  amount: z.coerce.number().int().positive().max(100_000),
  reason: z.string().trim().min(3).max(500),
});

export async function POST(request: Request, {params}: {params: Promise<{recordId: string}>}) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({error: 'Non autenticato.'}, {status: 401});
  if (!['staff', 'admin'].includes(profile.role) || profile.status !== 'active') {
    return NextResponse.json({error: 'Accesso non autorizzato.'}, {status: 403});
  }

  const parsed = creditSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({error: 'Dati accredito non validi.'}, {status: 400});

  try {
    const {recordId} = await params;
    const client = await getWowproClient(recordId);
    const admin = createAdminClient();
    const {data: company, error: companyError} = await admin
      .from('companies')
      .upsert({
        airtable_record_id: recordId,
        name: client.fields.ragione_sociale || client.fields.cliente_id || 'Cliente WOWPRO',
        shopify_customer_id: client.fields.shopify_customer_id || null,
      }, {onConflict: 'airtable_record_id'})
      .select('id')
      .single();
    if (companyError || !company) throw new Error('Azienda non disponibile.');

    const {data: transaction, error: transactionError} = await admin
      .from('credit_transactions')
      .insert({
        company_id: company.id,
        bucket: parsed.data.bucket,
        amount: parsed.data.amount,
        description: parsed.data.reason,
        created_by: profile.id,
      })
      .select('id')
      .single();
    if (transactionError || !transaction) throw new Error('Registro crediti non disponibile.');

    const creditField = parsed.data.bucket === 'extra' ? 'crediti_extra_residui' : 'crediti_inclusi_residui';
    const previousBalance = Number(client.fields[creditField] || 0);
    let updated;
    try {
      updated = await updateWowproClient(recordId, {[creditField]: previousBalance + parsed.data.amount});
    } catch {
      await admin.from('credit_transactions').delete().eq('id', transaction.id);
      throw new Error('Impossibile accreditare i crediti.');
    }

    return NextResponse.json({fields: updated.fields});
  } catch (error) {
    console.error('[Credit adjustment]', error);
    return NextResponse.json({error: 'Impossibile accreditare i crediti.'}, {status: 502});
  }
}
