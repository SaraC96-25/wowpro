import {NextResponse} from 'next/server';

import {getCurrentProfile} from '@/lib/auth';
import {createAdminClient} from '@/lib/supabase/admin.server';

export async function POST(_request: Request, {params}: {params: Promise<{requestId: string}>}) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({error: 'Non autenticato.'}, {status: 401});
  if (profile.role !== 'graphic_operator' || profile.status !== 'active') return NextResponse.json({error: 'Accesso non autorizzato.'}, {status: 403});
  const {requestId} = await params;
  const {data, error} = await createAdminClient().from('graphic_requests').update({awaiting_client_response: false, updated_at: new Date().toISOString()}).eq('id', requestId).eq('assigned_to', profile.id).select('id').single();
  if (error || !data) return NextResponse.json({error: 'Richiesta non assegnata a questo operatore.'}, {status: 403});
  return NextResponse.json({ok: true});
}
