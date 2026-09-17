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

type ShellMode = 'client' | 'admin' | 'graphic';

type NavigationLink = {
  href: string;
  label: string;
  icon: typeof Home;
  count?: number;
  children?: Array<{href: string; label: string; icon: typeof Home}>;
};

const clientLinks: NavigationLink[] = [
  {href: '/dashboard', label: 'Dashboard', icon: Home},
  {href: '/dashboard/crediti', label: 'Crediti', icon: CreditCard},
  {href: '/dashboard/richieste', label: 'Richieste grafiche', icon: MessageSquareText, count: 2},
  {href: '/dashboard/ordini', label: 'Ordini', icon: PackageCheck},
  {href: '/dashboard/supporto', label: 'Supporto', icon: Headphones},
  {href: '/dashboard/feedback', label: 'Feedback & idee', icon: Lightbulb},
];

const graphicLinks: NavigationLink[] = [
  {href: '/operatore', label: 'Panoramica', icon: ChartNoAxesCombined},
  {href: '/operatore/richieste', label: 'Richieste', icon: MessageSquareText},
];

function getAdminLinks(notificationCounts: AdminNotificationCounts): NavigationLink[] {
  return [
  {href: '/admin', label: 'Panoramica', icon: ChartNoAxesCombined},
  {href: '/admin/clienti', label: 'Clienti', icon: UsersRound, children: [{href: '/admin/archivio-clienti', label: 'Archivio clienti', icon: PackageCheck}]},
  {href: '/admin/richieste', label: 'Richieste', icon: MessageSquareText, count: notificationCounts.requests || undefined},
  {href: '/admin/crediti', label: 'Crediti', icon: BadgeEuro},
  {href: '/admin/feedback', label: 'Feedback & idee', icon: Lightbulb, count: notificationCounts.feedback || undefined},
  ];
}

export type AdminNotificationCounts = {requests: number; feedback: number};

export function AppShell({mode, children, notificationCounts = {requests: 0, feedback: 0}, operatorName}: {mode: ShellMode; children: React.ReactNode; notificationCounts?: AdminNotificationCounts; operatorName?: string}) {
  const pathname = usePathname();
  const router = useRouter();
  const links = mode === 'admin' ? getAdminLinks(notificationCounts) : mode === 'graphic' ? graphicLinks.map((link) => link.href === '/operatore/richieste' ? {...link, count: notificationCounts.requests || undefined} : link) : clientLinks;
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
          <span><strong>WOWPRO</strong><small>{mode === 'admin' ? 'back-office · WowStampa' : mode === 'graphic' ? 'operatore grafico · WowStampa' : 'by WowStampa'}</small></span>
        </div>
        {mode === 'admin' ? <div className="internal-pill">PANNELLO INTERNO</div> : mode === 'graphic' ? <div className="internal-pill">ACCESSO OPERATORE GRAFICO</div> : null}
        <span className="nav-label">{mode === 'admin' || mode === 'graphic' ? 'GESTIONE' : 'PROGRAMMA'}</span>
        <nav className="nav-list">
          {links.map(({href, label, icon: Icon, count, children}) => {
            const childIsActive = children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
            const active = Boolean(childIsActive) || href === pathname || (href !== '/admin' && href !== '/dashboard' && pathname.startsWith(href));
            return (
              <div className="nav-group" key={href}>
                <Link href={href} className={active ? 'nav-link nav-link--active' : 'nav-link'}>
                  <Icon size={18} />
                  <span>{label}</span>
                  {count ? <b>{count}</b> : null}
                </Link>
                {children ? <div className="nav-sublist">{children.map(({href: childHref, label: childLabel, icon: ChildIcon}) => {
                  const childActive = pathname === childHref || pathname.startsWith(`${childHref}/`);
                  return <Link className={childActive ? 'nav-sublink nav-sublink--active' : 'nav-sublink'} href={childHref} key={childHref}><ChildIcon size={14} /><span>{childLabel}</span></Link>;
                })}</div> : null}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-profile">
          <span className="avatar">{mode === 'admin' ? 'OP' : mode === 'graphic' ? initials(operatorName || 'Operatore Grafico') : 'SL'}</span>
          <span className="sidebar-profile__copy"><strong>{mode === 'admin' ? 'Operatore WOWPRO' : mode === 'graphic' ? operatorName || 'Operatore Grafico' : 'Studio Lombardi'}</strong><small>{mode === 'admin' ? 'Team commerciale' : mode === 'graphic' ? 'Operatore grafico' : 'Piano Business attivo'}</small></span>
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

function initials(value: string) { return value.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }

export function PageHeader({eyebrow, title, action}: {eyebrow: string; title: string; action?: React.ReactNode}) {
  return (
    <header className="page-header">
      <div><span>{eyebrow}</span><h1>{title}</h1></div>
      {action}
    </header>
  );
}
