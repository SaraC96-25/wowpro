import {AppShell} from '@/components/app-shell';
import {requireProfile} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({children}: {children: React.ReactNode}) {
  await requireProfile(['client']);
  return <AppShell mode="client">{children}</AppShell>;
}
