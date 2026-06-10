import type { PlayerQueueItem } from 'shared/types'

export const YOUTUBE_STORAGE_KEY = 'prompt-play-youtube'

export interface YouTubePlaylistSummary {
  id: string
  title: string
  videoCount: number
}

export interface YouTubeStorage {
  youtube: {
    apiKey: string
    playlists: string[]
    playlistDetails: YouTubePlaylistSummary[]
    items: PlayerQueueItem[]
  }
}

export function createEmptyYouTubeStorage(): YouTubeStorage {
  return {
    youtube: {
      apiKey: '',
      playlists: [],
      playlistDetails: [],
      items: [],
    },
  }
}

export function readStoredYouTube(): YouTubeStorage {
  try {
    const storedValue = localStorage.getItem(YOUTUBE_STORAGE_KEY)

    if (!storedValue) {
      return createEmptyYouTubeStorage()
    }

    const stored = JSON.parse(storedValue) as Partial<YouTubeStorage>
    const youtube = stored.youtube

    if (!youtube) {
      return createEmptyYouTubeStorage()
    }

    return {
      youtube: {
        apiKey: typeof youtube.apiKey === 'string' ? youtube.apiKey : '',
        playlists: Array.isArray(youtube.playlists)
          ? youtube.playlists.filter(
              (playlistId): playlistId is string =>
                typeof playlistId === 'string'
            )
          : [],
        playlistDetails: Array.isArray(youtube.playlistDetails)
          ? youtube.playlistDetails
              .filter(
                (playlist): playlist is YouTubePlaylistSummary =>
                  typeof playlist.id === 'string' &&
                  typeof playlist.title === 'string'
              )
              .map(playlist => ({
                ...playlist,
                videoCount:
                  typeof playlist.videoCount === 'number'
                    ? playlist.videoCount
                    : 0,
              }))
          : [],
        items: Array.isArray(youtube.items)
          ? youtube.items.filter(
              (item): item is PlayerQueueItem =>
                item?.mode === 'yt' &&
                typeof item.id === 'string' &&
                typeof item.title === 'string' &&
                typeof item.artist === 'string' &&
                typeof item.src === 'string'
            )
          : [],
      },
    }
  } catch {
    return createEmptyYouTubeStorage()
  }
}

function parseYouTubeDuration(duration: string | undefined): number | null {
  if (!duration) {
    return null
  }

  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(
    duration
  )

  if (!match) {
    return null
  }

  const days = Number.parseInt(match[1] ?? '0', 10)
  const hours = Number.parseInt(match[2] ?? '0', 10)
  const minutes = Number.parseInt(match[3] ?? '0', 10)
  const seconds = Number.parseInt(match[4] ?? '0', 10)

  return days * 86400 + hours * 3600 + minutes * 60 + seconds
}

export function parseYouTubePlaylistId(input: string): string {
  const value = input.trim()

  if (!value) {
    return ''
  }

  try {
    const url = new URL(value)
    const playlistId = url.searchParams.get('list')

    return playlistId?.trim() ?? value
  } catch {
    return value
  }
}

function buildYouTubePlaylistItem(
  item: unknown,
  playlistId: string,
  duration: number | null
): PlayerQueueItem | null {
  const snippet = (item as { snippet?: Record<string, unknown> }).snippet
  const resourceId = snippet?.resourceId as { videoId?: unknown } | undefined
  const videoId = resourceId?.videoId
  const title = snippet?.title
  const artist = snippet?.videoOwnerChannelTitle ?? snippet?.channelTitle

  if (typeof videoId !== 'string' || typeof title !== 'string') {
    return null
  }

  return {
    id: `yt-${playlistId}-${videoId}`,
    mode: 'yt',
    title,
    artist: typeof artist === 'string' ? artist : 'YouTube',
    album: playlistId,
    duration,
    sourceDetail: 'video',
    src: videoId,
    videoId,
    details: [
      { label: 'playlist', value: playlistId },
      { label: 'video', value: videoId },
    ],
  }
}

