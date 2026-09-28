'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronRight, Lock, Shield, ShieldCheck, Terminal } from 'lucide-react'
import { ALGORITHMS, LEDGER_NODES } from '@/lib/data'
import { formatTs } from '@/lib/format'
import { useTracelock } from '@/lib/store'
import { DataTable, Mono, PageHeader, Panel, StatusBadge, StatusDot, Td, Th, TraceButton } from './primitives'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface PillarData {
  id: string
  title: string
  status: string
  facts: string[]
  details: { label: string; value: string }[]
}

const PILLARS: PillarData[] = [
  {
    id: 'crypto',
    title: 'CRYPTOGRAPHIC SECURITY',
    status: 'OPERATIONAL',
    facts: [
      'NIST FIPS 203 ML-KEM-768 broadcast encapsulation',
      'NIST FIPS 204 ML-DSA-65 post-quantum signing',
      'AES-256-GCM authenticated symmetric encryption',
    ],
    details: [
      { label: 'Key Encapsulation Mechanism', value: 'ML-KEM-768 (Round 4 FIPS 203)' },
      { label: 'Digital Signature Scheme', value: 'ML-DSA-65 (Lattice-Based Dilithium FIPS 204)' },
      { label: 'Symmetric Cipher', value: 'AES-256-GCM (Authenticated Payload Encryption)' },
      { label: 'Key Storage Mechanism', value: 'Prototype Key Vault (Local Encrypted Key Ring)' },
      { label: 'Quantum Resistance', value: 'Shor & Grover Attack Resilient (NIST Security Level 3)' },
    ],
  },
  {
    id: 'forensic',
    title: 'FORENSIC SECURITY',
    status: 'ACTIVE',
    facts: [
      'Imperceptible session-bound multi-layer watermark',
      'Spread-spectrum modulation & PDF dictionary injection',
      'Survives recompression, print-scan, and cropping',
    ],
    details: [
      { label: 'Watermark Modulation', value: 'Spread-Spectrum Orthogonal Sequences' },
      { label: 'Carrier Channels', value: 'PDF Metadata Dictionary + Micro-Geometric Spacing' },
      { label: 'Detection Threshold', value: 'Normalized Cross-Correlation ≥ 0.92' },
      { label: 'Attribution Collision Rate', value: 'Zero Collisions Across Issued Copies' },
      { label: 'Verification Protocol', value: 'Air-Gapped Enclave Cross-Correlation Filter' },
    ],
  },
  {
    id: 'ledger',
    title: 'LEDGER SECURITY',
    status: 'SYNCHRONIZED',
    facts: [
      'SHA3-256 continuous hash-linked chain',
      '4 logical permissioned validator identities',
      'Zero cryptocurrency, zero gas, air-gapped consensus',
    ],
    details: [
      { label: 'Chain Link Algorithm', value: 'SHA3-256 (Keccak-f[1600])' },
      { label: 'Consensus Identities', value: '4 Logical Permissioned Validator Identities' },
      { label: 'Immutability Guarantee', value: 'Altered block invalidates all downstream hash pointers' },
      { label: 'Network Surface', value: 'Zero External Ports · Pure Local Enclave Storage' },
      { label: 'Ledger Audit Command', value: 'Real-Time Continuous Tip Verification' },
    ],
  },
  {
    id: 'deployment',
    title: 'DEPLOYMENT SECURITY',
    status: 'AIR-GAPPED',
    facts: [
      'Galvanically isolated local infrastructure',
      'Zero external network ingress/egress points',
      'No cloud KMS or public blockchain dependencies',
    ],
    details: [
      { label: 'Network Boundary', value: 'Complete Air-Gap Isolation (127.0.0.1 Localhost Only)' },
      { label: 'Cloud Key Management', value: 'Disabled (No AWS KMS, GCP KMS, or Azure KeyVault)' },
      { label: 'Public Blockchain Access', value: 'Disabled (No Ethereum, Solana, or Public Mempools)' },
      { label: 'Hardware Enclave Path', value: 'Designed for Hardware HSM & Secure Enclaves in Production' },
      { label: 'Current Prototype Status', value: 'Software-Isolated Enclave with Local Prototype Vault' },
    ],
  },
]

