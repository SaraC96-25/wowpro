import {NextResponse} from 'next/server';
import {z} from 'zod';

import {getCurrentProfile} from '@/lib/auth';
import {getWowproClient, updateWowproClient} from '@/lib/integrations/airtable';

const archiveSchema = z.object({confirmationName: z.string().trim().min(1).max(200)});

export async function POST(request: Request, {params}: {params: Promise<{recordId: string}>}) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({error: 'Non autenticato.'}, {status: 401});
  if (!['staff', 'admin'].includes(profile.role) || profile.status !== 'active') {
    return NextResponse.json({error: 'Accesso non autorizzato.'}, {status: 403});
  }

  const parsed = archiveSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({error: 'Conferma non valida.'}, {status: 400});

  try {
    const {recordId} = await params;
    const client = await getWowproClient(recordId);
    const companyName = client.fields.ragione_sociale?.trim() || '';
    if (parsed.data.confirmationName !== companyName) {
      return NextResponse.json({error: 'Il nome azienda non corrisponde.'}, {status: 400});
    }

    const updated = await updateWowproClient(recordId, {archiviato: true});
    return NextResponse.json({fields: updated.fields});
  } catch (error) {
    console.error('[Client archive]', error);
    return NextResponse.json({error: 'Impossibile archiviare il cliente.'}, {status: 502});
  }
}
