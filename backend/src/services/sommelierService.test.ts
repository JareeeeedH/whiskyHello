/**
 * Sommelier Preference tests.
 * OpenAI is always mocked; no API key or database is required.
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { APIConnectionTimeoutError, APIError } from 'openai'
import app from '../app'
import type { SommelierInput, StyleProfile, TasteProfile } from '../types/sommelier'
import { AppError } from '../utils/AppError'
import {
  EXTRACTION_MALFORMED_MESSAGE,
  EXTRACTION_NOT_CONFIGURED_MESSAGE,
  EXTRACTION_TIMEOUT_MESSAGE,
  EXTRACTION_UNAVAILABLE_MESSAGE,
  PREFERENCE_EXTRACTION_SCHEMA,
  setOpenAIClientForTests,
  type PreferenceLLMClient,
} from './openaiPreferenceExtractor'
import { buildPreference, mergePreference, sanitizeExtraction } from './sommelierService'

const originalModel = process.env.OPENAI_MODEL
const originalKey = process.env.OPENAI_API_KEY

/** 3 picked tastes from each group; the other six are not provided. */
const TASTE: TasteProfile = {
  sweet: 8,
  fruit: 9,
  floral: 6,
  chocolateCoffee: 8,
  peat: 2,
  smoke: 1,
}

const STYLE: StyleProfile = { body: 8, intensity: 6, smoothness: 9 }

/** A strict Structured Outputs payload: every key present, missing values as null. */
function llmOutput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    budget: null,
    occasion: null,
    mood: null,
    companion: null,
    ...overrides,
  }
}

function completedResponse(outputText: string, extra: Record<string, unknown> = {}) {
  return { status: 'completed', output: [], output_text: outputText, ...extra }
}

function mockOpenAI(impl: () => Promise<unknown>) {
  const create = mock.fn(impl)
  setOpenAIClientForTests({ responses: { create } } as unknown as PreferenceLLMClient)
  return create
}

function mockExtraction(payload: Record<string, unknown>) {
  return mockOpenAI(async () => completedResponse(JSON.stringify(payload)))
}

function input(overrides: Partial<SommelierInput> = {}): SommelierInput {
  return { taste: { ...TASTE }, style: { ...STYLE }, ...overrides }
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
  setOpenAIClientForTests(null)
  mock.restoreAll()
  if (originalModel === undefined) delete process.env.OPENAI_MODEL
  else process.env.OPENAI_MODEL = originalModel
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalKey
})

describe('buildPreference without freeText', () => {
  it('does not call OpenAI when freeText is absent or blank', async () => {
    const create = mockExtraction(llmOutput({ mood: 'positive' }))

    await buildPreference(input())
    await buildPreference(input({ freeText: '   ' }))

    assert.equal(create.mock.callCount(), 0)
  })

  it('returns the picked taste and 3 style ratings exactly as entered, plus budget', async () => {
    const preference = await buildPreference(input({ budget: { max: 4000 } }))

    assert.deepEqual(preference, { taste: TASTE, style: STYLE, budget: { max: 4000 } })
    assert.deepEqual(Object.keys(preference.style), ['body', 'intensity', 'smoothness'])
  })

  it('keeps unpicked tastes absent: not 1, not 5', async () => {
    const preference = await buildPreference(input())

    for (const key of ['driedFruit', 'citrus', 'vanillaCaramel', 'nutty', 'spice', 'oak']) {
      assert.equal(key in preference.taste, false, key)
    }
  })

  it('orders the picked tastes canonically', async () => {
    const preference = await buildPreference(
      input({ taste: { smoke: 1, floral: 6, sweet: 8, peat: 2, fruit: 9, chocolateCoffee: 8 } }),
    )

    assert.deepEqual(Object.keys(preference.taste), ['sweet', 'fruit', 'floral', 'chocolateCoffee', 'peat', 'smoke'])
  })

  it('works without OpenAI configuration', async () => {
    delete process.env.OPENAI_MODEL
    delete process.env.OPENAI_API_KEY

    const preference = await buildPreference(input())
    assert.deepEqual(preference, { taste: TASTE, style: STYLE })
  })
})

