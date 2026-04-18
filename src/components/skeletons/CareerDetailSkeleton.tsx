export function CareerDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Career Header */}
      <div className="space-y-3">
        <div className="skeleton h-8 w-64"></div>
        <div className="skeleton h-4 w-32"></div>
      </div>

      {/* Career Info Cards */}
      <div className="space-y-4">
        <div className="card bg-base-200 shadow">
          <div className="card-body p-4">
            <div className="skeleton h-5 w-24 mb-2"></div>
            <div className="skeleton h-4 w-full mb-1"></div>
            <div className="skeleton h-4 w-4/5"></div>
          </div>
        </div>

        <div className="card bg-base-200 shadow">
          <div className="card-body p-4">
            <div className="skeleton h-5 w-20 mb-2"></div>
            <div className="skeleton h-4 w-full mb-1"></div>
            <div className="skeleton h-4 w-3/4"></div>
          </div>
        </div>

        <div className="card bg-base-200 shadow">
          <div className="card-body p-4">
            <div className="skeleton h-5 w-28 mb-2"></div>
            <div className="skeleton h-4 w-24"></div>
          </div>
        </div>

        <div className="card bg-base-200 shadow">
          <div className="card-body p-4">
            <div className="skeleton h-5 w-32 mb-2"></div>
            <div className="skeleton h-4 w-28"></div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <div className="skeleton h-10 w-full"></div>
        <div className="skeleton h-10 w-full"></div>
      </div>
    </div>
  )
}

export function CareerChatSkeleton() {
  return (
    <div className="space-y-4">
      {/* Chat Header */}
      <div className="skeleton h-6 w-48"></div>

      {/* Chat Messages */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="space-y-2">
            {/* AI Message */}
            <div className="chat chat-start">
              <div className="chat-bubble bg-base-300">
                <div className="skeleton h-4 w-48 mb-1"></div>
                <div className="skeleton h-4 w-32"></div>
              </div>
            </div>

            {/* User Message */}
            <div className="chat chat-end">
              <div className="chat-bubble bg-primary text-primary-foreground">
                <div className="skeleton h-4 w-36"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <div className="skeleton h-12 flex-1"></div>
        <div className="skeleton h-12 w-16"></div>
      </div>
    </div>
  )
}
