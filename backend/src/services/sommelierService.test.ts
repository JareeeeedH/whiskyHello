/**
 * Sommelier recommendation tests.
 * OpenAI is always mocked; no API key or database is required.
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { APIConnectionTimeoutError, APIError } from 'openai'
import app from '../app'
import { OCCASIONS, TASTE_KEYS } from '../types/sommelier'
import type { SommelierInput, StyleProfile, TasteProfile } from '../types/sommelier'
import { AppError } from '../utils/AppError'
import {
  RECOMMENDATION_INSTRUCTIONS,
  RECOMMENDATION_MALFORMED_MESSAGE,
  RECOMMENDATION_NOT_CONFIGURED_MESSAGE,
  RECOMMENDATION_SCHEMA,
  RECOMMENDATION_TIMEOUT_MESSAGE,
  RECOMMENDATION_UNAVAILABLE_MESSAGE,
  collectImageResults,
  setRecommendationClientForTests,
  type RecommendationLLMClient,
} from './openaiWhiskyRecommender'
import {
  normalizeWhiskyName,
  recommendWhiskies,
  toLLMInput,
  toRecommendationResult,
} from './sommelierService'

const originalModel = process.env.OPENAI_MODEL
const originalKey = process.env.OPENAI_API_KEY

/** 4 picked tastes; the other six are not specified. */
const TASTE: TasteProfile = {
  fruit: 9,
  floral: 6,
  maltGrain: 7,
  peat: 2,
}

const STYLE: StyleProfile = { body: 8, intensity: 6, smoothness: 9 }

const BEST_MATCH = {
  whiskyName: 'Glenmorangie The Original 10 Year Old',
  reason: '果香與花香明亮，口感圓潤。',
  matches: ['果香明顯', '帶有花香'],
  considerations: ['酒體偏中等'],
  imageUrl: null,
  imageSourceUrl: null,
}

const ALTERNATIVE = {
  whiskyName: 'Aberlour 12 Year Old Double Cask Matured',
  reason: '雪莉桶帶來果乾與甜香，酒體飽滿。',
  matches: ['果香豐富', '酒體飽滿'],
  considerations: [],
  imageUrl: null,
  imageSourceUrl: null,
}

const GLENMORANGIE_PHOTO = {
  imageUrl: 'https://cdn.example.com/glenmorangie-the-original-10.png',
  sourceWebsiteUrl: 'https://www.glenmorangie.com/en-gb/whisky/the-original',
}

const ABERLOUR_PHOTO = {
  imageUrl: 'https://shop.example.com/images/aberlour-12-double-cask.jpg?v=2',
  sourceWebsiteUrl: 'https://shop.example.com/aberlour-12-double-cask',
}

/** A web_search_call item as returned with include: ['web_search_call.results']. */
function webSearchCall(results: unknown[]) {
  return { type: 'web_search_call', status: 'completed', action: { type: 'search' }, results }
}

function imageResult(photo: { imageUrl: string; sourceWebsiteUrl: string }) {
  return {
    type: 'image_result',
    image_url: photo.imageUrl,
    source_website_url: photo.sourceWebsiteUrl,
    thumbnail_url: 'https://images.openai.com/thumb',
    caption: '',
  }
}

/** A strict Structured Outputs payload: every key present, unused parts as null. */
function llmOutput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: 'ok',
    message: null,
    bestMatch: BEST_MATCH,
    alternative: ALTERNATIVE,
    ...overrides,
  }
}

const UNABLE_OUTPUT = {
  status: 'unable',
  message: '這次的需求和威士忌無關。',
  bestMatch: null,
  alternative: null,
}

function completedResponse(outputText: string, extra: Record<string, unknown> = {}) {
  return { status: 'completed', output: [], output_text: outputText, ...extra }
}

function mockOpenAI(impl: () => Promise<unknown>) {
  const create = mock.fn(impl)
  setRecommendationClientForTests({ responses: { create } } as unknown as RecommendationLLMClient)
  return create
}

function mockRecommendation(payload: Record<string, unknown>) {
  return mockOpenAI(async () => completedResponse(JSON.stringify(payload)))
}

