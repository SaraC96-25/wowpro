import {NextResponse} from 'next/server';

import {getCurrentProfile} from '@/lib/auth';
import {updateWowproClient} from '@/lib/integrations/airtable';

export async function POST(_request: Request, {params}: {params: Promise<{recordId: string}>}) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({error: 'Non autenticato.'}, {status: 401});
  if (!['staff', 'admin'].includes(profile.role) || profile.status !== 'active') {
    return NextResponse.json({error: 'Accesso non autorizzato.'}, {status: 403});
  }

  try {
    const {recordId} = await params;
    const updated = await updateWowproClient(recordId, {archiviato: false});
    return NextResponse.json({fields: updated.fields});
  } catch (error) {
    console.error('[Client restore]', error);
    return NextResponse.json({error: 'Impossibile ripristinare il cliente.'}, {status: 502});
  }
}
