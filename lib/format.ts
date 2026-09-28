const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Timestamps are stored as local ISO strings without a zone (e.g. 2026-09-28T14:32:17) and rendered verbatim to avoid hydration drift. */
export function formatTs(ts: string, withSeconds = true) {
  const [date, time = '00:00:00'] = ts.split('T')
  const [y, m, d] = date.split('-')
  const t = withSeconds ? time.slice(0, 8) : time.slice(0, 5)
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}, ${t}`
}

export function formatDate(ts: string) {
  const [date] = ts.split('T')
  const [y, m, d] = date.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}

export function nowTs() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function truncateHash(hash: string, head = 10, tail = 6) {
  if (hash.length <= head + tail + 1) return hash
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`
}

export function groupHex(hex: string, size = 4) {
  return (hex.match(new RegExp(`.{1,${size}}`, 'g')) ?? []).join(' ').toUpperCase()
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
