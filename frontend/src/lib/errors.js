import toast from 'react-hot-toast'
import { errorMessage } from '../api/client'

/** Toast a failed request. 401 is skipped: the API client already sends the user to log in. */
export function notifyError(err, fallback) {
  if (err?.response?.status === 401) return
  toast.error(errorMessage(err, fallback))
}
