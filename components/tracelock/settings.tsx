import { ALGORITHMS, LEDGER_NODES } from '@/lib/data'
import { Field, Mono, PageHeader, Panel, StatusBadge } from './primitives'

const GROUPS = [
  {
    title: 'Cryptography',
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
    items: [
      ['Scheme', ALGORITHMS.watermark],
      ['Payload size', '128 bits + 32-bit CRC'],
      ['Detection threshold', 'correlation ≥ 0.92'],
      ['Survives', 'print, scan, photo, recompression'],
    ],
  },
  {
    title: 'Ledger',
    items: [
      ['Validators', '4 logical permissioned validator identities'],
      ['Commit quorum', '3 of 4 signatures'],
      ['Network', 'Offline enclave segment'],
      ['Retention', 'Permanent, append-only'],
    ],
  },
  {
    title: 'Session Policy',
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
        actions={<StatusBadge>SEALED</StatusBadge>}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <Panel key={g.title} title={g.title}>
            <dl className="grid gap-4 sm:grid-cols-2">
              {g.items.map(([label, value]) => (
                <Field key={label} label={label}>
                  <Mono>{value}</Mono>
                </Field>
              ))}
            </dl>
          </Panel>
        ))}
      </div>
    </div>
  )
}
