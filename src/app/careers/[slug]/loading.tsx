export default function CareerDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-10 w-2/3" />
      <div className="skeleton aspect-[3/2] w-full rounded-2xl" />
      <div className="space-y-3">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-4/6" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    </div>
  )
}
