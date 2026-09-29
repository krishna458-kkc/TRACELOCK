'use client'

import { ArrowDown, ArrowRight, CheckCircle2, Cpu, Database, Eye, FileText, Key, Lock, Network, ShieldCheck } from 'lucide-react'
import { ALGORITHMS, LEDGER_NODES } from '@/lib/data'
import { cn } from '@/lib/utils'
import { DataTable, Mono, PageHeader, Panel, StatusBadge, Td, Th } from './primitives'

const MAIN_PATH = [
  { step: '01', name: 'DOCUMENT SOURCE', spec: 'SHA3-256 Digest', desc: 'Ingested & digested in secure enclave' },
  { step: '02', name: 'ENCRYPTION', spec: 'ML-KEM-768 + AES-GCM', desc: 'Broadcast-encrypted content key' },
  { step: '03', name: 'AUTHORIZATION', spec: 'Policy Engine', desc: 'Verified clearance & recipient token' },
  { step: '04', name: 'DECRYPTION', spec: 'Device Memory', desc: 'Decapsulated key unlocks plaintext' },
  { step: '05', name: 'WATERMARKING', spec: 'Spread-Spectrum', desc: 'Embeds imperceptible session payload' },
  { step: '06', name: 'PQC SIGNING', spec: 'ML-DSA-65', desc: 'Recipient signs decryption event' },
  { step: '07', name: 'IMMUTABLE DLT', spec: '4 Validator Nodes', desc: 'Committed to append-only chain' },
]

const INVESTIGATION_PATH = [
  { step: '01', name: 'LEAKED DOCUMENT', spec: 'Enclave Sandbox', desc: 'Exfiltrated copy ingested read-only' },
  { step: '02', name: 'WATERMARK EXTRACTION', spec: 'Cross-Correlation', desc: 'Recovers hidden session payload' },
  { step: '03', name: 'LEDGER LOOKUP', spec: 'Block Link Search', desc: 'Matches watermark to block record' },
  { step: '04', name: 'SIGNATURE AUDIT', spec: 'ML-DSA-65 Verification', desc: 'Validates recipient public key' },
  { step: '05', name: 'ATTRIBUTION', spec: 'Definitive Identity', desc: 'Unambiguous recipient attribution' },
]

const PRIMITIVES = [
  { primitive: 'Key Encapsulation', algorithm: ALGORITHMS.kem, standard: ALGORITHMS.kemStandard, use: 'Broadcast-encrypted document keys' },
  { primitive: 'Digital Signature', algorithm: ALGORITHMS.signature, standard: ALGORITHMS.signatureStandard, use: 'Decryption event non-repudiation' },
  { primitive: 'Symmetric Cipher', algorithm: ALGORITHMS.symmetric, standard: 'FIPS 197 / SP 800-38D', use: 'High-throughput payload encryption' },
  { primitive: 'Cryptographic Hash', algorithm: ALGORITHMS.hash, standard: 'FIPS 202', use: 'Document digest & ledger chain hashing' },
  { primitive: 'Forensic Watermark', algorithm: ALGORITHMS.watermark, standard: 'Multi-Layer Stego', use: 'Session-specific imperceptible payload' },
]

import { useState } from 'react'

