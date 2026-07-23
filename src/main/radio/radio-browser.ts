import RadioBrowser from 'radio-browser'

import type { Radio } from 'shared/types'

type SearchField = 'name' | 'state' | 'tag'

function cleanValue(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

function getStationUrl(station: {
  url?: string
  url_resolved?: string
}) {
  return cleanValue(station.url_resolved) || cleanValue(station.url)
}

function stationToRadio(station: {
  stationuuid?: string
  name?: string
  url?: string
  url_resolved?: string
  favicon?: string
  state?: string
  country?: string
  tags?: string
  homepage?: string
  codec?: string
  bitrate?: number
}): Radio | null {
  const url = getStationUrl(station)
  const name = cleanValue(station.name)

  if (!url || !name) {
    return null
  }

  const state = cleanValue(station.state)
  const country = cleanValue(station.country)
  const codec = cleanValue(station.codec).toUpperCase()
  const bitrate = Number.isFinite(station.bitrate) ? station.bitrate : null
  const frequency =
    codec && bitrate ? `${codec} ${bitrate}kbps` : codec || 'stream'

  return {
    id: cleanValue(station.stationuuid) || `radio-${url}`,
    name,
    img: cleanValue(station.favicon),
    state,
    region: state || country,
    city: state || country || 'Brasil',
    frequency,
    url,
    tags: cleanValue(station.tags),
    homepage: cleanValue(station.homepage),
  }
}

async function searchRadiosByCountry(
  country: { code?: string; name?: string },
  term: string
): Promise<Radio[]> {
  const searchTerm = term.trim()
  const countryCode = cleanValue(country.code).toUpperCase()
  const countryName = cleanValue(country.name)

  if (!searchTerm || (!countryCode && !countryName)) {
    return []
  }

  const fields: SearchField[] = ['name', 'state', 'tag']
  const countryFilter = countryCode
    ? { countrycodeexact: countryCode }
    : { country: countryName }
  const results = await Promise.all(
    fields.map(field =>
      RadioBrowser.searchStations({
        ...countryFilter,
        [field]: searchTerm,
        hidebroken: true,
        limit: 40,
        order: 'clickcount',
        reverse: true,
      })
    )
  )
  const uniqueRadios = new Map<string, Radio>()

  for (const station of results.flat()) {
    const radio = stationToRadio(station)

    if (radio) {
      uniqueRadios.set(radio.id, radio)
    }
  }

  return [...uniqueRadios.values()].slice(0, 60)
}

export async function searchBrazilianRadios(term: string): Promise<Radio[]> {
  return searchRadiosByCountry({ code: 'BR' }, term)
}

export async function searchWorldRadios(
  country: string,
  term: string
): Promise<Radio[]> {
  const normalizedCountry = cleanValue(country)

  if (/^[a-z]{2}$/i.test(normalizedCountry)) {
    return searchRadiosByCountry({ code: normalizedCountry }, term)
  }

  return searchRadiosByCountry({ name: normalizedCountry }, term)
}
