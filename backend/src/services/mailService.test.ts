import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { AppError } from '../utils/AppError'
import {
  MAIL_SEND_FAILED_MESSAGE,
  RESEND_API_URL,
  sendVerificationCode,
} from './mailService'

const MAIL_ENV_KEYS = ['RESEND_API_KEY', 'MAIL_FROM', 'SMTP_USER', 'SMTP_PASS'] as const

type CapturedRequest = { url: string; init: RequestInit }

describe('mailService verification code delivery', () => {
  const originalFetch = globalThis.fetch
  const originalEnv: Record<string, string | undefined> = {}
  let captured: CapturedRequest[] = []

  function stubFetch(respond: () => Promise<Response>): void {
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      captured.push({ url: String(input), init: init ?? {} })
      return respond()
    }) as typeof fetch
  }

  function isMailSendFailure(error: unknown): boolean {
    return (
      error instanceof AppError &&
      error.statusCode === 503 &&
      error.message === MAIL_SEND_FAILED_MESSAGE
    )
  }

  beforeEach(() => {
    captured = []
    for (const key of MAIL_ENV_KEYS) {
      originalEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    for (const key of MAIL_ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = originalEnv[key]
      }
    }
  })

  it('sends through Resend with the code in the subject when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    process.env.MAIL_FROM = 'WhiskyHello <noreply@whiskyhello.com>'
    stubFetch(async () => new Response(JSON.stringify({ id: 'email_1' }), { status: 200 }))

    await sendVerificationCode('user@example.com', '123456', 'register')

    assert.equal(captured.length, 1)
    const [request] = captured
    assert.equal(request.url, RESEND_API_URL)
    assert.equal(request.init.method, 'POST')
    const headers = request.init.headers as Record<string, string>
    assert.equal(headers.Authorization, 'Bearer re_test_key')
    assert.ok(request.init.signal, 'request must have a timeout signal')

    const body = JSON.parse(String(request.init.body))
    assert.equal(body.from, 'WhiskyHello <noreply@whiskyhello.com>')
    assert.deepEqual(body.to, ['user@example.com'])
    assert.equal(body.subject, 'WhiskyHello 驗證碼：123456')
    assert.match(body.text, /123456/)
  })

  it('uses the password reset wording for passwordReset', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    stubFetch(async () => new Response('{}', { status: 200 }))

    await sendVerificationCode('user@example.com', '654321', 'passwordReset')

    const body = JSON.parse(String(captured[0].init.body))
    assert.equal(body.subject, 'WhiskyHello 密碼重設驗證碼：654321')
    assert.match(body.text, /你的密碼不會被變更/)
  })

  it('defaults the sender to noreply@whiskyhello.com when MAIL_FROM is empty', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    stubFetch(async () => new Response('{}', { status: 200 }))

    await sendVerificationCode('user@example.com', '123456', 'register')

    const body = JSON.parse(String(captured[0].init.body))
    assert.equal(body.from, 'WhiskyHello <noreply@whiskyhello.com>')
  })

  it('returns 503 when Resend responds with an error status', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    stubFetch(async () => new Response('{"message":"invalid"}', { status: 422 }))

    await assert.rejects(
      sendVerificationCode('user@example.com', '123456', 'register'),
      isMailSendFailure,
    )
  })

  it('returns 503 when the Resend request fails or times out', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    stubFetch(async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    })

    await assert.rejects(
      sendVerificationCode('user@example.com', '123456', 'register'),
      isMailSendFailure,
    )
  })

  it('does not call Resend when no mail provider is configured in development', async () => {
    stubFetch(async () => new Response('{}', { status: 200 }))

    await sendVerificationCode('user@example.com', '123456', 'register')

    assert.equal(captured.length, 0)
  })
})
