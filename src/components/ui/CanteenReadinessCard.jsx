import Button from './Button'

function ReadinessBadge({ label, ready }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
        ready
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
      ].join(' ')}
    >
      <span
        className={[
          'h-2 w-2 rounded-full',
          ready ? 'bg-emerald-500' : 'bg-amber-500',
        ].join(' ')}
      />
      {label}: {ready ? 'Ready' : 'Waiting'}
    </span>
  )
}

export default function CanteenReadinessCard({
  actionLabel,
  actionLoadingLabel,
  confirmedLabel,
  description,
  loading = false,
  confirmed = false,
  managerReady = false,
  kitchenReady = false,
  onAction,
}) {
  const effectiveDescription =
    description ||
    (managerReady && kitchenReady
      ? 'Both teams are ready. Waiting for the canteen to move to open.'
      : 'The canteen will move to open automatically once both teams confirm readiness.')

  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50/90 p-4 shadow-sm dark:border-sky-500/20 dark:bg-sky-500/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
              Opening Readiness
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              Waiting for manager and kitchen confirmation
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {effectiveDescription}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ReadinessBadge label="Manager" ready={managerReady} />
            <ReadinessBadge label="Kitchen" ready={kitchenReady} />
          </div>
        </div>

        <div className="shrink-0">
          <Button
            size="sm"
            loading={loading}
            disabled={confirmed}
            onClick={onAction}
          >
            {loading
              ? actionLoadingLabel
              : confirmed
                ? confirmedLabel
                : actionLabel}
          </Button>
        </div>
      </div>
    </section>
  )
}
