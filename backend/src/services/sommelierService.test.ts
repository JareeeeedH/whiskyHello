/**
 * Sommelier Step 2 (Preference Extraction) tests.
 * OpenAI is always mocked; no API key or database is required.
 */
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test'
import { APIConnectionTimeoutError, APIError } from 'openai'
import app from '../app'
import type { SommelierInput } from '../types/sommelier'
import { AppError } from '../utils/AppError'
import {
  EXTRACTION_MALFORMED_MESSAGE,
  EXTRACTION_NOT_CONFIGURED_MESSAGE,
  EXTRACTION_TIMEOUT_MESSAGE,
  EXTRACTION_UNAVAILABLE_MESSAGE,
  setOpenAIClientForTests,
  type PreferenceLLMClient,
} from './openaiPreferenceExtractor'
import { buildPreference, mergePreference, sanitizeExtraction } from './sommelierService'

const originalModel = process.env.OPENAI_MODEL
const originalKey = process.env.OPENAI_API_KEY

/** A strict Structured Outputs payload: every key present, missing values as null / []. */
function llmOutput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    taste: [],
    dislikes: [],
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
  return { taste: [], dislikes: [], ...overrides }
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

    await buildPreference(input({ taste: ['sweet'] }))
    await buildPreference(input({ taste: ['sweet'], freeText: '   ' }))

    assert.equal(create.mock.callCount(), 0)
  })

  it('converts Step 1 input directly with medium taste levels', async () => {
    const preference = await buildPreference(
      input({
        taste: ['fruity', 'vanilla'],
        dislikes: ['peaty'],
        budget: { min: 1000, max: 3000 },
        occasion: 'relaxing',
      }),
    )

    assert.deepEqual(preference, {
      taste: [
        { tag: 'fruity', level: 'medium' },
        { tag: 'vanilla', level: 'medium' },
      ],
      dislikes: ['peaty'],
      budget: { min: 1000, max: 3000 },
      occasion: 'relaxing',
    })
  })

  it('works without OpenAI configuration', async () => {
    delete process.env.OPENAI_MODEL
    delete process.env.OPENAI_API_KEY

    const preference = await buildPreference(input({ taste: ['smoky'] }))
    assert.deepEqual(preference.taste, [{ tag: 'smoky', level: 'medium' }])
  })
})

describe('buildPreference with freeText', () => {
  it('merges a valid extraction (spec §4.8 example) and sends a strict Structured Outputs request', async () => {
    const create = mockExtraction(
      llmOutput({
        taste: [{ tag: 'sweet', level: 'high' }],
        dislikes: ['smoky'],
        budget: { min: null, max: 2000 },
        occasion: 'date',
        mood: 'positive',
        companion: 'date',
      }),
    )

    const preference = await buildPreference({
      taste: ['smoky', 'fruity'],
      dislikes: [],
      budget: { min: 1000, max: 3000 },
      occasion: 'relaxing',
      freeText: '  今晚約會，心情很好，想喝很甜的，不要煙燻，2000 以內  ',
    })

    assert.deepEqual(preference, {
      taste: [
        { tag: 'fruity', level: 'medium' },
        { tag: 'sweet', level: 'high' },
      ],
      dislikes: ['smoky'],
      budget: { min: 1000, max: 2000 },
      occasion: 'date',
      mood: 'positive',
      companion: 'date',
    })

    assert.equal(create.mock.callCount(), 1)
    const [request] = create.mock.calls[0].arguments as unknown as [Record<string, any>]
    assert.equal(request.model, 'test-model')
    assert.equal(request.input, '今晚約會，心情很好，想喝很甜的，不要煙燻，2000 以內')
    assert.equal(request.store, false)
    assert.equal(request.text.format.type, 'json_schema')
    assert.equal(request.text.format.strict, true)
    assert.equal(request.text.format.schema.additionalProperties, false)
  })

  it('returns the Step 1 conversion when the extraction is empty', async () => {
    mockExtraction(llmOutput())
    const step1 = input({
      taste: ['woody'],
      dislikes: ['maritime'],
      budget: { max: 2500 },
      occasion: 'meal',
    })

    const preference = await buildPreference({ ...step1, freeText: '隨便推薦' })

    assert.deepEqual(preference, await buildPreference(step1))
  })
})

