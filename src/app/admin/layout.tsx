import {AppShell} from '@/components/app-shell';
import {requireProfile} from '@/lib/auth';
import {createAdminClient} from '@/lib/supabase/admin.server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({children}: {children: React.ReactNode}) {
  await requireProfile(['staff', 'admin']);
  const admin = createAdminClient();
  const [{count: requestCount}, {count: feedbackCount}] = await Promise.all([
    admin.from('graphic_requests').select('*', {count: 'exact', head: true}).eq('status', 'new'),
    admin.from('feedback').select('*', {count: 'exact', head: true}).eq('status', 'new'),
  ]);
  return <AppShell mode="admin" notificationCounts={{requests: requestCount || 0, feedback: feedbackCount || 0}}>{children}</AppShell>;
}
