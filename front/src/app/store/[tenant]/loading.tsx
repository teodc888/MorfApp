export default function TenantLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 max-w-[520px] mx-auto w-full">
      {/* Header skeleton */}
      <div className="h-14 bg-zinc-300 animate-pulse" />

      {/* Tabs skeleton */}
      <div className="h-10 bg-zinc-200 animate-pulse mt-px" />

      {/* Cards skeleton */}
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-zinc-200 rounded-xl animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
