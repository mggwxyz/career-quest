'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { containerClassName } from '../../_styles/classes'
import { CareerChat } from '@/components/career-chat'
import { CareerDetails } from '@/components/career-details'

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
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="loading loading-spinner loading-lg" />
        </div>
      </div>
    )
  }

  if (error || !career) {
    return (
      <div className={containerClassName}>
        <div className="alert alert-error">
          <span>{error || 'Career not found'}</span>
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
