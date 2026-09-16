import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const {error} = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {data: {user}} = await supabase.auth.getUser();
      const {data: profile} = user
        ? await supabase.from('profiles').select('role,status').eq('id', user.id).single()
        : {data: null};

      if (profile?.status === 'active') {
        const destination = ['staff', 'admin'].includes(profile.role) ? '/admin' : next;
        return NextResponse.redirect(new URL(destination, url.origin));
      }
    }
  }

  return NextResponse.redirect(new URL('/login?error=link-non-valido', url.origin));
}
