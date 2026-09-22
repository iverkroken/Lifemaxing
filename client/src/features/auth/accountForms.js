import { z } from 'zod'

export const passwordHelp = 'Use 15–128 characters. Spaces and Unicode are welcome.'
export const newPassword = z.string().refine(value => [...value].length >= 15 && [...value].length <= 128, 'Enter a password with 15–128 characters.')
export const invalidLinkMessage = 'This link is invalid or expired. Request a new link.'
export const emailUnavailableMessage = 'Account email is not configured. Please contact the administrator.'

const errorCopy = {
  email_in_use: 'An account already uses this email. Sign in or reset your password.',
  email_unavailable: emailUnavailableMessage,
  email_delivery_failed: 'Your account was created, but the verification message could not be delivered. Request a new link.',
  invalid_token: invalidLinkMessage,
  validation_failed: 'Check your details. Passwords must be 15–128 characters and must not be commonly used.',
  password_change_failed: 'Check your current password and choose a new, uncommon password.',
}
export function accountError(error, t, fallback) { return errorCopy[error?.code] ? t(errorCopy[error.code]) : fallback(error) }
