import {NextResponse} from 'next/server';
import {z} from 'zod';

import {getCurrentProfile} from '@/lib/auth';
import {createAdminClient} from '@/lib/supabase/admin.server';

const createRequestSchema = z.object({
  airtableRecordId: z.string().trim().min(1).max(100),
  companyName: z.string().trim().min(1).max(200),
  title: z.string().trim().min(3).max(200),
  brief: z.string().trim().min(10).max(5_000),
  type: z.enum(['revision', 'modification', 'creation']),
  creditCost: z.coerce.number().int().positive().max(100_000),
});

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({error: 'Non autenticato.'}, {status: 401});
  if (!['staff', 'admin'].includes(profile.role) || profile.status !== 'active') {
    return NextResponse.json({error: 'Accesso non autorizzato.'}, {status: 403});
  }

  const parsed = createRequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({error: 'Dati richiesta non validi.'}, {status: 400});

  try {
    const admin = createAdminClient();
    const {data: company, error: companyError} = await admin
      .from('companies')
      .upsert({airtable_record_id: parsed.data.airtableRecordId, name: parsed.data.companyName}, {onConflict: 'airtable_record_id'})
      .select('id,name')
      .single();
    if (companyError || !company) throw new Error('Azienda non disponibile.');

    const {data: graphicRequest, error} = await admin
      .from('graphic_requests')
      .insert({
        public_id: createPublicId(),
        company_id: company.id,
        requested_by: profile.id,
        type: parsed.data.type,
        title: parsed.data.title,
        brief: parsed.data.brief,
        credit_cost: parsed.data.creditCost,
      })
      .select('id,public_id,title,brief,type,status,credit_cost,created_at')
      .single();
    if (error || !graphicRequest) throw new Error('Richiesta non creata.');

    const {error: eventError} = await admin.from('request_events').insert({
      request_id: graphicRequest.id,
      actor_id: profile.id,
      event_type: 'created_by_staff',
      internal_note: 'Richiesta inserita manualmente dallo staff.',
    });
    if (eventError) console.error('[Request creation event]', eventError);

    return NextResponse.json({request: {
      id: graphicRequest.id,
      publicId: graphicRequest.public_id,
      companyName: company.name,
      requesterName: profile.full_name || profile.email,
      title: graphicRequest.title,
      brief: graphicRequest.brief,
      type: graphicRequest.type,
      status: graphicRequest.status,
      creditCost: graphicRequest.credit_cost,
      createdAt: graphicRequest.created_at,
    }}, {status: 201});
  } catch (error) {
    console.error('[Request creation]', error);
    return NextResponse.json({error: 'Impossibile creare la richiesta.'}, {status: 502});
  }
}

function createPublicId() {
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `RG-${date}-${suffix}`;
}
