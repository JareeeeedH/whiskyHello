import nodemailer from 'nodemailer'
import { env, resolveResendConfig, resolveSmtpConfig } from '../config/env'
import { AppError } from '../utils/AppError'

export const MAIL_SEND_FAILED_MESSAGE = 'Failed to send verification email'

export const RESEND_API_URL = 'https://api.resend.com/emails'
export const RESEND_TIMEOUT_MS = 15_000

export type VerificationCodePurpose = 'register' | 'passwordReset'

export type VerificationCodeMailer = (
  email: string,
  code: string,
  purpose: VerificationCodePurpose,
) => Promise<void>

const MAIL_CONTENT: Record<
  VerificationCodePurpose,
  { subject: string; intro: string; ignoreNote: string }
> = {
  register: {
    subject: 'WhiskyHello 驗證碼',
    intro: '你的 WhiskyHello 註冊驗證碼是',
    ignoreNote: '如非本人操作，請忽略此信。',
  },
  passwordReset: {
    subject: 'WhiskyHello 密碼重設驗證碼',
    intro: '你的 WhiskyHello 密碼重設驗證碼是',
    ignoreNote: '如非本人操作，請忽略此信，你的密碼不會被變更。',
  },
}

function buildMessage(
  code: string,
  purpose: VerificationCodePurpose,
): { subject: string; text: string } {
  const content = MAIL_CONTENT[purpose]
  return {
    subject: `${content.subject}：${code}`,
    text: [
      `${content.intro}：${code}`,
      '',
      '驗證碼 10 分鐘內有效。',
      content.ignoreNote,
    ].join('\n'),
  }
}

async function sendWithResend(
  apiKey: string,
  from: string,
  email: string,
  message: { subject: string; text: string },
): Promise<void> {
  let response: Response
  try {
    response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [email], ...message }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    })
  } catch {
    throw new AppError(503, MAIL_SEND_FAILED_MESSAGE)
  }

  if (!response.ok) {
    console.error(`Resend send failed with status ${response.status}.`)
    throw new AppError(503, MAIL_SEND_FAILED_MESSAGE)
  }
}

async function sendWithGmail(
  user: string,
  pass: string,
  email: string,
  message: { subject: string; text: string },
): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  try {
    await transporter.sendMail({
      from: `WhiskyHello <${user}>`,
      to: email,
      ...message,
    })
  } catch {
    throw new AppError(503, MAIL_SEND_FAILED_MESSAGE)
  }
}

/** Resend when RESEND_API_KEY is set, otherwise Gmail SMTP, otherwise console (development only). */
async function sendVerificationCodeEmail(
  email: string,
  code: string,
  purpose: VerificationCodePurpose,
): Promise<void> {
  const message = buildMessage(code, purpose)

  const resend = resolveResendConfig()
  if (resend.apiKey) {
    await sendWithResend(resend.apiKey, resend.from, email, message)
    return
  }

  const smtp = resolveSmtpConfig()
  if (smtp.user && smtp.pass) {
    await sendWithGmail(smtp.user, smtp.pass, email, message)
    return
  }

  if (!env.isProduction) {
    console.info(`[dev] ${purpose} code for ${email}: ${code}`)
    return
  }
  throw new AppError(503, MAIL_SEND_FAILED_MESSAGE)
}

let verificationCodeMailer: VerificationCodeMailer = sendVerificationCodeEmail

/** Test-only hook so suites never send real email. */
export function setVerificationCodeMailerForTests(
  mailer: VerificationCodeMailer | null,
): void {
  verificationCodeMailer = mailer ?? sendVerificationCodeEmail
}

export function sendVerificationCode(
  email: string,
  code: string,
  purpose: VerificationCodePurpose,
): Promise<void> {
  return verificationCodeMailer(email, code, purpose)
}
