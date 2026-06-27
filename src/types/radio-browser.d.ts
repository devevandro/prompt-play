declare module 'radio-browser' {
  export interface RadioBrowserStation {
    stationuuid?: string
    name?: string
    url?: string
    url_resolved?: string
    favicon?: string
    country?: string
    countrycode?: string
    state?: string
    language?: string
    tags?: string
    homepage?: string
    codec?: string
    bitrate?: number
    votes?: number
    clickcount?: number
  }

  export interface RadioBrowserSearchParams {
    countrycode?: string
    countrycodeexact?: string
    name?: string
    state?: string
    tag?: string
    limit?: number
    offset?: number
    order?: string
    reverse?: boolean
    hidebroken?: boolean
  }

  interface RadioBrowserClient {
    searchStations(
      params: RadioBrowserSearchParams
    ): Promise<RadioBrowserStation[]>
  }

  const RadioBrowser: RadioBrowserClient

  export = RadioBrowser
}