function input(overrides: Partial<SommelierInput> = {}): SommelierInput {
  return { taste: { ...TASTE }, style: { ...STYLE }, ...overrides }
}

function assertMalformed(fn: () => unknown): void {
  assert.throws(
    fn,
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 502 &&
      error.message === RECOMMENDATION_MALFORMED_MESSAGE,
  )
}

async function assertAppError(
  promise: Promise<unknown>,
  statusCode: number,
  message: string,
): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.statusCode, statusCode)
    assert.equal(error.message, message)
    return true
  })
}

beforeEach(() => {
  process.env.OPENAI_MODEL = 'test-model'
  mock.method(console, 'error', () => undefined)
})

afterEach(() => {
  setRecommendationClientForTests(null)
  mock.restoreAll()
  if (originalModel === undefined) delete process.env.OPENAI_MODEL
  else process.env.OPENAI_MODEL = originalModel
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalKey
})

describe('toLLMInput', () => {
  it('keeps the picked tastes, style, occasion, budget and freeText as entered', () => {
    assert.deepEqual(
      toLLMInput(input({ occasion: 'date', budget: { max: 2000 }, freeText: '  不要太甜  ' })),
      { taste: TASTE, style: STYLE, occasion: 'date', budget: { max: 2000 }, freeText: '不要太甜' },
    )
  })

  it('keeps unpicked tastes absent and orders the picked ones canonically', () => {
    const llmInput = toLLMInput(input({ taste: { smoke: 1, floral: 6, sweet: 8, maltGrain: 4, fruit: 9 } }))

    assert.deepEqual(Object.keys(llmInput.taste), ['fruit', 'sweet', 'floral', 'maltGrain', 'smoke'])
    for (const key of ['nutty', 'chocolateCoffee', 'spice', 'oak', 'peat']) {
      assert.equal(key in llmInput.taste, false, key)
    }
  })

  it('drops unknown keys and empty optional fields', () => {
    const llmInput = toLLMInput(
      input({
        taste: { ...TASTE, salty: 9 } as TasteProfile,
        style: { ...STYLE, sweetness: 3 } as StyleProfile,
        budget: {},
        freeText: '   ',
      }),
    )

    assert.deepEqual(llmInput, { taste: TASTE, style: STYLE })
  })
})

describe('toRecommendationResult', () => {
  it('maps bestMatch and alternative to an ordered recommendations array', () => {
    assert.deepEqual(toRecommendationResult(llmOutput()), {
      status: 'ok',
      recommendations: [
        { type: 'best_match', ...BEST_MATCH },
        { type: 'alternative', ...ALTERNATIVE },
      ],
    })
  })

  it('trims text and drops blank list items', () => {
    const result = toRecommendationResult(
      llmOutput({
        bestMatch: {
          whiskyName: '  Talisker 10 Year Old ',
          reason: ' 海風與煙燻。 ',
          matches: [' 煙燻 ', '', '   '],
          considerations: ['  '],
        },
      }),
    )

    assert.equal(result.status, 'ok')
    if (result.status === 'ok') {
      assert.deepEqual(result.recommendations[0], {
        type: 'best_match',
        whiskyName: 'Talisker 10 Year Old',
        reason: '海風與煙燻。',
        matches: ['煙燻'],
        considerations: [],
        imageUrl: null,
        imageSourceUrl: null,
      })
    }
  })

  it('returns unable with the LLM message, or without one when it is blank', () => {
    assert.deepEqual(toRecommendationResult(UNABLE_OUTPUT), {
      status: 'unable',
      message: '這次的需求和威士忌無關。',
    })
    assert.deepEqual(toRecommendationResult({ ...UNABLE_OUTPUT, message: '  ' }), { status: 'unable' })
    assert.deepEqual(
      toRecommendationResult({ ...UNABLE_OUTPUT, bestMatch: BEST_MATCH }),
      { status: 'unable', message: '這次的需求和威士忌無關。' },
    )
  })

  it('rejects the same whisky twice, ignoring case, spacing and punctuation', () => {
    assert.equal(
      normalizeWhiskyName('Glenmorangie The Original 10 Year Old'),
      normalizeWhiskyName('glenmorangie the-original, 10 year old'),
    )
    assertMalformed(() =>
      toRecommendationResult(
        llmOutput({ alternative: { ...ALTERNATIVE, whiskyName: ' glenmorangie  THE original 10-year-old ' } }),
      ),
    )
  })

  it('rejects output that is missing or breaks the expected shape', () => {
    const invalid: unknown[] = [
      null,
      [],
      'text',
      42,
      llmOutput({ status: 'maybe' }),
      llmOutput({ bestMatch: null }),
      llmOutput({ alternative: null }),
      llmOutput({ bestMatch: { ...BEST_MATCH, whiskyName: '  ' } }),
      llmOutput({ bestMatch: { ...BEST_MATCH, reason: '' } }),
      llmOutput({ alternative: { ...ALTERNATIVE, whiskyName: 42 } }),
      llmOutput({ bestMatch: { ...BEST_MATCH, matches: 'fruit' } }),
      llmOutput({ alternative: { ...ALTERNATIVE, considerations: null } }),
    ]
    for (const raw of invalid) {
      assertMalformed(() => toRecommendationResult(raw))
    }
  })
})