export function ArchitectureView() {
  const [hoveredMain, setHoveredMain] = useState<number | null>(null)
  const [hoveredForensic, setHoveredForensic] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="System Architecture"
        title="Cryptographic & Forensic Dataflow"
        description="Dual-path visual pipeline: Secure broadcast distribution to recipients, and reverse watermark extraction to legal attribution."
      />

      {/* Main Path: Distribution & Decryption */}
      <Panel
        title="Main Operational Path: Secure Distribution & Decryption"
        description="Sequential pipeline executed upon every authorized document request."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-2">
          {MAIN_PATH.map((p, i) => {
            const isHovered = hoveredMain === i
            const isConnected = hoveredMain !== null && i <= hoveredMain
            return (
              <div
                key={p.step}
                className="flex flex-col xl:flex-row items-center gap-2"
                onMouseEnter={() => setHoveredMain(i)}
                onMouseLeave={() => setHoveredMain(null)}
              >
                <div
                  className={cn(
                    'w-full flex-1 rounded-md border p-3 transition-all duration-200 cursor-pointer select-none',
                    isHovered
                      ? 'border-primary/80 bg-primary/15 shadow-[0_0_15px_rgba(56,189,248,0.2)] scale-[1.02]'
                      : isConnected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/80 bg-background/60 hover:border-primary/40',
                  )}
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className={cn('font-mono text-[10px] font-bold', isHovered ? 'text-primary' : 'text-primary/80')}>
                      {p.step}
                    </span>
                    <span className="font-mono text-[8.5px] uppercase tracking-wider text-muted-foreground">{p.spec}</span>
                  </div>
                  <p className={cn('mt-1 font-mono text-xs font-bold tracking-tight', isHovered ? 'text-primary' : 'text-foreground')}>
                    {p.name}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-tight">{p.desc}</p>
                </div>

                {i < MAIN_PATH.length - 1 && (
                  <div
                    className={cn(
                      'hidden xl:flex items-center justify-center transition-colors duration-200',
                      hoveredMain !== null && i < hoveredMain
                        ? 'text-primary animate-pulse'
                        : 'text-primary/40',
                    )}
                  >
                    <ArrowRight className="size-3.5" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Forensic Investigation Path */}
      <Panel
        title="Forensic Investigation Path: Watermark Extraction to Attribution"
        description="Air-gapped reverse pipeline executed when an unauthorized document leak occurs."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
          {INVESTIGATION_PATH.map((p, i) => {
            const isHovered = hoveredForensic === i
            const isConnected = hoveredForensic !== null && i <= hoveredForensic
            return (
              <div
                key={p.step}
                className="flex flex-col xl:flex-row items-center gap-2"
                onMouseEnter={() => setHoveredForensic(i)}
                onMouseLeave={() => setHoveredForensic(null)}
              >
                <div
                  className={cn(
                    'w-full flex-1 rounded-md border p-3 transition-all duration-200 cursor-pointer select-none',
                    isHovered
                      ? 'border-success/80 bg-success/15 shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-[1.02]'
                      : isConnected
                        ? 'border-success/40 bg-success/5'
                        : 'border-success/30 bg-background/60 hover:border-success/60',
                  )}
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className={cn('font-mono text-[10px] font-bold', isHovered ? 'text-success' : 'text-success/80')}>
                      STAGE {p.step}
                    </span>
                    <span className="font-mono text-[8.5px] uppercase tracking-wider text-muted-foreground">{p.spec}</span>
                  </div>
                  <p className={cn('mt-1 font-mono text-xs font-bold tracking-tight', isHovered ? 'text-success' : 'text-foreground')}>
                    {p.name}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-tight">{p.desc}</p>
                </div>

                {i < INVESTIGATION_PATH.length - 1 && (
                  <div
                    className={cn(
                      'hidden xl:flex items-center justify-center transition-colors duration-200',
                      hoveredForensic !== null && i < hoveredForensic
                        ? 'text-success animate-pulse'
                        : 'text-success/40',
                    )}
                  >
                    <ArrowRight className="size-3.5" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Primitives & Trust Boundaries */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Cryptographic Primitives" bodyClassName="p-0">
          <DataTable>
            <thead>
              <tr>
                <Th>Primitive</Th>
                <Th>Algorithm</Th>
                <Th>Standard</Th>
                <Th>Role</Th>
              </tr>
            </thead>
            <tbody>
              {PRIMITIVES.map((p) => (
                <tr key={p.primitive} className="hover:bg-secondary/40 transition-colors">
                  <Td className="text-xs font-medium text-foreground">{p.primitive}</Td>
                  <Td><Mono className="text-primary text-xs">{p.algorithm}</Mono></Td>
                  <Td><Mono className="text-muted-foreground text-xs">{p.standard}</Mono></Td>
                  <Td className="text-xs text-muted-foreground">{p.use}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Architecture Specifications">
            <dl className="flex flex-col gap-2.5 text-xs">
              <div className="rounded-md border border-border/80 bg-background/60 p-2.5">
                <dt className="label-caps">Key Vault Subsystem</dt>
                <dd className="mt-1 font-mono text-foreground font-semibold">Prototype Key Vault</dd>
                <dd className="text-[11px] text-muted-foreground">Local encrypted storage simulating hardware tokens for prototype evaluation.</dd>
              </div>

              <div className="rounded-md border border-border/80 bg-background/60 p-2.5">
                <dt className="label-caps">Consensus Topology</dt>
                <dd className="mt-1 font-mono text-foreground font-semibold">4 Logical Validator Identities</dd>
                <dd className="text-[11px] text-muted-foreground">Permissioned offline consensus identities enforcing continuous tip verification.</dd>
              </div>

              <div className="rounded-md border border-border/80 bg-background/60 p-2.5">
                <dt className="label-caps">Network Boundary</dt>
                <dd className="mt-1 font-mono text-success font-semibold">Galvanic Air-Gap (Localhost Only)</dd>
                <dd className="text-[11px] text-muted-foreground">Zero external network calls, zero cloud KMS endpoints, zero public blockchain nodes.</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  )
}
