interface TopBarProps {
  title: string
  actions?: React.ReactNode
}

export function TopBar({ title, actions }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="text-sm font-semibold text-foreground">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
