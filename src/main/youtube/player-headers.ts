import { session } from 'electron'

const YOUTUBE_PLAYER_ORIGIN = 'https://www.youtube.com'
const YOUTUBE_PLAYER_REFERER = `${YOUTUBE_PLAYER_ORIGIN}/`

export function registerYouTubePlayerHeaders() {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: [
        '*://*.youtube.com/*',
        '*://youtube.com/*',
        '*://*.youtube-nocookie.com/*',
        '*://youtube-nocookie.com/*',
        '*://*.googlevideo.com/*',
      ],
    },
    (details, callback) => {
      const requestHeaders: Record<string, string> = {
        ...details.requestHeaders,
        Referer: YOUTUBE_PLAYER_REFERER,
      }
      const userAgent = details.requestHeaders['User-Agent']

      if (userAgent) {
        requestHeaders['User-Agent'] = userAgent.replace(/\sElectron\/\S+/, '')
      }

      callback({
        requestHeaders,
      })
    }
  )
}
