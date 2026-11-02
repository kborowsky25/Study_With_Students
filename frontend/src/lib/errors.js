import toast from 'react-hot-toast'
import { errorMessage } from '../api/client'

/**
 * Toast a failed request. 401 and 402 are skipped: the API client already sends the
 * user to log in, or shows the Explorer upsell, for those.
 */
export function notifyError(err, fallback) {
  const status = err?.response?.status
  if (status === 401 || status === 402) return
  toast.error(errorMessage(err, fallback))
}
