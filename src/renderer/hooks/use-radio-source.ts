import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  useSetStoredValue,
  useStoredValue,
} from 'renderer/hooks/use-app-storage'
import type { PlayerQueueItem, Radio } from 'shared/types'

export type RadioStreamStatus = 'checking' | 'live' | 'offline'

function cleanValue(value: string | undefined) {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

function radioToItem(radio: Radio): PlayerQueueItem {
  const city = cleanValue(radio.city) || cleanValue(radio.state) || 'Brasil'
  const frequency = cleanValue(radio.frequency) || 'stream'

  return {
    id: radio.id,
    mode: 'radio',
    title: radio.name,
    artist: city,
    album: cleanValue(radio.region) || cleanValue(radio.state),
    duration: null,
    sourceDetail: frequency,
    src: radio.url,
    details: [
      { label: 'name', value: radio.name },
      { label: 'city', value: city },
      { label: 'frequency', value: frequency },
      { label: 'state', value: cleanValue(radio.state) || '-' },
      { label: 'url', value: radio.url },
    ],
  }
}

function itemToRadio(item: PlayerQueueItem): Radio {
  return {
    id: item.id,
    name: item.title,
    city: item.artist,
    state:
      item.details?.find(detail => detail.label === 'state')?.value ?? '',
    region: item.album,
    frequency: item.sourceDetail ?? 'stream',
    url: item.src,
  }
}

function makeManualRadio(
  name: string,
  city: string,
  state: string,
  url: string,
  frequency = 'stream'
): Radio {
  return {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    city,
    state,
    region: state,
    frequency,
    url,
  }
}

export function createManualRadioFromParts(parts: string[]) {
  const [name, city, state, url, frequency] = parts.map(cleanValue)

  if (!name || !city || !state || !url) {
    return null
  }

  return makeManualRadio(name, city, state, url, frequency || 'stream')
}

export function useRadioSource({
  activeTab,
  showRadioListTab,
}: {
  activeTab: string
  showRadioListTab: boolean
}) {
  const [radioStatuses, setRadioStatuses] = useState<
    Record<string, RadioStreamStatus>
  >({})
  const [recentRadioIds, setRecentRadioIds] = useState<string[]>([])
  const [searchItems, setSearchItems] = useState<PlayerQueueItem[]>([])
  const [radioListMode, setRadioListMode] = useState<'saved' | 'search'>(
    'saved'
  )
  const [radioSearchTerm, setRadioSearchTerm] = useState('')
  const { data: storedRadios } = useStoredValue<Radio[]>('prompt-play-radios')
  const persistRadios = useSetStoredValue<Radio[]>('prompt-play-radios')

  const savedRadios = useMemo(() => storedRadios ?? [], [storedRadios])
  const radioItems = useMemo(
    () => savedRadios.map(radioToItem),
    [savedRadios]
  )
  const radioListItems = radioListMode === 'search' ? searchItems : radioItems

  const recentRadioItems = useMemo(
    () =>
      recentRadioIds
        .map(id => radioItems.find(item => item.id === id))
        .filter((item): item is PlayerQueueItem => Boolean(item)),
    [radioItems, recentRadioIds]
  )

  const searchRadios = useCallback(
    async (term: string) => {
      const results = await window.App.searchRadios(term)
      setSearchItems(results.map(radioToItem))
      setRadioListMode('search')
      setRadioSearchTerm(term)

      return results.length
    },
    []
  )

  const showSavedRadios = useCallback(() => {
    setRadioListMode('saved')
    setRadioSearchTerm('')
  }, [])

  const saveRadio = useCallback(
    async (radio: Radio) => {
      const nextRadios = [
        radio,
        ...savedRadios.filter(savedRadio => savedRadio.id !== radio.id),
      ]

      await persistRadios(nextRadios)
      showSavedRadios()

      return nextRadios
    },
    [persistRadios, savedRadios, showSavedRadios]
  )

  const addSearchResult = useCallback(
    async (index: number) => {
      const item = searchItems[index]

      if (!item) {
        return null
      }

      await saveRadio(itemToRadio(item))

      return item
    },
    [saveRadio, searchItems]
  )

  const addManualRadio = useCallback(
    async (radio: Radio) => {
      await saveRadio(radio)
      return radioToItem(radio)
    },
    [saveRadio]
  )

  const editRadio = useCallback(
    async (index: number, radio: Radio) => {
      if (!savedRadios[index]) {
        return null
      }

      const nextRadio = {
        ...radio,
        id: savedRadios[index].id,
      }
      const nextRadios = savedRadios.map((savedRadio, radioIndex) =>
        radioIndex === index ? nextRadio : savedRadio
      )

      await persistRadios(nextRadios)
      showSavedRadios()

      return radioToItem(nextRadio)
    },
    [persistRadios, savedRadios, showSavedRadios]
  )

  const removeRadio = useCallback(
    async (index: number) => {
      const removedRadio = savedRadios[index]

      if (!removedRadio) {
        return null
      }

      await persistRadios(
        savedRadios.filter((_radio, radioIndex) => radioIndex !== index)
      )
      setRecentRadioIds(prev =>
        prev.filter(radioId => radioId !== removedRadio.id)
      )

      return radioToItem(removedRadio)
    },
    [persistRadios, savedRadios]
  )

  const clearRadios = useCallback(async () => {
    await persistRadios([])
    setRecentRadioIds([])
    showSavedRadios()
  }, [persistRadios, showSavedRadios])

  useEffect(() => {
    if (activeTab !== 'radio-list' || !showRadioListTab) {
      return
    }

    let isMounted = true

    radioListItems.forEach(item => {
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
  }, [activeTab, radioListItems, showRadioListTab])

  return {
    addManualRadio,
    addSearchResult,
    clearRadios,
    editRadio,
    radioItems,
    radioListItems,
    radioListMode,
    radioSearchTerm,
    radioStatuses,
    recentRadioItems,
    removeRadio,
    searchItems,
    searchRadios,
    setRecentRadioIds,
    showSavedRadios,
  }
}