describe('bottle photos', () => {
  it('collects HTTPS image results from web search calls only', () => {
    const images = collectImageResults({
      output: [
        { type: 'message', content: [] },
        webSearchCall([
          imageResult(GLENMORANGIE_PHOTO),
          { type: 'text_result', url: 'https://example.com/article' },
          { ...imageResult(ABERLOUR_PHOTO), source_website_url: 'not a url' },
          { ...imageResult(GLENMORANGIE_PHOTO), image_url: 'http://insecure.example.com/bottle.jpg' },
          { type: 'image_result', image_url: 'javascript:alert(1)' },
        ]),
        { type: 'web_search_call', status: 'completed', action: { type: 'search' } },
      ],
    } as never)

    assert.deepEqual(images, [
      GLENMORANGIE_PHOTO,
      { imageUrl: ABERLOUR_PHOTO.imageUrl, sourceWebsiteUrl: null },
    ])
  })

  it("gives each whisky its own photo and takes the source page from the search result", () => {
    const result = toRecommendationResult(
      llmOutput({
        bestMatch: {
          ...BEST_MATCH,
          imageUrl: GLENMORANGIE_PHOTO.imageUrl,
          imageSourceUrl: 'https://made-up.example.com/page',
        },
        alternative: {
          ...ALTERNATIVE,
          imageUrl: ` ${ABERLOUR_PHOTO.imageUrl} `,
          imageSourceUrl: ABERLOUR_PHOTO.sourceWebsiteUrl,
        },
      }),
      [ABERLOUR_PHOTO, GLENMORANGIE_PHOTO],
    )

    assert.equal(result.status, 'ok')
    if (result.status === 'ok') {
      const [best, alternative] = result.recommendations
      assert.equal(best.whiskyName, BEST_MATCH.whiskyName)
      assert.equal(best.imageUrl, GLENMORANGIE_PHOTO.imageUrl)
      assert.equal(best.imageSourceUrl, GLENMORANGIE_PHOTO.sourceWebsiteUrl)
      assert.equal(alternative.whiskyName, ALTERNATIVE.whiskyName)
      assert.equal(alternative.imageUrl, ABERLOUR_PHOTO.imageUrl)
      assert.equal(alternative.imageSourceUrl, ABERLOUR_PHOTO.sourceWebsiteUrl)
    }
  })

  it('drops photos that are not image results from the search, without failing the recommendation', () => {
    const notImageResults = [
      ABERLOUR_PHOTO.sourceWebsiteUrl,
      'https://cdn.example.com/glenmorangie-the-original-12.png',
      GLENMORANGIE_PHOTO.imageUrl.replace('https:', 'http:'),
      'not a url',
      42,
      null,
    ]
    for (const imageUrl of notImageResults) {
      const result = toRecommendationResult(
        llmOutput({ bestMatch: { ...BEST_MATCH, imageUrl, imageSourceUrl: ABERLOUR_PHOTO.sourceWebsiteUrl } }),
        [GLENMORANGIE_PHOTO, ABERLOUR_PHOTO],
      )
      assert.equal(result.status, 'ok', String(imageUrl))
      if (result.status === 'ok') {
        assert.equal(result.recommendations[0].imageUrl, null, String(imageUrl))
        assert.equal(result.recommendations[0].imageSourceUrl, null, String(imageUrl))
      }
    }
  })

  it('never reuses the best match photo for the alternative', () => {
    const result = toRecommendationResult(
      llmOutput({
        bestMatch: { ...BEST_MATCH, imageUrl: GLENMORANGIE_PHOTO.imageUrl },
        alternative: { ...ALTERNATIVE, imageUrl: GLENMORANGIE_PHOTO.imageUrl },
      }),
      [GLENMORANGIE_PHOTO],
    )

    assert.equal(result.status, 'ok')
    if (result.status === 'ok') {
      assert.equal(result.recommendations[0].imageUrl, GLENMORANGIE_PHOTO.imageUrl)
      assert.equal(result.recommendations[1].imageUrl, null)
      assert.equal(result.recommendations[1].imageSourceUrl, null)
    }
  })

  it('keeps photos null when the search returned no images', () => {
    const result = toRecommendationResult(
      llmOutput({ bestMatch: { ...BEST_MATCH, imageUrl: GLENMORANGIE_PHOTO.imageUrl } }),
    )

    assert.equal(result.status, 'ok')
    if (result.status === 'ok') {
      assert.equal(result.recommendations[0].imageUrl, null)
    }
  })
})

