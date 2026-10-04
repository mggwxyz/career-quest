'use client'

import { useEffect } from 'react'
import { recordCareerEventAction } from '@/app/careers/actions'

interface Props {
  onetId: string
  slug?: string | null
}

export function CareerViewRecorder({ onetId, slug }: Props) {
  useEffect(() => {
    void recordCareerEventAction({ onetId, event: 'view', slug: slug ?? undefined })
  }, [onetId, slug])

  return null
}
