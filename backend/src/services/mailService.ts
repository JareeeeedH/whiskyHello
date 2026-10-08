import nodemailer from 'nodemailer'
import { env, resolveSmtpConfig } from '../config/env'
import { AppError } from '../utils/AppError'

export const MAIL_SEND_FAILED_MESSAGE = 'Failed to send verification email'

export type VerificationCodePurpose = 'register'

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
}

async function sendVerificationCodeWithGmail(
  email: string,
  code: string,
  purpose: VerificationCodePurpose,
): Promise<void> {
  const content = MAIL_CONTENT[purpose]
  const { user, pass } = resolveSmtpConfig()

  if (!user || !pass) {
    if (!env.isProduction) {
      console.info(`[dev] ${purpose} code for ${email}: ${code}`)
      return
    }
    throw new AppError(503, MAIL_SEND_FAILED_MESSAGE)
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  try {
    await transporter.sendMail({
      from: `WhiskyHello <${user}>`,
      to: email,
      subject: `${content.subject}：${code}`,
      text: [
        `${content.intro}：${code}`,
        '',
        '驗證碼 10 分鐘內有效。',
        content.ignoreNote,
      ].join('\n'),
    })
  } catch {
    throw new AppError(503, MAIL_SEND_FAILED_MESSAGE)
  }
}

let verificationCodeMailer: VerificationCodeMailer = sendVerificationCodeWithGmail

/** Test-only hook so suites never send real email. */
export function setVerificationCodeMailerForTests(
  mailer: VerificationCodeMailer | null,
): void {
  verificationCodeMailer = mailer ?? sendVerificationCodeWithGmail
}

export function sendVerificationCode(
  email: string,
  code: string,
  purpose: VerificationCodePurpose,
): Promise<void> {
  return verificationCodeMailer(email, code, purpose)
}
