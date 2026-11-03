// Parent accounts: query keys, and the wording the parent home page, messages and the student
// home page share. The rules live in the API (server/family.py).
import { getChild, getChildConversations, getFamily } from '../api/family'
import { toDateInput } from './dates'
import { firstName } from './format'
import { invalidate } from './query'

export const FQ = {
  family:        ['family', getFamily],
  conversations: ['family:conversations', getChildConversations],
  child:         (id) => [`family:child:${id}`, () => getChild(id)],
}

/** Refetch everything about family links after one changes. */
export const refreshFamily = () => invalidate('family')

/**
 * The quiet line in a thread header when a child's parents can read it: "Visible to Maya’s
 * parent" (to the tutor) or "Visible to your parents" (to the child). `view` comes from the API.
 */
export function parentsLine(view, myId) {
  if (!view) return null
  const whose = view.user_id === myId ? 'your' : `${firstName(view.name)}’s`
  return `Visible to ${whose} parent${view.parents > 1 ? 's' : ''}`
}

/** Students join at 13 or over (the API checks the same: MIN_AGE in server/family.py). */
export const MIN_AGE = 13

/** Whether a 'YYYY-MM-DD' date of birth is old enough to join today. */
export function oldEnough(born, today = new Date()) {
  const latest = toDateInput(new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate()))
  return Boolean(born) && born <= latest
}

/** A sign-up link a student can send to a parent: it opens the sign-up form on "Parent". */
export const parentSignupUrl = (origin = window.location.origin) => `${origin}/signup?as=parent`
