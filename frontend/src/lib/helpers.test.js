// The small helpers: error toasts, keyboard shortcuts, forum names.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }))
vi.mock('../api/client', () => ({
  errorMessage: (err, fallback = 'Something went wrong') => err?.response?.data?.error || fallback,
}))

const toast = (await import('react-hot-toast')).default
const { notifyError } = await import('./errors')
const { isSubmitShortcut } = await import('./keyboard')
const { authorOf } = await import('./forum')

const httpError = (status, error) => ({ response: { status, data: error ? { error } : {} } })

describe('notifyError', () => {
  beforeEach(() => toast.error.mockClear())

  it('shows the API message, or the fallback', () => {
    notifyError(httpError(400, 'Title is required'), 'Could not post')
    notifyError(httpError(402, 'Payment not completed'), 'Could not pay')
    notifyError(httpError(500), 'Could not post')
    notifyError(new Error('Network Error'), 'Could not post')
    expect(toast.error.mock.calls.map(([m]) => m)).toEqual([
      'Title is required', 'Payment not completed', 'Could not post', 'Could not post'])
  })

  it('stays quiet for 401, which sends the user to log in', () => {
    notifyError(httpError(401, 'Token expired'))
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('isSubmitShortcut', () => {
  const key = (patch) => ({ key: 'Enter', metaKey: false, ctrlKey: false, nativeEvent: { isComposing: false }, ...patch })

  it('is ⌘/Ctrl + Enter', () => {
    expect(isSubmitShortcut(key({ metaKey: true }))).toBe(true)
    expect(isSubmitShortcut(key({ ctrlKey: true }))).toBe(true)
    expect(isSubmitShortcut(key({}))).toBe(false)
    expect(isSubmitShortcut(key({ key: 'a', metaKey: true }))).toBe(false)
  })

  it('ignores Enter that confirms an IME composition', () => {
    expect(isSubmitShortcut(key({ metaKey: true, nativeEvent: { isComposing: true } }))).toBe(false)
  })
})

describe('authorOf', () => {
  it('falls back to "Member" for accounts without a name', () => {
    expect(authorOf({ author_name: ' Maya Patel ' })).toBe('Maya Patel')
    expect(authorOf({ author_name: '   ' })).toBe('Member')
    expect(authorOf({})).toBe('Member')
    expect(authorOf(null)).toBe('Member')
  })
})
