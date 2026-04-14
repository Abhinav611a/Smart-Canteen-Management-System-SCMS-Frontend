export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-brand-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin" />
          <div className="absolute inset-2 rounded-full bg-brand-500/10 flex items-center justify-center">
            <span className="text-xl">🍽</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium animate-pulse">Loading CanteenDAO…</p>
      </div>
    </div>
  )
}
