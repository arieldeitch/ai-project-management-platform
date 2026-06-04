'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderKanban, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects',  label: 'Projects',  icon: FolderKanban },
]

const BOTTOM_ITEMS = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
          <span className="text-xs font-bold">AI</span>
        </div>
        <span className="text-sm font-semibold tracking-tight">PM Platform</span>
      </div>

      {/* Core navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3">
        {BOTTOM_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname === item.href}
          />
        ))}
      </div>
    </aside>
  )
}
