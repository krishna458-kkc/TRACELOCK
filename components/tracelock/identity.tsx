'use client'

import { useState } from 'react'
import { ChevronRight, Key, KeyRound, Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import { ALGORITHMS, LEDGER_NODES, type Recipient } from '@/lib/data'
import { formatDate, formatTs, truncateHash } from '@/lib/format'
import { useTracelock } from '@/lib/store'
import { BhaveshCard, DataTable, GlassBlobCard, Mono, PageHeader, Panel, ShinyText, StatusBadge, Td, Th, TraceButton } from './primitives'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const SYSTEM_KEYS = [
  { id: 'TL-ROOT-CA', purpose: 'Root Authority · Prototype Key Vault', algorithm: ALGORITHMS.signature, status: 'OPERATIONAL' },
  { id: 'TL-ENC-SVC', purpose: 'Broadcast Key Encapsulation Service', algorithm: ALGORITHMS.kem, status: 'OPERATIONAL' },
  ...LEDGER_NODES.map((n) => ({
    id: n.id,
    purpose: `Ledger Validator Identity · ${n.site}`,
    algorithm: ALGORITHMS.signature,
    status: 'ACTIVE',
  })),
]

export function IdentityView() {
  const { recipients, sessions } = useTracelock()
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)

  const activeCount = recipients.filter((r) => r.identity === 'ACTIVE').length
  const revokedCount = recipients.filter((r) => r.identity === 'REVOKED').length

  const signedDecryptions = selectedRecipient
    ? sessions.filter((s) => s.recipientId === selectedRecipient.id).length
    : 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Cryptographic Identity"
        title="Post-Quantum Identity Registry"
        description="Public verification keys for ML-DSA-65 and encapsulation targets for ML-KEM-768. Private signing keys are sealed within the prototype key vault."
      />

      {/* Primary Key Architecture Notice using BhaveshCard */}
      <BhaveshCard tone="neon" className="p-0" innerClassName="p-3.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2.5">
          <div className="grid size-7 place-items-center rounded border border-primary/40 bg-primary/10 text-primary">
            <Key className="size-4" />
          </div>
          <div>
            <span className="font-bold text-foreground">KEY ARCHITECTURE: </span>
            <span className="text-muted-foreground">
              PROTOTYPE KEY VAULT (Local secure storage isolating NIST FIPS 203/204 keys)
            </span>
          </div>
        </div>
        <span className="rounded border border-success/40 bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success shadow-[0_0_12px_rgba(34,197,94,0.2)]">
          <ShinyText text="ZERO PRIVATE KEYS EXPOSED OVER API" className="text-success" />
        </span>
      </BhaveshCard>

      {/* Summary Metrics using GlassBlobCard (Card Style B) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassBlobCard tone="emerald" className="p-3.5">
          <p className="label-caps">Active Identities</p>
          <p className="mt-1 font-mono text-2xl font-bold text-success">{activeCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Verified public keys</p>
        </GlassBlobCard>

        <GlassBlobCard tone="ruby" className="p-3.5">
          <p className="label-caps">Revoked Identities</p>
          <p className="mt-1 font-mono text-2xl font-bold text-destructive">{revokedCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Revocation committed to DLT</p>
        </GlassBlobCard>

        <GlassBlobCard tone="cyan" className="p-3.5">
          <p className="label-caps">Signing Primitive</p>
          <p className="mt-1 font-mono text-sm font-bold text-primary">{ALGORITHMS.signature}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">NIST FIPS 204 Lattice</p>
        </GlassBlobCard>

        <GlassBlobCard tone="cyan" className="p-3.5">
          <p className="label-caps">KEM Primitive</p>
          <p className="mt-1 font-mono text-sm font-bold text-primary">{ALGORITHMS.kem}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">NIST FIPS 203 Lattice</p>
        </GlassBlobCard>
      </div>

      {/* Main Table: Recipient Key Registry */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Panel
          title="Recipient Public Key Registry"
          description="Click any recipient to inspect public keys and token bindings."
          bodyClassName="p-0"
        >
          <DataTable>
            <thead>
              <tr>
                <Th>Recipient</Th>
                <Th>Key Fingerprint</Th>
                <Th>Algorithm</Th>
                <Th>Key Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedRecipient(r)}
                  className="cursor-pointer transition-colors hover:bg-secondary/40"
                >
                  <Td>
                    <p className="font-semibold text-foreground text-xs">{r.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{r.id}</p>
                  </Td>
                  <Td>
                    <Mono className="text-muted-foreground text-xs">{truncateHash(r.fingerprint, 8, 6)}</Mono>
                  </Td>
                  <Td>
                    <Mono className="text-[11px] text-primary">{ALGORITHMS.signature}</Mono>
                  </Td>
                  <Td>
                    <StatusBadge tone={r.identity === 'REVOKED' ? 'danger' : 'success'}>
                      {r.identity}
                    </StatusBadge>
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedRecipient(r)
                      }}
                      className="font-mono text-[11px] text-muted-foreground hover:text-primary underline"
                    >
                      Audit
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>

        {/* System Keys */}
        <Panel
          title="System & Enclave Validator Keys"
          description="Internal root and consensus signing credentials."
          bodyClassName="p-0"
        >
          <DataTable>
            <thead>
              <tr>
                <Th>System Entity</Th>
                <Th>Purpose</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {SYSTEM_KEYS.map((sk) => (
                <tr key={sk.id} className="hover:bg-secondary/40 transition-colors">
                  <Td>
                    <span className="font-mono text-xs font-semibold text-foreground">{sk.id}</span>
                  </Td>
                  <Td>
                    <p className="text-xs text-muted-foreground">{sk.purpose}</p>
                    <p className="font-mono text-[10px] text-primary">{sk.algorithm}</p>
                  </Td>
                  <Td>
                    <StatusBadge tone="success" className="text-[9.5px]">{sk.status}</StatusBadge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>
      </div>

      {/* Recipient Identity Drawer */}
      <Sheet open={!!selectedRecipient} onOpenChange={(open) => !open && setSelectedRecipient(null)}>
        <SheetContent className="border-border bg-card sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-mono text-sm font-bold tracking-wider">
              CRYPTOGRAPHIC IDENTITY AUDIT
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Public verification key and token binding for {selectedRecipient?.id}
            </SheetDescription>
          </SheetHeader>

          {selectedRecipient && (
            <div className="mt-6 flex flex-col gap-4 text-xs">
              <div className="rounded-md border border-border/80 bg-background/60 p-3">
                <p className="label-caps">Identity Holder</p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">{selectedRecipient.name}</p>
                <p className="text-[11px] text-muted-foreground">{selectedRecipient.role} · {selectedRecipient.organization}</p>
              </div>

              <div className="rounded-md border border-border/80 bg-background/60 p-3">
                <p className="label-caps">Storage Mechanism</p>
                <p className="mt-1 font-mono text-xs font-semibold text-foreground">Prototype Key Vault</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Device ID: {selectedRecipient.device || 'VAULT-047'} (Software-enclave isolated)
                </p>
              </div>

              <div className="rounded-md border border-border/80 bg-background/60 p-3">
                <p className="label-caps">ML-DSA-65 Public Key Fingerprint (SHA3-256)</p>
                <p className="mt-1 font-mono text-[10.5px] break-all text-primary">{selectedRecipient.fingerprint}</p>
              </div>

              <div className="rounded-md border border-border/80 bg-background/60 p-3">
                <p className="label-caps">Full NIST FIPS 204 Public Key (Hex)</p>
                <div className="mt-1.5 max-h-32 overflow-y-auto rounded bg-background p-2 border border-border/50">
                  <p className="font-mono text-[9.5px] break-all text-muted-foreground leading-relaxed">
                    {selectedRecipient.publicKey || '7097ff8381b56a4612b906cc0c4f2a3fffe1a8e1b316240dfb129827a62619f5...'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-md border border-border/80 bg-background/60 p-2.5">
                  <span className="text-muted-foreground">Issued Date</span>
                  <p className="font-mono text-foreground font-semibold mt-0.5">{formatDate(selectedRecipient.keyIssued)}</p>
                </div>
                <div className="rounded-md border border-border/80 bg-background/60 p-2.5">
                  <span className="text-muted-foreground">Signed Events</span>
                  <p className="font-mono text-primary font-semibold mt-0.5">{signedDecryptions} Decryptions</p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
