import {AppShell} from '@/components/app-shell';
import {requireProfile} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({children}: {children: React.ReactNode}) {
  await requireProfile(['staff', 'admin']);
  return <AppShell mode="admin">{children}</AppShell>;
}
