'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Blocks,
  FileLock2,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  Network,
  ScanSearch,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Command Center', icon: LayoutDashboard },
  { href: '/documents', label: 'Secure Documents', icon: FileLock2 },
  { href: '/recipients', label: 'Recipients', icon: Users },
  { href: '/sessions', label: 'Decryption Sessions', icon: Fingerprint },
  { href: '/investigation', label: 'Forensic Investigation', icon: ScanSearch, badge: 'KEY DEMO' },
  { href: '/ledger', label: 'Immutable Ledger', icon: Blocks },
  { href: '/identity', label: 'Cryptographic Identity', icon: KeyRound },
  { href: '/security', label: 'Security Center', icon: ShieldCheck },
  { href: '/architecture', label: 'System Architecture', icon: Network },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function LogoMark() {
  return (
    <div
      aria-hidden
      className="relative grid size-9 place-items-center rounded-md border border-primary/50 bg-primary/10 text-primary shadow-[0_0_12px_rgba(56,189,248,0.2)]"
    >
      <Fingerprint className="size-5" strokeWidth={1.8} />
      <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-background bg-success" />
    </div>
  )
}

function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar select-none">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
        <LogoMark />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-[0.24em] text-sidebar-foreground">TRACELOCK</span>
            <span className="rounded bg-primary/20 px-1 py-0.2 font-mono text-[9px] font-semibold text-primary">SIH26</span>
          </div>
          <p className="text-[10px] leading-tight text-muted-foreground">
            Cryptographic Document Attribution &amp; Immutable Provenance
          </p>
        </div>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-2 px-2.5">
          <p className="font-mono text-[9.5px] font-medium tracking-[0.16em] text-muted-foreground/80 uppercase">
            Platform Navigation
          </p>
        </div>
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon, badge }, i) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[12.5px] font-medium transition-all duration-200',
                    active
                      ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm border border-primary/20'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hover:translate-x-0.5',
                  )}
                >
                  {/* Active highlight bar on left */}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-primary shadow-[0_0_8px_rgba(56,189,248,0.7)]"
                    />
                  )}
                  <span className={cn('w-4 font-mono text-[10px] transition-colors', active ? 'text-primary font-bold' : 'text-muted-foreground/60 group-hover:text-primary/70')}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Icon
                    className={cn(
                      'size-4 shrink-0 transition-all duration-200',
                      active
                        ? 'text-primary scale-110'
                        : 'text-muted-foreground group-hover:text-primary group-hover:scale-105',
                    )}
                    strokeWidth={1.75}
                  />
                  <span className="truncate">{label}</span>
                  {badge && (
                    <span className="ml-auto rounded border border-primary/40 bg-primary/15 px-1.5 py-0.2 font-mono text-[9px] font-semibold tracking-wider text-primary shadow-[0_0_8px_rgba(56,189,248,0.2)]">
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <EnclaveFooter />
    </aside>
  )
}

function EnclaveFooter() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-t border-sidebar-border p-2.5">
      <div className="flex flex-col gap-1.5 rounded-md border border-sidebar-border/80 bg-background/50 p-2.5">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            <span className="font-semibold text-foreground">AIR-GAPPED ENCLAVE</span>
          </div>
          <span className="text-[9px] text-primary">{expanded ? 'COLLAPSE' : 'EXPAND'}</span>
        </button>

        {expanded ? (
          <div className="mt-1 pt-1.5 border-t border-border/40 flex flex-col gap-1 text-[9.5px] font-mono text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground">
              <span className="size-1 rounded-full bg-success" />
              <span>AIR-GAPPED MODE</span>
            </div>
            <div className="flex items-center gap-1.5 text-foreground">
              <span className="size-1 rounded-full bg-success" />
              <span>LOCAL INFRASTRUCTURE</span>
            </div>
            <div className="flex items-center gap-1.5 text-foreground">
              <span className="size-1 rounded-full bg-success" />
              <span>SYSTEM SECURE</span>
            </div>
            <p className="pt-1 text-[9px] text-muted-foreground/80 border-t border-border/30">
              Zero Cloud KMS · Zero Public DLT
            </p>
          </div>
        ) : (
          <p className="text-[9px] font-mono text-muted-foreground truncate">
            Local Enclave · Zero Cloud KMS
          </p>
        )}
      </div>
    </div>
  )
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-13 items-center justify-between gap-4 border-b border-border bg-background/95 px-6 backdrop-blur">
      <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5 rounded border border-border bg-card px-2 py-0.5 text-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          NODE-HQ-01
        </span>
        <span aria-hidden className="text-muted-foreground/60">/</span>
        <span className="hidden sm:inline">Permissioned Ledger · 4 of 4 Validators in Agreement</span>
        <span aria-hidden className="hidden md:inline text-muted-foreground/60">/</span>
        <span className="hidden md:inline text-primary">NIST PQC ML-KEM / ML-DSA</span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/investigation"
          className="hidden lg:inline-flex items-center gap-1.5 rounded border border-primary/50 bg-primary/10 px-2.5 py-1 font-mono text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <ScanSearch className="size-3.5" />
          INVESTIGATE LEAK
        </Link>
        <span className="rounded border border-warning/40 bg-warning/10 px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] text-warning">
          SIH260237 · DEMO
        </span>
        <div className="flex items-center gap-2.5 border-l border-border pl-3">
          <div className="grid size-7.5 place-items-center rounded-md border border-border bg-secondary font-mono text-[11px] font-semibold text-foreground">
            FO
          </div>
          <div className="leading-tight">
            <p className="text-xs font-medium text-foreground">Forensic Officer</p>
            <p className="font-mono text-[10px] text-muted-foreground">OFFLINE-STATION-01</p>
          </div>
        </div>
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-6 py-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
