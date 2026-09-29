'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { groupHex, truncateHash } from '@/lib/format'

export type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

const TONE_CLASS: Record<Tone, string> = {
  success: 'border-success/35 bg-success/10 text-success',
  info: 'border-primary/35 bg-primary/10 text-primary',
  warning: 'border-warning/35 bg-warning/10 text-warning',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
  neutral: 'border-border bg-secondary text-muted-foreground',
}

const DOT_CLASS: Record<Tone, string> = {
  success: 'bg-success',
  info: 'bg-primary',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  neutral: 'bg-muted-foreground',
}

export function toneFor(status: string): Tone {
  const s = status.toUpperCase()
  if (/(REVOKED|FAIL|INVALID|TAMPER|BROKEN|MISMATCH|UNVERIFIABLE|ALTERED)/.test(s)) return 'danger'
  if (/(PENDING|OPEN|ISSUED|NOT DISTRIBUTED|AWAITING)/.test(s)) return 'warning'
  if (/(VERIFIED|VALID|SIGNED|ACTIVE|AUTHORIZED|INTACT|OPERATIONAL|ATTRIBUTED|AGREEMENT|DISTRIBUTED|SEALED|ENCRYPTED|NONE|OFFLINE|DISABLED)/.test(s))
    return 'success'
  if (/(GENERATED|EMBEDDED|COMMITTED)/.test(s)) return 'info'
  return 'neutral'
}

export function StatusBadge({ children, tone, className }: { children: string; tone?: Tone; className?: string }) {
  const t = tone ?? toneFor(children)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.08em] whitespace-nowrap uppercase',
        TONE_CLASS[t],
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', DOT_CLASS[t])} />
      {children}
    </span>
  )
}

export function StatusDot({ tone = 'success', pulse }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span aria-hidden className="relative inline-flex size-2">
      {pulse && <span className={cn('absolute inset-0 animate-ping rounded-full opacity-50', DOT_CLASS[tone])} />}
      <span className={cn('relative size-2 rounded-full', DOT_CLASS[tone])} />
    </span>
  )
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('rounded-lg border border-border bg-card', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="label-caps text-foreground">{title}</h2>}
            {description && <p className="mt-1 text-xs text-muted-foreground text-pretty">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

export function StaggerText({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ')
  return (
    <span className={cn('inline-flex flex-wrap gap-x-1.5', className)}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap">
          {Array.from(word).map((char, charIndex) => (
            <span
              key={charIndex}
              className="animate-stagger-char"
              style={{ animationDelay: `${(wordIndex * 5 + charIndex) * 20}ms` }}
            >
              {char}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}

export function StatsCounter({
  value,
  duration = 800,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValueRef = useRef(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value)
      return
    }

    const startValue = prevValueRef.current
    const endValue = value
    const startTime = performance.now()
    let animationFrameId: number

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentVal = Math.round(startValue + (endValue - startValue) * easeProgress)

      setDisplayValue(currentVal)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter)
      } else {
        prevValueRef.current = endValue
      }
    }

    animationFrameId = requestAnimationFrame(updateCounter)
    return () => cancelAnimationFrame(animationFrameId)
  }, [value, duration])

  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <p className="label-caps text-primary tracking-[0.18em] flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse" />
          {eyebrow}
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground text-balance">
          <StaggerText text={title} />
        </h1>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1400)
      }}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      <span className="sr-only">{copied ? 'Copied' : `Copy ${label}`}</span>
    </button>
  )
}

export function Hash({
  value,
  label = 'value',
  full,
  head,
  tail,
  className,
  copy = true,
}: {
  value: string
  label?: string
  full?: boolean
  head?: number
  tail?: number
  className?: string
  copy?: boolean
}) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1 font-mono text-xs', className)}>
      <span className={cn(full ? 'break-all' : 'truncate')} title={value}>
        {full ? value : truncateHash(value, head, tail)}
      </span>
      {copy && <CopyButton value={value} label={label} />}
    </span>
  )
}

export function Fingerprint({ value, className }: { value: string; className?: string }) {
  const groups = groupHex(value.slice(0, 64)).split(' ')
  return (
    <div className={cn('grid grid-cols-8 gap-x-2 gap-y-1 font-mono text-[11px] text-foreground/90', className)} aria-label={`Fingerprint ${value}`}>
      {groups.map((g, i) => (
        <span key={i} className={i % 2 === 0 ? 'text-primary/90' : ''}>
          {g}
        </span>
      ))}
    </div>
  )
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="label-caps">{label}</dt>
      <dd className="mt-1 min-w-0 text-sm">{children}</dd>
    </div>
  )
}

export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('font-mono text-xs', className)}>{children}</span>
}

export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn('label-caps border-b border-border px-3 py-2.5 font-medium whitespace-nowrap', className)}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('border-b border-border/60 px-3 py-2.5 align-middle', className)}>{children}</td>
}

export function ClassificationTag({ value }: { value: string }) {
  const tone =
    value === 'TOP SECRET'
      ? 'border-destructive/40 text-destructive'
      : value === 'SECRET'
        ? 'border-warning/40 text-warning'
        : 'border-primary/40 text-primary'
  return (
    <span className={cn('rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em]', tone)}>{value}</span>
  )
}