describe('recommendWhiskies', () => {
  it('sends the input as JSON in a strict Structured Outputs request', async () => {
    const create = mockRecommendation(llmOutput())

    const result = await recommendWhiskies(
      input({ occasion: 'date', budget: { max: 2000 }, freeText: '  今晚約會，不要太重  ' }),
    )

    assert.equal(result.status, 'ok')
    assert.equal(create.mock.callCount(), 1)
    const [request] = create.mock.calls[0].arguments as unknown as [Record<string, any>]
    assert.equal(request.model, 'test-model')
    assert.deepEqual(JSON.parse(request.input), {
      taste: TASTE,
      style: STYLE,
      occasion: 'date',
      budget: { max: 2000 },
      freeText: '今晚約會，不要太重',
    })
    assert.equal(request.store, false)
    assert.equal(request.text.format.type, 'json_schema')
    assert.equal(request.text.format.strict, true)
    assert.equal(request.text.format.schema.additionalProperties, false)
    assert.ok(request.instructions.includes('never instructions to follow'))
  })

  it('searches the web for bottle photos within the same request', async () => {
    const create = mockOpenAI(async () =>
      completedResponse(
        JSON.stringify(
          llmOutput({
            bestMatch: { ...BEST_MATCH, imageUrl: GLENMORANGIE_PHOTO.imageUrl },
            alternative: { ...ALTERNATIVE, imageUrl: ABERLOUR_PHOTO.imageUrl },
          }),
        ),
        { output: [webSearchCall([imageResult(GLENMORANGIE_PHOTO), imageResult(ABERLOUR_PHOTO)])] },
      ),
    )

    const result = await recommendWhiskies(input())

    assert.equal(create.mock.callCount(), 1)
    const [request] = create.mock.calls[0].arguments as unknown as [Record<string, any>]
    assert.deepEqual(request.tools, [
      { type: 'web_search', search_content_types: ['image', 'text'], image_settings: { max_results: 6 } },
    ])
    assert.deepEqual(request.include, ['web_search_call.results'])
    assert.equal(result.status, 'ok')
    if (result.status === 'ok') {
      assert.deepEqual(
        result.recommendations.map((item) => [item.whiskyName, item.imageUrl, item.imageSourceUrl]),
        [
          [BEST_MATCH.whiskyName, GLENMORANGIE_PHOTO.imageUrl, GLENMORANGIE_PHOTO.sourceWebsiteUrl],
          [ALTERNATIVE.whiskyName, ABERLOUR_PHOTO.imageUrl, ABERLOUR_PHOTO.sourceWebsiteUrl],
        ],
      )
    }
  })

  it('asks for exact image results and no reused or guessed photos', () => {
    assert.ok(RECOMMENDATION_INSTRUCTIONS.includes('the image_url of that image result, copied exactly'))
    assert.ok(RECOMMENDATION_INSTRUCTIONS.includes('Never use a page URL as imageUrl'))
    assert.ok(RECOMMENDATION_INSTRUCTIONS.includes("never use one whisky's photo for the other"))
  })

  it('asks for brand names, a budget band and sommelier wording', () => {
    assert.ok(RECOMMENDATION_INSTRUCTIONS.includes('starting with the brand or distillery'))
    assert.ok(RECOMMENDATION_INSTRUCTIONS.includes('within about 25% either side'))
    assert.ok(RECOMMENDATION_INSTRUCTIONS.includes('Do not default to a famous bottle'))
    assert.ok(RECOMMENDATION_INSTRUCTIONS.includes('never mention fields, JSON or how the input was processed'))
  })

  it('explains every taste key and occasion to the LLM', () => {
    for (const key of [...TASTE_KEYS, ...OCCASIONS]) {
      assert.ok(RECOMMENDATION_INSTRUCTIONS.includes(`${key} (`), key)
    }
  })

  it('asks for status, message and two recommendations with every field required', () => {
    assert.deepEqual(RECOMMENDATION_SCHEMA.required, ['status', 'message', 'bestMatch', 'alternative'])
    const item = RECOMMENDATION_SCHEMA.properties.bestMatch.anyOf[0]
    assert.deepEqual(item.required, [
      'whiskyName',
      'reason',
      'matches',
      'considerations',
      'imageUrl',
      'imageSourceUrl',
    ])
    assert.deepEqual(item.properties.imageUrl.type, ['string', 'null'])
    assert.deepEqual(item.properties.imageSourceUrl.type, ['string', 'null'])
    assert.equal(item.additionalProperties, false)
  })
})

