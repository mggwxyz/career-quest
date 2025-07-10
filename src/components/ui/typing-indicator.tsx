export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-lg bg-muted p-3">
        <div className="flex space-x-1">
          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
          <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
        </div>
      </div>
    </div>
  )
}
