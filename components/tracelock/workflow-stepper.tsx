import { Ban, Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked'

export interface WorkflowStep {
  key: string
  title: string
  detail: string
  output?: React.ReactNode
  status?: StepStatus
}

export type StepState = StepStatus

export function stepState(index: number, current: number, finished: boolean): StepStatus {
  if (finished || index < current) return 'done'
  if (index === current) return 'running'
  return 'pending'
}

/** Vertical pipeline of technical process cards connected by a rail. `current` = -1 means idle. */
export function WorkflowStepper({
  steps,
  current,
  finished,
  compact,
}: {
  steps: WorkflowStep[]
  current: number
  finished: boolean
  compact?: boolean
}) {
  return (
    <ol className="relative flex flex-col" aria-label="Process stages">
      {steps.map((step, i) => {
        const computedState = current < 0 && !finished ? 'pending' : stepState(i, current, finished)
        const state: StepStatus = step.status ?? computedState
        const last = i === steps.length - 1
        return (
          <li key={step.key} className="relative flex gap-3 pb-2 last:pb-0" aria-current={state === 'running' ? 'step' : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'z-10 grid size-7 shrink-0 place-items-center rounded-md border font-mono text-[10px] font-semibold transition-all duration-300',
                  state === 'done' && 'border-success/60 bg-success/15 text-success shadow-[0_0_8px_rgba(52,211,153,0.15)]',
                  state === 'failed' && 'border-destructive/60 bg-destructive/15 text-destructive shadow-[0_0_8px_rgba(244,63,94,0.15)]',
                  state === 'blocked' && 'border-border/60 bg-muted/30 text-muted-foreground/50',
                  state === 'running' && 'border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(56,189,248,0.25)] animate-pulse',
                  state === 'pending' && 'border-border/80 bg-background text-muted-foreground/70',
                )}
              >
                {state === 'done' ? (
                  <Check className="size-3.5 stroke-[2.5]" />
                ) : state === 'failed' ? (
                  <X className="size-3.5 stroke-[2.5]" />
                ) : state === 'blocked' ? (
                  <Ban className="size-3 text-muted-foreground/60" />
                ) : state === 'running' ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  String(i + 1).padStart(2, '0')
                )}
                <span className="sr-only">{state}</span>
              </span>
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    'w-0.5 flex-1 transition-colors duration-300 my-0.5',
                    state === 'done' ? 'bg-success/50' : state === 'failed' ? 'bg-destructive/40' : 'bg-border/60'
                  )}
                />
              )}
            </div>
            <div
              className={cn(
                'mb-1 min-w-0 flex-1 rounded-md border px-3.5 transition-all duration-200',
                compact ? 'py-2' : 'py-2.5',
                state === 'running' && 'border-primary/60 bg-primary/[0.04] shadow-[0_0_15px_-3px_rgba(56,189,248,0.15)]',
                state === 'done' && 'border-border/90 bg-card/90',
                state === 'failed' && 'border-destructive/40 bg-destructive/[0.03]',
                state === 'blocked' && 'border-border/30 bg-card/10 opacity-50',
                state === 'pending' && 'border-border/40 bg-card/20 opacity-70',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground/80">0{i + 1}</span>
                  <p
                    className={cn(
                      'font-mono text-[11.5px] font-semibold tracking-[0.08em]',
                      state === 'pending' || state === 'blocked' ? 'text-muted-foreground' : state === 'failed' ? 'text-destructive' : 'text-foreground',
                    )}
                  >
                    {step.title}
                  </p>
                </div>
                <span
                  className={cn(
                    'font-mono text-[9.5px] font-semibold tracking-wider px-1.5 py-0.5 rounded border',
                    state === 'done' && 'border-success/30 bg-success/10 text-success',
                    state === 'failed' && 'border-destructive/30 bg-destructive/15 text-destructive',
                    state === 'blocked' && 'border-border/40 bg-muted/20 text-muted-foreground/60',
                    state === 'running' && 'border-primary/40 bg-primary/10 text-primary animate-pulse',
                    state === 'pending' && 'border-border/40 text-muted-foreground/60',
                  )}
                >
                  {state === 'done' ? 'VERIFIED' : state === 'failed' ? 'FAILED' : state === 'blocked' ? 'BLOCKED' : state === 'running' ? 'PROCESSING' : 'QUEUED'}
                </span>
              </div>
              {!compact && <p className="mt-1 text-xs text-muted-foreground text-pretty leading-relaxed">{step.detail}</p>}
              {(state === 'done' || state === 'failed') && step.output && (
                <div className={cn(
                  'mt-2.5 border-t pt-2 font-mono text-[11px] -mx-1 px-2.5 py-1.5 rounded',
                  state === 'failed' ? 'border-destructive/20 bg-destructive/5 text-destructive' : 'border-border/70 bg-background/40 text-foreground/90'
                )}>
                  {step.output}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