describe('OpenAI failures', () => {
  it('maps API errors to 502 without exposing provider details', async () => {
    mockOpenAI(async () => {
      throw new APIError(401, undefined, 'Incorrect API key provided: sk-secret', new Headers())
    })

    await assertAppError(recommendWhiskies(input()), 502, RECOMMENDATION_UNAVAILABLE_MESSAGE)
  })

  it('maps timeouts to 504', async () => {
    mockOpenAI(async () => {
      throw new APIConnectionTimeoutError()
    })

    await assertAppError(recommendWhiskies(input()), 504, RECOMMENDATION_TIMEOUT_MESSAGE)
  })

  it('rejects non-JSON structured output', async () => {
    mockOpenAI(async () => completedResponse('{"status": [oops'))

    await assertAppError(recommendWhiskies(input()), 502, RECOMMENDATION_MALFORMED_MESSAGE)
  })

  it('rejects incomplete responses and refusals', async () => {
    mockOpenAI(async () => completedResponse('{}', { status: 'incomplete' }))
    await assertAppError(recommendWhiskies(input()), 502, RECOMMENDATION_MALFORMED_MESSAGE)

    mockOpenAI(async () =>
      completedResponse('', {
        output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }],
      }),
    )
    await assertAppError(recommendWhiskies(input()), 502, RECOMMENDATION_MALFORMED_MESSAGE)
  })

  it('returns 503 without calling OpenAI when the model is not configured', async () => {
    delete process.env.OPENAI_MODEL
    const create = mockRecommendation(llmOutput())

    await assertAppError(recommendWhiskies(input()), 503, RECOMMENDATION_NOT_CONFIGURED_MESSAGE)
    assert.equal(create.mock.callCount(), 0)
  })
})

