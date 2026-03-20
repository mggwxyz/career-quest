import Image from 'next/image'
import Link from 'next/link'
import { containerClassName } from './_styles/classes'

export default function Home() {
  return (
    <div className={containerClassName}>
      <main className="flex flex-col items-center">
        {/* Hero Section */}
        <section className="hero min-h-[60vh] rounded-box bg-base-200 mb-12">
          <div className="hero-content text-center flex-col">
            <Image src="/images/logo.png" alt="Career Quest" width={200} height={200} className="mb-4" />
            <h1 className="text-5xl font-bold">Discover Your Future</h1>
            <p className="py-4 max-w-lg text-lg text-base-content/70">
              Take a quick assessment to uncover careers that match your interests, strengths, and personality. Your adventure starts here.
            </p>
            <Link href="/intake/interests" className="btn btn-primary btn-lg gap-2">
              🚀 Start Your Career Quest
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="w-full mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>

          {/* Visual Stepper */}
          <ul className="steps steps-vertical lg:steps-horizontal w-full mb-10">
            <li className="step step-primary">Pick Your Interests</li>
            <li className="step step-primary">Would You Rather</li>
            <li className="step step-primary">See Your Profile</li>
            <li className="step step-primary">Explore Careers</li>
          </ul>

          {/* Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card bg-base-200 shadow-md">
              <div className="card-body items-center text-center">
                <div className="text-4xl mb-2">🎯</div>
                <h3 className="card-title">1. Interests</h3>
                <p className="text-base-content/70">
                  Tell us what subjects and activities excite you. We&apos;ll start mapping your unique profile.
                </p>
              </div>
            </div>

            <div className="card bg-base-200 shadow-md">
              <div className="card-body items-center text-center">
                <div className="text-4xl mb-2">⚖️</div>
                <h3 className="card-title">2. Would You Rather</h3>
                <p className="text-base-content/70">
                  Fun quick-fire choices that reveal your work style preferences and personality type.
                </p>
              </div>
            </div>

            <div className="card bg-base-200 shadow-md">
              <div className="card-body items-center text-center">
                <div className="text-4xl mb-2">🗺️</div>
                <h3 className="card-title">3. Career Matches</h3>
                <p className="text-base-content/70">
                  Get a personalized list of careers that align with your RIASEC profile and explore each one.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center mb-12">
          <p className="text-lg text-base-content/60 mb-4">Ready to find out where your strengths can take you?</p>
          <Link href="/intake/interests" className="btn btn-primary btn-wide">
            Get Started
          </Link>
        </section>
      </main>
    </div>
  )
}
