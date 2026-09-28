'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, History, KeyRound, ShieldCheck, ShieldOff, UserCheck, UserPlus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ALGORITHMS, type Classification, type Recipient } from '@/lib/data'
import { formatTs, groupHex, truncateHash } from '@/lib/format'
import { useTracelock } from '@/lib/store'
import { DataTable, Mono, PageHeader, StatusBadge, Td, Th, TraceButton } from './primitives'

function RecipientDrawer({
  recipient,
  open,
  onOpenChange,
}: {
  recipient: Recipient | undefined
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { sessions, documents, authorizeRecipient, revokeRecipient } = useTracelock()
  const r = recipient
  const rs = r ? sessions.filter((s) => s.recipientId === r.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)) : []
  const docs = r ? documents.filter((d) => d.recipients.includes(r.id)) : []

  if (!r) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="border-border bg-card sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="font-mono text-sm font-bold tracking-wider">
              RECIPIENT IDENTITY PROFILE
            </SheetTitle>
            <StatusBadge tone={r.authorization === 'AUTHORIZED' ? 'success' : 'danger'}>
              {r.authorization}
            </StatusBadge>
          </div>
          <SheetDescription className="text-xs text-muted-foreground">
            {r.id} · {r.role} · {r.organization}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-4 text-xs">
          {/* Identity Header */}
          <div className="rounded-md border border-border/80 bg-background/60 p-3">
            <p className="label-caps">Display Name & Clearance</p>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground">{r.name}</p>
            <p className="font-mono text-[11px] text-primary">{r.scope} CLEARANCE</p>
          </div>

          {/* Key Vault Storage Info */}
          <div className="rounded-md border border-border/80 bg-background/60 p-3">
            <p className="label-caps">Key Storage & Device Identity</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <dt className="text-muted-foreground">Key Architecture</dt>
                <dd className="font-mono text-foreground font-semibold">Prototype Key Vault</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vault Device Tag</dt>
                <dd className="font-mono text-foreground">{r.device || 'VAULT-047'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Signature Algorithm</dt>
                <dd className="font-mono text-foreground">{ALGORITHMS.signature}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">KEM Decapsulation</dt>
                <dd className="font-mono text-foreground">{ALGORITHMS.kem}</dd>
              </div>
            </div>
          </div>

          {/* Public Key Fingerprint (Truncated by default) */}
          <div className="rounded-md border border-border/80 bg-background/60 p-3">
            <p className="label-caps">ML-DSA-65 Verification Fingerprint (SHA3-256)</p>
            <p className="mt-1 font-mono text-[10px] break-all text-primary">
              {r.fingerprint}
            </p>
          </div>

          {/* Accessible Documents */}
          <div className="rounded-md border border-border/80 bg-background/60 p-3">
            <p className="label-caps">Accessible Documents ({docs.length})</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {docs.length === 0 ? (
                <span className="text-[11px] text-muted-foreground">No documents distributed yet.</span>
              ) : (
                docs.map((d) => (
                  <Link
                    key={d.id}
                    href={`/documents?id=${d.id}`}
                    className="rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-foreground hover:border-primary/50"
                  >
                    {d.name}
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Actions Bar */}
          <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
            <div className="flex gap-2">
              <Link href={`/identity?recipient=${r.id}`} className="flex-1">
                <TraceButton variant="outline" size="sm" className="w-full font-mono text-xs gap-1.5">
                  <KeyRound className="size-3.5" />
                  VIEW IDENTITY
                </TraceButton>
              </Link>
              <Link href={`/sessions?recipient=${r.id}`} className="flex-1">
                <TraceButton variant="outline" size="sm" className="w-full font-mono text-xs gap-1.5">
                  <History className="size-3.5" />
                  HISTORY ({rs.length})
                </TraceButton>
              </Link>
            </div>

            {r.authorization === 'AUTHORIZED' ? (
              <TraceButton
                variant="danger"
                size="sm"
                className="w-full font-mono text-xs gap-1.5"
                onClick={() => {
                  revokeRecipient(r.id)
                  onOpenChange(false)
                }}
              >
                <ShieldOff className="size-3.5" />
                REVOKE RECIPIENT AUTHORIZATION
              </TraceButton>
            ) : (
              <TraceButton
                variant="primary"
                size="sm"
                className="w-full font-mono text-xs gap-1.5"
                onClick={() => {
                  authorizeRecipient(r.id)
                  onOpenChange(false)
                }}
              >
                <ShieldCheck className="size-3.5" />
                AUTHORIZE RECIPIENT
              </TraceButton>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

const SCOPES: Classification[] = ['TOP SECRET', 'SECRET', 'CONFIDENTIAL', 'RESTRICTED']

function AddRecipientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (id: string) => void
}) {
  const { addRecipient } = useTracelock()
  const [loading, setLoading] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-mono text-base font-bold">PROVISION RECIPIENT IDENTITY</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Issues a new NIST FIPS 204 ML-DSA-65 signing identity bound to the prototype key vault.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-3 text-xs"
          onSubmit={async (e) => {
            e.preventDefault()
            setLoading(true)
            try {
              const f = new FormData(e.currentTarget)
              const r = await addRecipient({
                name: String(f.get('name')).trim(),
                role: String(f.get('role')).trim(),
                organization: String(f.get('organization')).trim(),
                scope: f.get('scope') as Classification,
              })
              onOpenChange(false)
              onCreated(r.id)
            } finally {
              setLoading(false)
            }
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-name" className="label-caps">Display Name & Rank</label>
            <input
              id="add-name"
              name="name"
              required
              placeholder="e.g. Cdr. K. Verma"
              className="h-9 rounded-md border border-border bg-background px-3 font-mono text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-org" className="label-caps">Organization / Branch</label>
            <input
              id="add-org"
              name="organization"
              required
              placeholder="e.g. Naval Cyber Command"
              className="h-9 rounded-md border border-border bg-background px-3 font-mono text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-role" className="label-caps">Operational Role</label>
            <input
              id="add-role"
              name="role"
              required
              placeholder="e.g. Senior Tactical Officer"
              className="h-9 rounded-md border border-border bg-background px-3 font-mono text-xs"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-scope" className="label-caps">Clearance Scope</label>
            <select
              id="add-scope"
              name="scope"
              defaultValue="TOP SECRET"
              className="h-9 rounded-md border border-border bg-background px-3 font-mono text-xs"
            >
              {SCOPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <DialogFooter className="mt-2 gap-2">
            <TraceButton type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </TraceButton>
            <TraceButton type="submit" variant="primary" size="sm" loading={loading}>
              ISSUE RECIPIENT
            </TraceButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RecipientsView({ initialOpen }: { initialOpen?: string }) {
  const { recipients, sessions, getRecipient } = useTracelock()
  const [openId, setOpenId] = useState<string | undefined>(initialOpen)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Recipients"
        title="Authorized Recipient Registry"
        description="Recipients hold ML-DSA-65 signing credentials in the prototype key vault. Each decryption is cryptographically bound to their registered identity."
        actions={
          <TraceButton variant="primary" size="md" className="gap-2 font-mono text-xs" onClick={() => setAddOpen(true)}>
            <UserPlus className="size-4" />
            PROVISION RECIPIENT
          </TraceButton>
        }
      />

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <DataTable>
          <thead>
            <tr>
              <Th>Recipient ID</Th>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Authorization</Th>
              <Th>Key Status</Th>
              <Th>Last Decryption</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => {
              const last = sessions
                .filter((s) => s.recipientId === r.id)
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]

              return (
                <tr
                  key={r.id}
                  onClick={() => setOpenId(r.id)}
                  className="cursor-pointer transition-colors hover:bg-secondary/40"
                >
                  <Td>
                    <span className="font-mono text-xs font-semibold text-primary">{r.id}</span>
                  </Td>
                  <Td className="font-medium text-foreground">{r.name}</Td>
                  <Td>
                    <p className="text-xs text-foreground/90">{r.role}</p>
                    <p className="text-[11px] text-muted-foreground">{r.organization}</p>
                  </Td>
                  <Td>
                    <StatusBadge tone={r.authorization === 'AUTHORIZED' ? 'success' : 'danger'}>
                      {r.authorization}
                    </StatusBadge>
                  </Td>
                  <Td>
                    <StatusBadge tone={r.identity === 'REVOKED' ? 'danger' : 'success'}>
                      {r.identity === 'REVOKED' ? 'REVOKED' : 'SEALED IN VAULT'}
                    </StatusBadge>
                  </Td>
                  <Td>
                    <Mono className="text-muted-foreground">{last ? formatTs(last.timestamp) : '—'}</Mono>
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenId(r.id)
                      }}
                      className="font-mono text-xs text-muted-foreground hover:text-primary underline flex items-center gap-1 ml-auto"
                    >
                      Audit <ChevronRight className="size-3" />
                    </button>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      </div>

      <RecipientDrawer
        recipient={openId ? getRecipient(openId) : undefined}
        open={!!openId}
        onOpenChange={(open) => !open && setOpenId(undefined)}
      />

      <AddRecipientDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(id) => setOpenId(id)}
      />
    </div>
  )
}