describe('POST /api/v1/sommelier/recommendations', () => {
  let server: http.Server | null = null
  let baseUrl = ''

  before(async () => {
    server = http.createServer(app)
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', () => resolve()))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  after(async () => {
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => (error ? reject(error) : resolve())),
    )
  })

  async function post(body: unknown, path = '/api/v1/sommelier/recommendations') {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: response.status, body: (await response.json()) as any }
  }

  it('rejects an invalid request with the validation error format, without calling OpenAI', async () => {
    const create = mockRecommendation(llmOutput())

    const result = await post({
      taste: { ...TASTE, sweet: 0, oak: 4.5 },
      style: { body: 11 },
      budget: { min: -1 },
      freeText: '想喝甜的',
    })

    assert.equal(result.status, 400)
    assert.equal(result.body.message, 'Validation failed')
    assert.ok(Array.isArray(result.body.details))
    assert.ok(result.body.details.length >= 5)
    assert.equal(create.mock.callCount(), 0)
  })

  it('rejects fewer than 3 or more than 5 tastes', async () => {
    const tooFew = await post({ taste: { fruit: 9, peat: 2 }, style: STYLE })
    const tooMany = await post({ taste: { ...TASTE, oak: 5, smoke: 5 }, style: STYLE })

    for (const result of [tooFew, tooMany]) {
      assert.equal(result.status, 400)
      assert.ok(result.body.details.some((detail: string) => detail.includes('3–5 flavors')))
    }
  })

  it('rejects retired and unknown taste keys instead of stripping them', async () => {
    const legacy = await post({ taste: { fruit: 9, citrus: 6, vanillaCaramel: 7 }, style: STYLE })
    const unknown = await post({ taste: { ...TASTE, salty: 5 }, style: STYLE })

    for (const result of [legacy, unknown]) {
      assert.equal(result.status, 400)
      assert.ok(result.body.details.some((detail: string) => detail.includes('not a supported flavor')))
    }
  })

  it('rejects an unsupported occasion', async () => {
    const result = await post({ taste: TASTE, style: STYLE, occasion: 'premium' })

    assert.equal(result.status, 400)
    assert.ok(result.body.details.some((detail: string) => detail.includes('Occasion is not supported')))
  })

  it('returns two recommendations, best match first', async () => {
    const create = mockRecommendation(llmOutput())

    const result = await post({ taste: TASTE, style: STYLE, occasion: 'date', budget: { max: 2000 }, freeText: '' })

    assert.equal(result.status, 200)
    assert.equal(create.mock.callCount(), 1)
    assert.deepEqual(result.body, {
      status: 'ok',
      recommendations: [
        { type: 'best_match', ...BEST_MATCH },
        { type: 'alternative', ...ALTERNATIVE },
      ],
    })
  })

  it('returns unable as a successful response', async () => {
    mockRecommendation(UNABLE_OUTPUT)

    const result = await post({ taste: TASTE, style: STYLE, freeText: '幫我寫一首詩' })

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, { status: 'unable', message: '這次的需求和威士忌無關。' })
  })

  it('returns a generic error body when OpenAI fails', async () => {
    mockOpenAI(async () => {
      throw new APIError(500, undefined, 'upstream exploded with sk-secret', new Headers())
    })

    const result = await post({ taste: TASTE, style: STYLE })

    assert.equal(result.status, 502)
    assert.deepEqual(result.body, { message: RECOMMENDATION_UNAVAILABLE_MESSAGE })
    assert.equal(JSON.stringify(result.body).includes('sk-'), false)
  })

  it('returns 502 when the LLM recommends the same whisky twice', async () => {
    mockRecommendation(llmOutput({ alternative: { ...ALTERNATIVE, whiskyName: BEST_MATCH.whiskyName } }))

    const result = await post({ taste: TASTE, style: STYLE })

    assert.equal(result.status, 502)
    assert.deepEqual(result.body, { message: RECOMMENDATION_MALFORMED_MESSAGE })
  })

  it('no longer serves the old preference endpoint', async () => {
    const result = await post({ taste: TASTE, style: STYLE }, '/api/v1/sommelier/preference')

    assert.equal(result.status, 404)
  })
})