describe('buildPreference with freeText', () => {
  it('adds the extracted context and sends a strict Structured Outputs request', async () => {
    const create = mockExtraction(
      llmOutput({
        budget: { min: null, max: 2000 },
        occasion: 'relaxing',
        mood: 'low',
        companion: 'alone',
      }),
    )

    const preference = await buildPreference(
      input({
        budget: { max: 4000 },
        freeText: '  今天工作很累，想一個人慢慢喝，2000 以內  ',
      }),
    )

    assert.deepEqual(preference, {
      taste: TASTE,
      style: STYLE,
      budget: { max: 2000 },
      occasion: 'relaxing',
      mood: 'low',
      companion: 'alone',
    })

    assert.equal(create.mock.callCount(), 1)
    const [request] = create.mock.calls[0].arguments as unknown as [Record<string, any>]
    assert.equal(request.model, 'test-model')
    assert.equal(request.input, '今天工作很累，想一個人慢慢喝，2000 以內')
    assert.equal(request.store, false)
    assert.equal(request.text.format.type, 'json_schema')
    assert.equal(request.text.format.strict, true)
    assert.equal(request.text.format.schema.additionalProperties, false)
  })

  it('never lets freeText change the slider taste or style values', async () => {
    mockExtraction(
      llmOutput({
        taste: { sweet: 1, smoke: 10 },
        style: { smoothness: 1 },
        dislikes: ['sweet'],
        intensity: { peaty: 100 },
        mood: 'low',
      }),
    )

    const preference = await buildPreference(
      input({ freeText: '今天工作很累，想一個人慢慢喝，希望不要太刺激，重煙燻、不要甜' }),
    )

    assert.deepEqual(preference.taste, TASTE)
    assert.deepEqual(preference.style, STYLE)
    assert.equal(preference.mood, 'low')
    assert.deepEqual(Object.keys(preference).sort(), ['mood', 'style', 'taste'])
  })

  it('returns the slider-only Preference when the extraction is empty', async () => {
    mockExtraction(llmOutput())
    const sliders = input({ budget: { max: 2500 } })

    const preference = await buildPreference({ ...sliders, freeText: '隨便推薦' })

    assert.deepEqual(preference, await buildPreference(sliders))
  })

  it('no longer asks the LLM for flavor fields', () => {
    assert.deepEqual(PREFERENCE_EXTRACTION_SCHEMA.required, ['budget', 'occasion', 'mood', 'companion'])
    assert.equal('taste' in PREFERENCE_EXTRACTION_SCHEMA.properties, false)
    assert.equal('dislikes' in PREFERENCE_EXTRACTION_SCHEMA.properties, false)
  })
})

describe('sanitizeExtraction', () => {
  it('removes values outside the allowed enums and unknown fields', () => {
    const extraction = sanitizeExtraction(
      llmOutput({
        budget: { min: -100, max: 'cheap' },
        occasion: 'party',
        mood: 'ecstatic',
        companion: 'coworker',
        temperature: 'cold',
        taste: [{ tag: 'sweet', level: 'high' }],
      }),
    )

    assert.deepEqual(extraction, {})
  })

  it('keeps valid context values', () => {
    assert.deepEqual(
      sanitizeExtraction(
        llmOutput({ budget: { min: 1000, max: null }, occasion: 'date', mood: 'positive', companion: 'partner' }),
      ),
      { budget: { min: 1000 }, occasion: 'date', mood: 'positive', companion: 'partner' },
    )
  })

  it('rejects output that is not a JSON object', () => {
    for (const raw of [null, [], 'text', 42]) {
      assert.throws(
        () => sanitizeExtraction(raw),
        (error: unknown) =>
          error instanceof AppError &&
          error.statusCode === 502 &&
          error.message === EXTRACTION_MALFORMED_MESSAGE,
      )
    }
  })
})

describe('mergePreference', () => {
  it('copies only known taste and style keys', () => {
    const preference = mergePreference(
      input({
        taste: { ...TASTE, salty: 9 } as TasteProfile,
        style: { ...STYLE, sweetness: 3 } as StyleProfile,
      }),
      {},
    )

    assert.deepEqual(preference.taste, TASTE)
    assert.deepEqual(preference.style, STYLE)
  })

  it('merges budget min and max independently, as before', () => {
    const sliders = input({ budget: { min: 1000, max: 3000 } })
    const merge = (budget: unknown) =>
      mergePreference(sliders, sanitizeExtraction(llmOutput({ budget }))).budget

    assert.deepEqual(merge({ min: null, max: 2000 }), { min: 1000, max: 2000 })
    assert.deepEqual(merge({ min: 1500, max: null }), { min: 1500, max: 3000 })
    assert.deepEqual(merge({ min: 0, max: 5000 }), { min: 0, max: 5000 })
    assert.deepEqual(merge(null), { min: 1000, max: 3000 })
    assert.deepEqual(
      mergePreference(input(), sanitizeExtraction(llmOutput({ budget: { min: null, max: 800 } })))
        .budget,
      { max: 800 },
    )
    assert.equal('budget' in mergePreference(input(), sanitizeExtraction(llmOutput())), false)
  })

  it('takes occasion, mood and companion only from the LLM', () => {
    const preference = mergePreference(
      input(),
      sanitizeExtraction(llmOutput({ occasion: 'gift', mood: 'stressed', companion: 'family' })),
    )
    assert.equal(preference.occasion, 'gift')
    assert.equal(preference.mood, 'stressed')
    assert.equal(preference.companion, 'family')

    const empty = mergePreference(input(), sanitizeExtraction(llmOutput()))
    assert.equal('occasion' in empty, false)
    assert.equal('mood' in empty, false)
    assert.equal('companion' in empty, false)
  })
})

