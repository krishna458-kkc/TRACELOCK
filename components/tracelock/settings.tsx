import { Lock, ShieldCheck, KeyRound, Database, Sliders } from 'lucide-react'
import { ALGORITHMS, LEDGER_NODES } from '@/lib/data'
import { Field, Mono, PageHeader, Panel, StatusBadge } from './primitives'

const GROUPS = [
  {
    title: 'Cryptography',
    icon: KeyRound,
    items: [
      ['Key encapsulation', `${ALGORITHMS.kem} · ${ALGORITHMS.kemStandard}`],
      ['Signature scheme', `${ALGORITHMS.signature} · ${ALGORITHMS.signatureStandard}`],
      ['Hash function', ALGORITHMS.hash],
      ['Content cipher', ALGORITHMS.symmetric],
      ['Key rotation interval', '90 days'],
    ],
  },
  {
    title: 'Forensic Watermarking',
    icon: ShieldCheck,
    items: [
      ['Scheme', ALGORITHMS.watermark],
      ['Payload size', '128 bits + 32-bit CRC'],
      ['Detection threshold', 'correlation ≥ 0.92'],
      ['Survives', 'print, scan, photo, recompression'],
    ],
  },
  {
    title: 'Ledger Consensus',
    icon: Database,
    items: [
      ['Validators', '4 logical permissioned validator identities'],
      ['Commit quorum', '3 of 4 signatures'],
      ['Network', 'Offline enclave segment'],
      ['Retention', 'Permanent, append-only'],
    ],
  },
  {
    title: 'Session Policy',
    icon: Sliders,
    items: [
      ['Viewer session timeout', '15 minutes idle'],
      ['Concurrent sessions per recipient', '1'],
      ['Offline viewing', 'Not permitted'],
      ['Clearance enforcement', 'Strict, per classification'],
    ],
  },
]

export function SettingsView() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Settings"
        title="System configuration"
        description="Configuration is sealed by the security officer and every change is recorded on the ledger. Values are shown read-only in this console."
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs text-primary font-semibold">
              <Lock className="size-3.5" /> ENCLAVE SEALED
            </span>
          </div>
        }
      />

      {/* Enclave Sealed Policy Banner */}
      <div className="rounded-lg border border-border/80 bg-card/60 p-3.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-4 text-primary" />
          <span className="font-bold text-foreground">TAMPER POLICY:</span>
          <span className="text-muted-foreground">
            Configuration parameters are cryptographically signed at boot. Any runtime alteration triggers enclave emergency lock.
          </span>
        </div>
        <span className="text-[11px] font-semibold text-success">
          SEALED SPECIFICATION ACTIVE
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {GROUPS.map((g) => {
          const Icon = g.icon
          return (
            <Panel
              key={g.title}
              title={g.title}
              actions={
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Icon className="size-3.5" />
                  <span className="font-mono text-[10px] uppercase tracking-wider">READ ONLY</span>
                </div>
              }
            >
              <dl className="grid gap-3 sm:grid-cols-2">
                {g.items.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-border/60 bg-background/50 p-2.5 transition-colors hover:border-primary/40 hover:bg-background/80"
                  >
                    <dt className="label-caps">{label}</dt>
                    <dd className="mt-1 font-mono text-xs font-semibold text-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
