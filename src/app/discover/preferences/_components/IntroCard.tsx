'use client'

export default function IntroCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center pt-20 px-4 max-w-md mx-auto">
      <h1 className="font-serif text-3xl text-foreground mb-4">Ready?</h1>
      <p className="text-base text-muted-foreground mb-3">
        About 12–20 quick choices. There are no wrong answers. You can skip any question, and you can pause anytime.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 px-8 py-3 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.2)]"
      >
        Let&apos;s go →
      </button>
    </div>
  )
}
