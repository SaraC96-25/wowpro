'use client';

import Link from 'next/link';
import {useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {
  BadgeEuro,
  ChartNoAxesCombined,
  CreditCard,
  Headphones,
  Home,
  Lightbulb,
  LogOut,
  MessageSquareText,
  PackageCheck,
  UsersRound,
} from 'lucide-react';
import {createClient} from '@/lib/supabase/client';

type ShellMode = 'client' | 'admin';

const clientLinks = [
  {href: '/dashboard', label: 'Dashboard', icon: Home},
  {href: '/dashboard/crediti', label: 'Crediti', icon: CreditCard},
  {href: '/dashboard/richieste', label: 'Richieste grafiche', icon: MessageSquareText, count: 2},
  {href: '/dashboard/ordini', label: 'Ordini', icon: PackageCheck},
  {href: '/dashboard/supporto', label: 'Supporto', icon: Headphones},
  {href: '/dashboard/feedback', label: 'Feedback & idee', icon: Lightbulb},
];

const adminLinks = [
  {href: '/admin', label: 'Panoramica', icon: ChartNoAxesCombined},
  {href: '/admin/clienti', label: 'Clienti', icon: UsersRound},
  {href: '/admin/archivio-clienti', label: 'Archivio clienti', icon: PackageCheck},
  {href: '/admin/richieste', label: 'Richieste', icon: MessageSquareText, count: 4},
  {href: '/admin/crediti', label: 'Crediti', icon: BadgeEuro},
  {href: '/admin/feedback', label: 'Feedback & idee', icon: Lightbulb, count: 3},
];

export function AppShell({mode, children}: {mode: ShellMode; children: React.ReactNode}) {
  const pathname = usePathname();
  const router = useRouter();
  const links = mode === 'admin' ? adminLinks : clientLinks;
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">W</span>
          <span><strong>WOWPRO</strong><small>{mode === 'admin' ? 'back-office · WowStampa' : 'by WowStampa'}</small></span>
        </div>
        {mode === 'admin' ? <div className="internal-pill">PANNELLO INTERNO</div> : null}
        <span className="nav-label">{mode === 'admin' ? 'GESTIONE' : 'PROGRAMMA'}</span>
        <nav className="nav-list">
          {links.map(({href, label, icon: Icon, count}) => {
            const active = href === pathname || (href !== '/admin' && href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link href={href} className={active ? 'nav-link nav-link--active' : 'nav-link'} key={href}>
                <Icon size={18} />
                <span>{label}</span>
                {count ? <b>{count}</b> : null}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-profile">
          <span className="avatar">{mode === 'admin' ? 'OP' : 'SL'}</span>
          <span className="sidebar-profile__copy"><strong>{mode === 'admin' ? 'Operatore WOWPRO' : 'Studio Lombardi'}</strong><small>{mode === 'admin' ? 'Team interno' : 'Piano Business attivo'}</small></span>
          <button
            aria-label="Esci da WOWPRO"
            className="sign-out-button"
            disabled={isSigningOut}
            onClick={signOut}
            title="Esci"
            type="button"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="app-main">{children}</div>
    </div>
  );
}

export function PageHeader({eyebrow, title, action}: {eyebrow: string; title: string; action?: React.ReactNode}) {
  return (
    <header className="page-header">
      <div><span>{eyebrow}</span><h1>{title}</h1></div>
      {action}
    </header>
  );
}
