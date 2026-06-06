'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderKanban, CheckSquare, Bot, BookOpen, FileText, Settings, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects',  label: 'Projects',  icon: FolderKanban },
  { href: '/tasks',     label: 'Tasks',     icon: CheckSquare },
  { href: '/assets',    label: 'AI Assets', icon: Bot },
  { href: '/decisions', label: 'Decisions', icon: BookOpen },
  { href: '/knowledge', label: 'Knowledge', icon: FileText },
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
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
      <span>{label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="flex h-12 items-center gap-2 border-b border-sidebar-border px-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <span className="text-[13px] font-semibold tracking-tight">PM Platform</span>
      </div>

      {/* Core navigation */}
      <nav className="flex flex-1 flex-col gap-px p-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname.startsWith(item.href)}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-2">
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
