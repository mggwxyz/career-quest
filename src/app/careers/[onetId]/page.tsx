'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { containerClassName } from '../../_styles/classes'
import { CareerChat } from '@/components/career-chat'
import { CareerDetails } from '@/components/career-details'
import { CareerDetailSkeleton, CareerChatSkeleton } from '@/components/skeletons/CareerDetailSkeleton'

interface Career {
  title: string
  description: string
  onetId: string
  whyItMatches: string
  jobGrowth: string
  salaryRange: string
}

export default function CareerChatPage() {
  const params = useParams()
  const onetId = params.onetId as string
  const [career, setCareer] = useState<Career | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCareerDetails = async () => {
      try {
        const response = await fetch(`/api/careers/${onetId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch career details')
        }
        const data = await response.json()
        setCareer(data.career)
      }
      catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
      finally {
        setLoading(false)
      }
    }

    if (onetId) {
      fetchCareerDetails()
    }
  }, [onetId])

  if (loading) {
    return (
      <div className={containerClassName}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Career Details Panel Skeleton */}
          <div className="lg:col-span-1">
            <CareerDetailSkeleton />
          </div>

          {/* Chat Panel Skeleton */}
          <div className="lg:col-span-2">
            <CareerChatSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (error || !career) {
    return (
      <div className={containerClassName}>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-4">Career Not Found</h1>
          <p className="text-lg text-muted-foreground mb-8">
            {error || 'We couldn\'t find the career you\'re looking for. It may have been removed or the link is incorrect.'}
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/careers" className="px-6 py-2.5 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold text-sm no-underline">
              View All Careers
            </Link>
            <Link href="/discover/preferences" className="px-6 py-2.5 rounded-full border border-border text-muted-foreground hover:border-border-hover transition-all no-underline text-sm">
              Retake Assessment
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Career Details Panel */}
        <div className="lg:col-span-1">
          <CareerDetails career={career} />
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-2">
          <CareerChat career={career} />
        </div>
      </div>
    </div>
  )
}
