import { useEffect, useMemo, useState } from 'react'

import { radios } from 'shared/data/radios'
import type { PlayerQueueItem } from 'shared/types'

export type RadioStreamStatus = 'checking' | 'live' | 'offline'

const RADIO_ITEMS: PlayerQueueItem[] = radios.map(radio => ({
  id: radio.id,
  mode: 'radio',
  title: radio.name,
  artist: radio.city,
  album: radio.region,
  duration: null,
  sourceDetail: radio.frequency,
  src: radio.url,
  details: [
    { label: 'name', value: radio.name },
    { label: 'city', value: radio.city },
    { label: 'frequency', value: radio.frequency },
    { label: 'region', value: radio.region },
    { label: 'state', value: radio.state },
  ],
}))

export function useRadioSource({
  activeTab,
  showRadioListTab,
}: {
  activeTab: string
  showRadioListTab: boolean
}) {
  const radioItems = useMemo(() => RADIO_ITEMS, [])
  const [radioStatuses, setRadioStatuses] = useState<
    Record<string, RadioStreamStatus>
  >({})
  const [recentRadioIds, setRecentRadioIds] = useState<string[]>([])

  const recentRadioItems = useMemo(
    () =>
      recentRadioIds
        .map(id => radioItems.find(item => item.id === id))
        .filter((item): item is PlayerQueueItem => Boolean(item)),
    [radioItems, recentRadioIds]
  )

  useEffect(() => {
    if (activeTab !== 'radio-list' || !showRadioListTab) {
      return
    }

    let isMounted = true

    radioItems.forEach(item => {
      setRadioStatuses(prev => ({
        ...prev,
        [item.id]: prev[item.id] ?? 'checking',
      }))

      window.App.checkRadioStream(item.src)
        .then(isLive => {
          if (!isMounted) {
            return
          }

          setRadioStatuses(prev => ({
            ...prev,
            [item.id]: isLive ? 'live' : 'offline',
          }))
        })
        .catch(() => {
          if (!isMounted) {
            return
          }

          setRadioStatuses(prev => ({
            ...prev,
            [item.id]: 'offline',
          }))
        })
    })

    return () => {
      isMounted = false
    }
  }, [activeTab, radioItems, showRadioListTab])

  return {
    radioItems,
    radioStatuses,
    recentRadioItems,
    setRecentRadioIds,
  }
}
