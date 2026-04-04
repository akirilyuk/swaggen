'use client';

import {
  Box,
  Code,
  Database,
  FolderOpen,
  Globe,
  Layers,
  LayoutDashboard,
  Link2,
  LogOut,
  Settings,
  User,
  Workflow,
  Layout,
  Bot,
  Waypoints,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuthStore } from '@/store/authStore';
import { useActionLog } from '@/components/designer/ActionLogContext';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/entities', label: 'Entities', icon: Box },
  { href: '/relations', label: 'Relations', icon: Link2 },
  { href: '/middlewares', label: 'Middlewares', icon: Layers },
  { href: '/services', label: 'Services', icon: Workflow },
  { href: '/api-paths', label: 'API Paths', icon: Globe },
  { href: '/pipelines', label: 'Pipelines', icon: Waypoints },
  { href: '/bots', label: 'Bots', icon: Bot },
  { href: '/pages', label: 'Pages', icon: Layout },
  { href: '/editor', label: 'Spec Editor', icon: Code },
  { href: '/storage', label: 'Data Storage', icon: Database },
  { href: '/generate', label: 'Generate', icon: FolderOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);
  const { log } = useActionLog();

  const handleSignOut = async () => {
    log('info', 'Sign out', 'from sidebar');
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Swaggen<span className="text-blue-600">Next</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => log('info', 'Navigate', `${label} → ${href}`)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: user info + actions */}
      <div className="border-t border-zinc-200 px-3 py-4 dark:border-zinc-800">
        <div className="mb-3 space-y-1">
          {user && (
            <p className="truncate px-3 pb-2 text-xs text-zinc-500 dark:text-zinc-400">
              {user.email}
            </p>
          )}
          <Link
            href="/profile"
            onClick={() => log('info', 'Navigate', 'Profile → /profile')}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === '/profile'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
            }`}
          >
            <User size={18} />
            Profile
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
        <p className="px-3 text-xs text-zinc-400">SwaggenNext v0.1.0</p>
      </div>
    </aside>
  );
}
