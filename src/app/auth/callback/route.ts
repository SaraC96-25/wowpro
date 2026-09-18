import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

function getAppOrigin(requestUrl: URL) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) return new URL(configuredUrl).origin;
  return requestUrl.origin;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appOrigin = getAppOrigin(url);
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next');
  const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/dashboard/home';

  if (code) {
    const supabase = await createClient();
    const {error} = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {data: {user}} = await supabase.auth.getUser();
      const {data: profile} = user
        ? await supabase.from('profiles').select('role,status').eq('id', user.id).single()
        : {data: null};

      if (profile?.status === 'active') {
        const destination = profile.role === 'graphic_operator' ? '/operatore' : ['staff', 'admin'].includes(profile.role) ? '/admin' : next;
        return NextResponse.redirect(new URL(destination, appOrigin));
      }
    }
  }

  return NextResponse.redirect(new URL('/login?error=link-non-valido', appOrigin));
}