describe('OpenAI failures', () => {
  const withFreeText = input({ freeText: '想喝甜的' })

  it('maps API errors to 502 without exposing provider details', async () => {
    mockOpenAI(async () => {
      throw new APIError(401, undefined, 'Incorrect API key provided: sk-secret', new Headers())
    })

    await assertAppError(buildPreference(withFreeText), 502, EXTRACTION_UNAVAILABLE_MESSAGE)
  })

  it('maps timeouts to 504', async () => {
    mockOpenAI(async () => {
      throw new APIConnectionTimeoutError()
    })

    await assertAppError(buildPreference(withFreeText), 504, EXTRACTION_TIMEOUT_MESSAGE)
  })

  it('rejects non-JSON structured output', async () => {
    mockOpenAI(async () => completedResponse('{"budget": [oops'))

    await assertAppError(buildPreference(withFreeText), 502, EXTRACTION_MALFORMED_MESSAGE)
  })

  it('rejects incomplete responses and refusals', async () => {
    mockOpenAI(async () => completedResponse('{}', { status: 'incomplete' }))
    await assertAppError(buildPreference(withFreeText), 502, EXTRACTION_MALFORMED_MESSAGE)

    mockOpenAI(async () =>
      completedResponse('', {
        output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }],
      }),
    )
    await assertAppError(buildPreference(withFreeText), 502, EXTRACTION_MALFORMED_MESSAGE)
  })

  it('returns 503 without calling OpenAI when the model is not configured', async () => {
    delete process.env.OPENAI_MODEL
    const create = mockExtraction(llmOutput())

    await assertAppError(buildPreference(withFreeText), 503, EXTRACTION_NOT_CONFIGURED_MESSAGE)
    assert.equal(create.mock.callCount(), 0)
  })
})

describe('POST /api/v1/sommelier/preference', () => {
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

  async function post(body: unknown): Promise<{ status: number; body: any }> {
    const response = await fetch(`${baseUrl}/api/v1/sommelier/preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  }

  it('rejects an invalid request with the validation error format', async () => {
    const create = mockExtraction(llmOutput())

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

  it('rejects the legacy flavor-tag request', async () => {
    const result = await post({ taste: ['sweet'], intensity: { peaty: 20, smoky: 0 }, budget: { max: 2000 } })

    assert.equal(result.status, 400)
  })

  it('rejects taste that does not have exactly 3 picks per group', async () => {
    const result = await post({ taste: { ...TASTE, oak: 5 }, style: STYLE })

    assert.equal(result.status, 400)
    assert.ok(result.body.details.some((detail: string) => detail.includes('exactly 3')))
  })

  it('returns the full Preference profile without calling OpenAI', async () => {
    const create = mockExtraction(llmOutput())

    const result = await post({ taste: TASTE, style: STYLE, budget: { max: 4000 }, freeText: '' })

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, {
      preference: { taste: TASTE, style: STYLE, budget: { max: 4000 } },
    })
    assert.equal(create.mock.callCount(), 0)
  })

  it('returns sliders unchanged plus freeText context', async () => {
    const create = mockExtraction(llmOutput({ occasion: 'relaxing', mood: 'low', companion: 'alone' }))

    const result = await post({
      taste: TASTE,
      style: STYLE,
      budget: { max: 4000 },
      freeText: '今天工作很累，想一個人慢慢喝，希望不要太刺激。',
    })

    assert.equal(result.status, 200)
    assert.equal(create.mock.callCount(), 1)
    assert.deepEqual(result.body.preference, {
      taste: TASTE,
      style: STYLE,
      budget: { max: 4000 },
      occasion: 'relaxing',
      mood: 'low',
      companion: 'alone',
    })
  })

  it('returns a generic error body when OpenAI fails', async () => {
    mockOpenAI(async () => {
      throw new APIError(500, undefined, 'upstream exploded with sk-secret', new Headers())
    })

    const result = await post({ taste: TASTE, style: STYLE, freeText: '想喝甜的' })

    assert.equal(result.status, 502)
    assert.deepEqual(result.body, { message: EXTRACTION_UNAVAILABLE_MESSAGE })
    assert.equal(JSON.stringify(result.body).includes('sk-'), false)
  })
})
