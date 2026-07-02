export default function CareersLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="text-center mb-8 pt-4">
        <div className="skeleton h-9 w-64 mx-auto mb-3" />
        <div className="skeleton h-4 w-80 mx-auto" />
      </div>
      <div className="skeleton h-12 w-full rounded-2xl mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border">
            <div className="skeleton aspect-[3/2] w-full rounded-none" />
            <div className="p-6 space-y-3">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
