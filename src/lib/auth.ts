import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

export type AppRole = 'client' | 'staff' | 'admin';

export type CurrentProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  company_id: string | null;
  status: 'invited' | 'active' | 'suspended' | 'revoked';
};

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return null;

  const {data: profile} = await supabase
    .from('profiles')
    .select('id,email,full_name,role,company_id,status')
    .eq('id', user.id)
    .single<CurrentProfile>();

  return profile;
}

export async function requireProfile(allowedRoles?: AppRole[]) {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== 'active') redirect('/accesso-negato');
  if (allowedRoles && !allowedRoles.includes(profile.role)) redirect('/accesso-negato');
  return profile;
}
