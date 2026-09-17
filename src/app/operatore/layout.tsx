import {AppShell} from '@/components/app-shell';
import {requireProfile} from '@/lib/auth';
import {createAdminClient} from '@/lib/supabase/admin.server';

export const dynamic = 'force-dynamic';

export default async function GraphicOperatorLayout({children}: {children: React.ReactNode}) {
  const profile = await requireProfile(['graphic_operator']);
  const {count} = await createAdminClient()
    .from('graphic_requests')
    .select('*', {count: 'exact', head: true})
    .eq('assigned_to', profile.id)
    .in('status', ['new', 'in_progress']);
  return <AppShell mode="graphic" notificationCounts={{requests: count || 0, feedback: 0}} operatorName={profile.full_name || profile.email}>{children}</AppShell>;
}