describe('sanitizeExtraction', () => {
  it('removes unsupported flavor tags', () => {
    const extraction = sanitizeExtraction(
      llmOutput({
        taste: [
          { tag: 'salty', level: 'high' },
          { tag: 'fruity', level: 'low' },
        ],
        dislikes: ['umami', 'peaty'],
      }),
    )

    assert.deepEqual(extraction.taste, [{ tag: 'fruity', level: 'low' }])
    assert.deepEqual(extraction.dislikes, ['peaty'])
  })

  it('removes values outside the allowed enums and unknown fields', () => {
    const extraction = sanitizeExtraction(
      llmOutput({
        taste: [{ tag: 'sweet', level: 'extreme' }, { tag: 'spicy' }, 'woody'],
        budget: { min: -100, max: 'cheap' },
        occasion: 'party',
        mood: 'ecstatic',
        companion: 'coworker',
        temperature: 'cold',
      }),
    )

    assert.deepEqual(extraction, { taste: [], dislikes: [] })
  })

  it('drops duplicate tags, keeping the first occurrence', () => {
    const extraction = sanitizeExtraction(
      llmOutput({
        taste: [
          { tag: 'sweet', level: 'low' },
          { tag: 'sweet', level: 'high' },
        ],
        dislikes: ['peaty', 'peaty'],
      }),
    )

    assert.deepEqual(extraction.taste, [{ tag: 'sweet', level: 'low' }])
    assert.deepEqual(extraction.dislikes, ['peaty'])
  })

  it('discards a tag the LLM lists as both taste and dislike', () => {
    const extraction = sanitizeExtraction(
      llmOutput({ taste: [{ tag: 'smoky', level: 'high' }], dislikes: ['smoky'] }),
    )

    assert.deepEqual(extraction, { taste: [], dislikes: [] })
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
  it('resolves taste/dislikes conflicts so each tag ends up in one array', () => {
    const preference = mergePreference(
      input({ taste: ['smoky', 'sweet', 'woody'], dislikes: ['peaty', 'floral', 'woody'] }),
      sanitizeExtraction(
        llmOutput({ taste: [{ tag: 'peaty', level: 'high' }], dislikes: ['smoky'] }),
      ),
    )

    assert.deepEqual(preference.taste, [
      { tag: 'sweet', level: 'medium' },
      { tag: 'woody', level: 'medium' },
      { tag: 'peaty', level: 'high' },
    ])
    assert.deepEqual(preference.dislikes, ['floral', 'smoky'])
  })

  it('does not duplicate tags present in both Step 1 and the extraction', () => {
    const preference = mergePreference(
      input({ taste: ['fruity'], dislikes: ['peaty'] }),
      sanitizeExtraction(
        llmOutput({ taste: [{ tag: 'fruity', level: 'medium' }], dislikes: ['peaty', 'smoky'] }),
      ),
    )

    assert.deepEqual(preference.taste, [{ tag: 'fruity', level: 'medium' }])
    assert.deepEqual(preference.dislikes, ['peaty', 'smoky'])
  })

  it('uses the LLM level when a tag appears in both', () => {
    const preference = mergePreference(
      input({ taste: ['sweet', 'vanilla'] }),
      sanitizeExtraction(llmOutput({ taste: [{ tag: 'sweet', level: 'low' }] })),
    )

    assert.deepEqual(preference.taste, [
      { tag: 'sweet', level: 'low' },
      { tag: 'vanilla', level: 'medium' },
    ])
  })

  it('merges budget min and max independently', () => {
    const step1 = input({ budget: { min: 1000, max: 3000 } })
    const merge = (budget: unknown) =>
      mergePreference(step1, sanitizeExtraction(llmOutput({ budget }))).budget

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

  it('overrides occasion with the LLM value and otherwise keeps Step 1', () => {
    const step1 = input({ occasion: 'relaxing' })

    assert.equal(
      mergePreference(step1, sanitizeExtraction(llmOutput({ occasion: 'social' }))).occasion,
      'social',
    )
    assert.equal(
      mergePreference(step1, sanitizeExtraction(llmOutput({ occasion: 'date' }))).occasion,
      'date',
    )
    assert.equal(mergePreference(step1, sanitizeExtraction(llmOutput())).occasion, 'relaxing')
  })

  it('takes mood only from the LLM', () => {
    assert.equal(
      mergePreference(input(), sanitizeExtraction(llmOutput({ mood: 'stressed' }))).mood,
      'stressed',
    )
    assert.equal('mood' in mergePreference(input(), sanitizeExtraction(llmOutput())), false)
  })

  it('passes Step 1 intensity through unchanged, including 0', () => {
    const preference = mergePreference(
      input({ intensity: { peaty: 0, smoky: 65 } }),
      sanitizeExtraction(llmOutput({ taste: [{ tag: 'smoky', level: 'high' }] })),
    )

    assert.deepEqual(preference.intensity, { peaty: 0, smoky: 65 })
    assert.deepEqual(preference.taste, [{ tag: 'smoky', level: 'high' }])
    assert.deepEqual(
      mergePreference(input({ intensity: { smoky: 30 } }), sanitizeExtraction(llmOutput())).intensity,
      { smoky: 30 },
    )
  })

  it('keeps natural-language peat and smoke alongside the unchanged Step 1 intensity', () => {
    const extraction = sanitizeExtraction(
      llmOutput({
        taste: [{ tag: 'sweet', level: 'low' }],
        dislikes: ['smoky'],
      }),
    )

    const preference = mergePreference(input({ intensity: { peaty: 20, smoky: 53 } }), extraction)
    assert.deepEqual(preference.taste, [{ tag: 'sweet', level: 'low' }])
    assert.deepEqual(preference.dislikes, ['smoky'])
    assert.deepEqual(preference.intensity, { peaty: 20, smoky: 53 })
  })

  it('omits intensity when Step 1 has no intensity values', () => {
    assert.equal('intensity' in mergePreference(input(), sanitizeExtraction(llmOutput())), false)
    assert.equal(
      'intensity' in mergePreference(input({ intensity: {} }), sanitizeExtraction(llmOutput())),
      false,
    )
  })

  it('takes companion only from the LLM', () => {
    assert.equal(
      mergePreference(input(), sanitizeExtraction(llmOutput({ companion: 'family' }))).companion,
      'family',
    )
    assert.equal('companion' in mergePreference(input(), sanitizeExtraction(llmOutput())), false)
  })
})

describe('OpenAI failures', () => {
  const withFreeText = input({ taste: ['sweet'], freeText: '想喝甜的' })

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
    mockOpenAI(async () => completedResponse('{"taste": [oops'))

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
      taste: ['salty'],
      dislikes: 'peaty',
      budget: { min: -1 },
      freeText: '想喝甜的',
    })

    assert.equal(result.status, 400)
    assert.equal(result.body.message, 'Validation failed')
    assert.ok(Array.isArray(result.body.details))
    assert.ok(result.body.details.length >= 3)
    assert.equal(create.mock.callCount(), 0)
  })

  it('returns a Preference for Step 1 input without calling OpenAI', async () => {
    const create = mockExtraction(llmOutput())

    const result = await post({ taste: ['sweet'], dislikes: [], freeText: '' })

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, {
      preference: { taste: [{ tag: 'sweet', level: 'medium' }], dislikes: [] },
    })
    assert.equal(create.mock.callCount(), 0)
  })

  it('returns intensity and a max-only budget from the conversational UI', async () => {
    const create = mockExtraction(llmOutput())

    const result = await post({
      taste: ['fruity'],
      dislikes: [],
      intensity: { peaty: 20, smoky: 0 },
      budget: { max: 3500 },
    })

    assert.equal(result.status, 200)
    assert.deepEqual(result.body.preference, {
      taste: [{ tag: 'fruity', level: 'medium' }],
      dislikes: [],
      intensity: { peaty: 20, smoky: 0 },
      budget: { max: 3500 },
    })
    assert.equal(create.mock.callCount(), 0)
  })

  it('accepts the conversational Step 1 contract without dislikes', async () => {
    const create = mockExtraction(llmOutput())

    const result = await post({
      taste: ['sweet', 'fruity'],
      intensity: { peaty: 0, smoky: 30 },
      budget: { max: 2000 },
    })

    assert.equal(result.status, 200)
    assert.deepEqual(result.body.preference, {
      taste: [
        { tag: 'sweet', level: 'medium' },
        { tag: 'fruity', level: 'medium' },
      ],
      dislikes: [],
      intensity: { peaty: 0, smoky: 30 },
      budget: { max: 2000 },
    })
    assert.equal(create.mock.callCount(), 0)
  })

  it('keeps Step 1 intensity unchanged while freeText smoke/peat wording reaches the Preference', async () => {
    const create = mockExtraction(
      llmOutput({ taste: [{ tag: 'sweet', level: 'medium' }], dislikes: ['smoky'], mood: 'low' }),
    )

    const result = await post({
      taste: ['sweet', 'fruity'],
      intensity: { peaty: 20, smoky: 53 },
      budget: { max: 2000 },
      freeText: '今天有點累，想喝甜一點的，但不要太煙燻。',
    })

    assert.equal(result.status, 200)
    assert.equal(create.mock.callCount(), 1)
    assert.deepEqual(result.body.preference, {
      taste: [
        { tag: 'sweet', level: 'medium' },
        { tag: 'fruity', level: 'medium' },
      ],
      dislikes: ['smoky'],
      intensity: { peaty: 20, smoky: 53 },
      budget: { max: 2000 },
      mood: 'low',
    })
  })

  it('keeps intensity alongside the LLM extraction when freeText is provided', async () => {
    const create = mockExtraction(llmOutput({ mood: 'positive', companion: 'date' }))

    const result = await post({
      taste: ['sweet'],
      dislikes: [],
      intensity: { peaty: 0, smoky: 10 },
      budget: { max: 3000 },
      freeText: '今晚約會，想喝舒服一點',
    })

    assert.equal(result.status, 200)
    assert.equal(create.mock.callCount(), 1)
    assert.deepEqual(result.body.preference, {
      taste: [{ tag: 'sweet', level: 'medium' }],
      dislikes: [],
      intensity: { peaty: 0, smoky: 10 },
      budget: { max: 3000 },
      mood: 'positive',
      companion: 'date',
    })
  })

  it('returns the merged Preference when freeText is provided', async () => {
    mockExtraction(llmOutput({ dislikes: ['peaty'], mood: 'low' }))

    const result = await post({ taste: ['fruity'], dislikes: [], freeText: '有點累，不要泥煤' })

    assert.equal(result.status, 200)
    assert.deepEqual(result.body.preference, {
      taste: [{ tag: 'fruity', level: 'medium' }],
      dislikes: ['peaty'],
      mood: 'low',
    })
  })

  it('returns a generic error body when OpenAI fails', async () => {
    mockOpenAI(async () => {
      throw new APIError(500, undefined, 'upstream exploded with sk-secret', new Headers())
    })

    const result = await post({ taste: [], dislikes: [], freeText: '想喝甜的' })

    assert.equal(result.status, 502)
    assert.deepEqual(result.body, { message: EXTRACTION_UNAVAILABLE_MESSAGE })
    assert.equal(JSON.stringify(result.body).includes('sk-'), false)
  })
})
