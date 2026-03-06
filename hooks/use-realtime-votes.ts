'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface VoteCounts {
  A: number
  B: number
  total: number
}

export function useRealtimeVotes(betterId: string, initial: VoteCounts) {
  const [counts, setCounts] = useState<VoteCounts>(initial)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`votes:${betterId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `better_id=eq.${betterId}`,
        },
        (payload) => {
          const choice = payload.new.choice as 'A' | 'B'
          setCounts((prev) => ({
            ...prev,
            [choice]: prev[choice] + 1,
            total: prev.total + 1,
          }))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [betterId])

  return counts
}