const ALERTS = [
  { ts: '2026-09-28T16:21:20Z', event: 'Forensic watermark embedded & signed: SES-8F29A1', actor: 'RECIPIENT-047', severity: 'INFO' },
  { ts: '2026-09-27T22:41:08Z', event: 'Decryption denied: identity revoked in local registry', actor: 'RECIPIENT-071', severity: 'HIGH' },
  { ts: '2026-09-26T09:12:55Z', event: 'Session signature re-verified by validator node', actor: 'NODE-HQ-02', severity: 'INFO' },
  { ts: '2026-09-24T16:03:31Z', event: 'Access outside classification scope rejected', actor: 'RECIPIENT-064', severity: 'MEDIUM' },
]

export function SecurityView() {
  const { recipients, ledger } = useTracelock()
  const [selectedPillar, setSelectedPillar] = useState<PillarData | null>(null)

  const revoked = recipients.filter((r) => r.identity === 'REVOKED').length
  const tip = ledger[ledger.length - 1]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Security Center"
        title="Enclave Posture & Security Architecture"
        description="Core technical audit of post-quantum cryptography, forensic watermark persistence, offline ledger integrity, and air-gapped containment."
        actions={
          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs">
            <StatusDot pulse tone="success" />
            <span>AIR-GAPPED · ENCLAVE ISOLATED</span>
          </div>
        }
      />

      {/* 4 Compact Architecture Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-center">
          <p className="font-mono text-xs font-bold text-primary">AIR-GAPPED MODE</p>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">Isolated enclave boundary</p>
        </div>
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-center">
          <p className="font-mono text-xs font-bold text-primary">LOCAL INFRASTRUCTURE</p>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">Zero external ingress</p>
        </div>
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-center">
          <p className="font-mono text-xs font-bold text-primary">NO CLOUD KMS</p>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">Prototype Key Vault</p>
        </div>
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-center">
          <p className="font-mono text-xs font-bold text-primary">NO PUBLIC DLT</p>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">4 Permissioned identities</p>
        </div>
      </div>

      {/* 4 Compact Security Pillars */}
      <div className="grid gap-4 md:grid-cols-2">
        {PILLARS.map((p) => (
          <div
            key={p.id}
            className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-primary/40"
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="font-mono text-xs font-bold text-foreground tracking-wide">
                  {p.title}
                </span>
                <StatusBadge tone="success" className="text-[9.5px]">
                  {p.status}
                </StatusBadge>
              </div>

              <ul className="mt-3 flex flex-col gap-2">
                {p.facts.map((fact, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex justify-end">
              <TraceButton
                variant="outline"
                size="sm"
                className="gap-1 font-mono text-[11px]"
                onClick={() => setSelectedPillar(p)}
              >
                AUDIT SPECIFICATION <ChevronRight className="size-3" />
              </TraceButton>
            </div>
          </div>
        ))}
      </div>

      {/* Security Alerts Table */}
      <Panel
        title="Security Audit Log"
        description="Real-time security events captured across cryptographic and ledger subsystems."
        bodyClassName="p-0"
      >
        <DataTable>
          <thead>
            <tr>
              <Th>Timestamp</Th>
              <Th>Severity</Th>
              <Th>Subsystem Event</Th>
              <Th>Originating Actor</Th>
            </tr>
          </thead>
          <tbody>
            {ALERTS.map((alert, i) => (
              <tr key={i} className="transition-colors hover:bg-secondary/40">
                <Td>
                  <Mono className="text-muted-foreground text-xs">{formatTs(alert.ts)}</Mono>
                </Td>
                <Td>
                  <StatusBadge
                    tone={alert.severity === 'HIGH' ? 'danger' : alert.severity === 'MEDIUM' ? 'warning' : 'info'}
                    className="text-[9.5px]"
                  >
                    {alert.severity}
                  </StatusBadge>
                </Td>
                <Td className="text-xs text-foreground font-medium">{alert.event}</Td>
                <Td>
                  <Mono className="text-primary text-xs">{alert.actor}</Mono>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>

      {/* Pillar Detail Dialog */}
      <Dialog open={!!selectedPillar} onOpenChange={(open) => !open && setSelectedPillar(null)}>
        <DialogContent className="sm:max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm font-bold tracking-wider">
              {selectedPillar?.title} AUDIT SPECIFICATION
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Technical parameters and verification criteria enforced in the TRACELOCK enclave.
            </DialogDescription>
          </DialogHeader>

          {selectedPillar && (
            <div className="mt-4 flex flex-col gap-2.5 text-xs">
              {selectedPillar.details.map((d, i) => (
                <div key={i} className="rounded-md border border-border/70 bg-background/50 p-2.5">
                  <p className="label-caps">{d.label}</p>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">{d.value}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
