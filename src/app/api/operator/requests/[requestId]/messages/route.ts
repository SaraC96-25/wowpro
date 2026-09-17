import {NextResponse} from 'next/server';
import {z} from 'zod';

import {getCurrentProfile} from '@/lib/auth';
import {createAdminClient} from '@/lib/supabase/admin.server';

const messageSchema = z.object({message: z.string().trim().min(1).max(2_000)});

export async function POST(request: Request, {params}: {params: Promise<{requestId: string}>}) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({error: 'Non autenticato.'}, {status: 401});
  if (profile.role !== 'graphic_operator' || profile.status !== 'active') return NextResponse.json({error: 'Accesso non autorizzato.'}, {status: 403});
  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({error: 'Messaggio non valido.'}, {status: 400});
  try {
    const {requestId} = await params;
    const admin = createAdminClient();
    const {data: assignedRequest, error: assignmentError} = await admin.from('graphic_requests').select('id').eq('id', requestId).eq('assigned_to', profile.id).single();
    if (assignmentError || !assignedRequest) return NextResponse.json({error: 'Richiesta non assegnata a questo operatore.'}, {status: 403});
    const {data: message, error} = await admin.from('request_messages').insert({request_id: requestId, author_id: profile.id, body: parsed.data.message, customer_visible: true}).select('id,body,created_at').single();
    if (error || !message) throw new Error('Messaggio non creato.');
    await admin.from('graphic_requests').update({awaiting_client_response: true, updated_at: new Date().toISOString()}).eq('id', requestId);
    return NextResponse.json({message});
  } catch (error) { console.error('[Graphic message]', error); return NextResponse.json({error: 'Impossibile inviare il messaggio.'}, {status: 502}); }
}
