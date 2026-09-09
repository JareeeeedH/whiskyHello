import type { Whisky, WhiskySearchParams, WhiskySearchResult } from '../types/whisky'

/** Legacy WhiskyView minimum search length (raw query string length). */
export const MIN_WHISKY_SEARCH_LENGTH = 3

/**
 * Legacy textTransfer: remove all spaces, then lowercase.
 * Used for title / subtitle substring matching.
 */
export function textTransfer(stringText = ''): string {
  return stringText.replaceAll(' ', '').toLowerCase()
}

type SearchMethod = 'one' | 'two' | 'three' | 'four' | 'five' | 'six'

interface SearchMethodPayload {
  inputTitle: string
  inputSubTitle: string | undefined
  searchPoint: number | string
  method: SearchMethod
  dataList: Whisky[]
}

/**
 * Legacy searchMethodCombine — six method branches preserved.
 * Field mapping: mainTitle→name, subTitle→subtitle, points→points (number).
 */
function searchMethodCombine(payload: SearchMethodPayload): Whisky[] {
  const inputTitleTransfer = textTransfer(payload.inputTitle)
  const inputSubTitleTransfer = textTransfer(payload.inputSubTitle ?? '')

  return payload.dataList.filter((whisky) => {
    const titleTextCheck = textTransfer(whisky.name)
    const subTitleTextCheck = textTransfer(whisky.subtitle ?? '')

    if (payload.method === 'one') {
      return titleTextCheck.indexOf(inputTitleTransfer) !== -1
    }

    if (payload.method === 'two') {
      return (
        titleTextCheck.indexOf(inputTitleTransfer) !== -1 &&
        subTitleTextCheck.indexOf(inputSubTitleTransfer) !== -1
      )
    }

    if (payload.method === 'three') {
      return (
        titleTextCheck.indexOf(inputTitleTransfer) !== -1 &&
        Number(whisky.points) >= Number(payload.searchPoint)
      )
    }

    if (payload.method === 'four') {
      return (
        titleTextCheck.indexOf(inputTitleTransfer) !== -1 &&
        // Legacy uses loose ==
        Number(whisky.points) == Number(payload.searchPoint)
      )
    }

    if (payload.method === 'five') {
      return (
        titleTextCheck.indexOf(inputTitleTransfer) !== -1 &&
        subTitleTextCheck.indexOf(inputSubTitleTransfer) !== -1 &&
        Number(whisky.points) >= Number(payload.searchPoint)
      )
    }

    if (payload.method === 'six') {
      return (
        titleTextCheck.indexOf(inputTitleTransfer) !== -1 &&
        subTitleTextCheck.indexOf(inputSubTitleTransfer) !== -1 &&
        Number(whisky.points) == Number(payload.searchPoint)
      )
    }

    return false
  })
}

/**
 * Legacy searchView behavior on already-normalized whiskies.
 * Returns [] when no method branch matches (legacy returned undefined).
 */
export function searchNormalizedWhiskies(
  searchContext: string,
  searchPoint: number | string | null | undefined,
  pointGreaterThan: boolean | undefined,
  dataList: Whisky[] = [],
): Whisky[] {
  const textSplit = searchContext.split(' ')
  const [inputTitle, inputSubTitle] = textSplit

  // title only
  if (inputTitle && !inputSubTitle && !searchPoint) {
    return searchMethodCombine({
      inputTitle,
      inputSubTitle,
      searchPoint: searchPoint as string,
      method: 'one',
      dataList,
    })
  }

  // title + subtitle
  if (inputTitle && inputSubTitle && !searchPoint) {
    return searchMethodCombine({
      inputTitle,
      inputSubTitle,
      searchPoint: searchPoint as string,
      method: 'two',
      dataList,
    })
  }

  // title + points
  if (inputTitle && !inputSubTitle && searchPoint) {
    if (pointGreaterThan) {
      return searchMethodCombine({
        inputTitle,
        inputSubTitle,
        searchPoint,
        method: 'three',
        dataList,
      })
    }
    return searchMethodCombine({
      inputTitle,
      inputSubTitle,
      searchPoint,
      method: 'four',
      dataList,
    })
  }

  // title + subtitle + points
  if (inputTitle && inputSubTitle && searchPoint) {
    if (pointGreaterThan) {
      return searchMethodCombine({
        inputTitle,
        inputSubTitle,
        searchPoint,
        method: 'five',
        dataList,
      })
    }
    return searchMethodCombine({
      inputTitle,
      inputSubTitle,
      searchPoint,
      method: 'six',
      dataList,
    })
  }

  return []
}

/**
 * Public search entry used by Whisky Service.
 * Includes legacy min-length guard (raw query length < 3).
 */
export function searchWhiskies(
  dataList: Whisky[],
  params: WhiskySearchParams,
): WhiskySearchResult {
  const query = params.query ?? ''

  if (query.length < MIN_WHISKY_SEARCH_LENGTH) {
    return { status: 'too_short', items: [] }
  }

  const items = searchNormalizedWhiskies(
    query,
    params.points,
    params.pointGreaterThan,
    dataList,
  )

  return { status: 'ok', items }
}
