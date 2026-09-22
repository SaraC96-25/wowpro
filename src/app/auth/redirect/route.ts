import {NextResponse} from 'next/server';

import {createClient} from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  const {data: profile} = user ? await supabase.from('profiles').select('role,status').eq('id', user.id).maybeSingle() : {data: null};
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  if (!profile || profile.status !== 'active') return NextResponse.redirect(new URL('/login/admin?error=accesso-negato', origin));
  const destination = profile.role === 'graphic_operator' ? '/operatore' : ['staff', 'admin'].includes(profile.role) ? '/admin' : '/dashboard';
  return NextResponse.redirect(new URL(destination, origin));
}
