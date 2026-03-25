export function CareerCardSkeleton() {
  return (
    <tr>
      <td>
        <div className="flex flex-col gap-2">
          <div className="skeleton h-4 w-32"></div>
          <div className="skeleton h-6 w-16"></div>
        </div>
      </td>
      <td>
        <div className="skeleton h-4 w-48"></div>
      </td>
      <td>
        <div className="skeleton h-4 w-40"></div>
      </td>
      <td>
        <div className="skeleton h-4 w-20"></div>
      </td>
      <td>
        <div className="skeleton h-4 w-24"></div>
      </td>
    </tr>
  )
}

export function CareerListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="skeleton h-8 w-64 mx-auto mb-4"></div>
        <div className="skeleton h-4 w-80 mx-auto"></div>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Career</th>
              <th>Description</th>
              <th>Why It Matches</th>
              <th>Job Growth</th>
              <th>Salary Range</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, index) => (
              <CareerCardSkeleton key={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
