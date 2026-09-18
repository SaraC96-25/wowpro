import {AppShell} from '@/components/app-shell';
import {requireProfile} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({children}: {children: React.ReactNode}) {
  const profile = await requireProfile(['client']);
  const supabase = await createClient();
  const [{data: company}, {count}] = await Promise.all([
    supabase.from('companies').select('name').eq('id', profile.company_id || '').maybeSingle(),
    supabase.from('graphic_requests').select('*', {count: 'exact', head: true}).in('status', ['new', 'in_progress']),
  ]);
  return <AppShell mode="client" notificationCounts={{requests: count || 0, feedback: 0}} operatorName={company?.name || profile.full_name || profile.email}>{children}</AppShell>;
}
