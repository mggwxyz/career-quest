import { AnimatedHero } from './_components/AnimatedHero'
import { HowItWorksCard } from './_components/HowItWorksCard'

const steps = [
  { icon: 'target', title: 'Pick Your Interests', desc: 'Select topics that excite you or add your own — this sets the foundation for your profile.' },
  { icon: 'question', title: 'Answer Quick Questions', desc: 'Choose between scenarios in a "would you rather" format that reveals your work personality.' },
  { icon: 'brain', title: 'See Your Matches', desc: 'Get personalized career recommendations powered by AI, ranked by how well they fit you.' },
  { icon: 'chat', title: 'Chat With Your Career Guide', desc: 'Ask follow-ups, compare roles, and dig into any match — natural conversation helps you decide what to explore next.' },
] as const

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section — top-aligned so “How it works” stays in view below */}
      <section className="relative px-6 overflow-hidden pt-10 pb-6 sm:pt-14 sm:pb-8 text-center">
        <AnimatedHero />
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative max-w-5xl mx-auto px-6 pb-20">
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent mb-10" />

        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl text-foreground mb-2">How It Works</h2>
          <p className="text-sm text-text-dim">Four steps from interests to confident next moves</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <HowItWorksCard
              key={step.title}
              icon={step.icon}
              title={step.title}
              desc={step.desc}
              index={i}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