export function GlassBlobCard({
  tone = 'cyan',
  children,
  className,
  innerClassName,
  onClick,
}: {
  tone?: 'cyan' | 'emerald' | 'ruby' | 'purple'
  children: React.ReactNode
  className?: string
  innerClassName?: string
  onClick?: () => void
}) {
  const blob1Color =
    tone === 'emerald'
      ? 'oklch(0.76 0.14 158 / 0.22)'
      : tone === 'ruby'
        ? 'oklch(0.66 0.2 25 / 0.22)'
        : tone === 'purple'
          ? 'oklch(0.65 0.18 300 / 0.22)'
          : 'oklch(0.76 0.11 222 / 0.22)'

  const blob2Color =
    tone === 'emerald'
      ? 'oklch(0.76 0.11 222 / 0.18)'
      : tone === 'ruby'
        ? 'oklch(0.82 0.13 80 / 0.18)'
        : 'oklch(0.76 0.14 158 / 0.18)'

  return (
    <div
      onClick={onClick}
      className={cn('tracelock-glass-blob-card group', className)}
    >
      <div
        className="blob-element-1"
        style={{ background: `radial-gradient(circle, ${blob1Color}, transparent 70%)` }}
      />
      <div
        className="blob-element-2"
        style={{ background: `radial-gradient(circle, ${blob2Color}, transparent 70%)` }}
      />
      <div className={cn('relative z-10 p-4', innerClassName)}>{children}</div>
    </div>
  )
}

export function GradientHoverCard({
  children,
  className,
  innerClassName,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  innerClassName?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn('tracelock-gradient-card group', className)}
    >
      <div className={cn('tracelock-gradient-inner p-4', innerClassName)}>
        {children}
      </div>
    </div>
  )
}

export function TraceCard({
  variant = 'default',
  tone = 'cyan',
  rotatingVariant,
  className,
  innerClassName,
  children,
  onClick,
}: {
  variant?: 'default' | 'elevated' | 'rotating' | 'blob' | 'gradient'
  tone?: 'cyan' | 'success' | 'danger'
  rotatingVariant?: 'cyan' | 'success' | 'danger'
  className?: string
  innerClassName?: string
  children: React.ReactNode
  onClick?: () => void
}) {
  if (variant === 'rotating') {
    const activeTone = rotatingVariant ?? tone
    const toneClass =
      activeTone === 'success'
        ? 'tracelock-rotating-border-success'
        : activeTone === 'danger'
          ? 'tracelock-rotating-border-danger'
          : ''
    return (
      <div className={cn('tracelock-rotating-border', toneClass, className)} onClick={onClick}>
        <div className={cn('tracelock-rotating-inner p-4', innerClassName)}>{children}</div>
      </div>
    )
  }

  if (variant === 'blob') {
    return (
      <GlassBlobCard
        tone={tone === 'success' ? 'emerald' : tone === 'danger' ? 'ruby' : 'cyan'}
        className={className}
        innerClassName={innerClassName}
        onClick={onClick}
      >
        {children}
      </GlassBlobCard>
    )
  }

  if (variant === 'gradient') {
    return (
      <GradientHoverCard
        className={className}
        innerClassName={innerClassName}
        onClick={onClick}
      >
        {children}
      </GradientHoverCard>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-border bg-card p-4 transition-all duration-200',
        variant === 'elevated' && 'hover:border-primary/50 hover:shadow-[0_0_16px_-4px_rgba(56,189,248,0.15)] hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TraceButton({
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  icon: Icon,
  children,
  className,
  onClick,
  title,
  type = 'button',
}: {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'danger' | 'ghost' | 'cyber'
  size?: 'sm' | 'default' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  title?: string
  type?: 'button' | 'submit' | 'reset'
}) {
  const base =
    'relative overflow-hidden inline-flex items-center justify-center gap-2 font-mono font-medium rounded-md transition-all duration-150 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer group'

  const sizeClass =
    size === 'sm'
      ? 'h-8 px-3 text-xs'
      : size === 'lg'
        ? 'h-10 px-5 text-sm tracking-wider font-semibold'
        : 'h-9 px-4 text-xs'

  const normalizedVariant = variant === 'danger' ? 'destructive' : variant

  const variantClass = {
    primary:
      'bg-primary text-primary-foreground hover:bg-primary/95 hover:shadow-[0_0_18px_rgba(56,189,248,0.35)] border border-primary/70 hover:-translate-y-0.5',
    cyber:
      'bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_16px_rgba(56,189,248,0.25)] border border-primary/40 hover:-translate-y-0.5',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border hover:border-primary/40 hover:-translate-y-0.5',
    outline: 'border border-border/80 bg-background/60 hover:bg-secondary/50 hover:border-primary/50 text-foreground hover:-translate-y-0.5',
    destructive:
      'bg-destructive/15 text-destructive border border-destructive/40 hover:bg-destructive/25 hover:shadow-[0_0_16px_rgba(239,68,68,0.35)] hover:-translate-y-0.5',
    ghost: 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground',
  }[normalizedVariant]

  return (
    <button
      type={type}
      title={title}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(base, sizeClass, variantClass, className)}
    >
      <span className="button-shimmer-sweep" aria-hidden />
      {loading ? (
        <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : (
        Icon && <Icon className="size-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  )
}