export async function fetchYouTubePlaylistItems(
  apiKey: string,
  playlistId: string
): Promise<{
  items: PlayerQueueItem[]
  playlistTitle: string
  videoCount: number
}> {
  const playlistUrl = new URL(
    'https://youtube.googleapis.com/youtube/v3/playlists'
  )
  playlistUrl.searchParams.set('key', apiKey)
  playlistUrl.searchParams.set('id', playlistId)
  playlistUrl.searchParams.set('part', 'snippet,contentDetails')

  const playlistResponse = await fetch(playlistUrl.toString())

  let playlistTitle = playlistId
  let videoCount = 0

  if (playlistResponse.ok) {
    const playlistData = (await playlistResponse.json()) as {
      items?: {
        contentDetails?: {
          itemCount?: number
        }
        snippet?: {
          title?: string
        }
      }[]
    }

    playlistTitle = playlistData.items?.[0]?.snippet?.title ?? playlistId
    videoCount = playlistData.items?.[0]?.contentDetails?.itemCount ?? 0
  }

  const playlistItems: unknown[] = []
  let nextPageToken: string | undefined

  do {
    const playlistItemsUrl = new URL(
      'https://youtube.googleapis.com/youtube/v3/playlistItems'
    )
    playlistItemsUrl.searchParams.set('key', apiKey)
    playlistItemsUrl.searchParams.set('playlistId', playlistId)
    playlistItemsUrl.searchParams.set('part', 'snippet')
    playlistItemsUrl.searchParams.set('maxResults', '50')

    if (nextPageToken) {
      playlistItemsUrl.searchParams.set('pageToken', nextPageToken)
    }

    const response = await fetch(playlistItemsUrl.toString())

    if (!response.ok) {
      throw new Error(`playlistItems failed with ${response.status}`)
    }

    const data = (await response.json()) as {
      items?: unknown[]
      nextPageToken?: string
    }

    playlistItems.push(...(Array.isArray(data.items) ? data.items : []))
    nextPageToken = data.nextPageToken
  } while (nextPageToken)

  const videoIds = playlistItems
    .map(item => {
      const snippet = (item as { snippet?: Record<string, unknown> }).snippet
      const resourceId = snippet?.resourceId as
        | { videoId?: unknown }
        | undefined

      return typeof resourceId?.videoId === 'string' ? resourceId.videoId : null
    })
    .filter((videoId): videoId is string => Boolean(videoId))
  const durationsByVideoId = new Map<string, number | null>()

  for (let index = 0; index < videoIds.length; index += 50) {
    const videoIdBatch = videoIds.slice(index, index + 50)
    const videosUrl = new URL(
      'https://youtube.googleapis.com/youtube/v3/videos'
    )
    videosUrl.searchParams.set('key', apiKey)
    videosUrl.searchParams.set('id', videoIdBatch.join(','))
    videosUrl.searchParams.set('part', 'contentDetails')

    const videosResponse = await fetch(videosUrl.toString())

    if (videosResponse.ok) {
      const videosData = (await videosResponse.json()) as {
        items?: {
          id?: string
          contentDetails?: {
            duration?: string
          }
        }[]
      }

      videosData.items?.forEach(video => {
        if (video.id) {
          durationsByVideoId.set(
            video.id,
            parseYouTubeDuration(video.contentDetails?.duration)
          )
        }
      })
    }
  }

  const items = playlistItems
    .map(item => {
      const snippet = (item as { snippet?: Record<string, unknown> }).snippet
      const resourceId = snippet?.resourceId as
        | { videoId?: unknown }
        | undefined
      const videoId =
        typeof resourceId?.videoId === 'string' ? resourceId.videoId : ''

      return buildYouTubePlaylistItem(
        item,
        playlistId,
        durationsByVideoId.get(videoId) ?? null
      )
    })
    .filter((item): item is PlayerQueueItem => Boolean(item))

  return {
    items,
    playlistTitle,
    videoCount: videoCount || items.length,
  }
}
