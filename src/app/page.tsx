import { AnimatedHero } from './_components/AnimatedHero'
import { HowItWorksCard } from './_components/HowItWorksCard'

const steps = [
  { num: '1', icon: '🎯', title: 'Pick Your Interests', desc: 'Select topics that excite you or add your own — this sets the foundation for your profile.' },
  { num: '2', icon: '⚖️', title: 'Answer Quick Questions', desc: 'Choose between scenarios in a "would you rather" format that reveals your work personality.' },
  { num: '3', icon: '🌟', title: 'See Your Matches', desc: 'Get personalized career recommendations powered by AI, ranked by how well they fit you.' },
]

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <AnimatedHero />
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative max-w-4xl mx-auto px-6 pb-20">
        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent mb-16" />

        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl text-foreground mb-2">How It Works</h2>
          <p className="text-sm text-text-dim">Three steps to find careers that fit</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <HowItWorksCard
              key={step.num}
              num={step.num}
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
