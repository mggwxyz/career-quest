'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const steps = [
  { label: 'Interests', href: '/intake/interests' },
  { label: 'Would You Rather', href: '/intake/would-you-rather' },
  { label: 'Summary', href: '/intake/summary' },
  { label: 'Careers', href: '/careers' },
]

export function StepIndicator() {
  const pathname = usePathname()

  const currentIndex = steps.findIndex((s) => pathname.startsWith(s.href))

  return (
    <div className="w-full mb-8">
      <ul className="steps steps-horizontal w-full">
        {steps.map((step, i) => (
          <li
            key={step.href}
            className={`step ${i <= currentIndex ? 'step-primary' : ''}`}
          >
            <Link
              href={step.href}
              className={`text-sm hover:underline ${
                pathname.startsWith(step.href) ? 'font-bold' : 'text-base-content/60'
              }`}
            >
              {step.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
