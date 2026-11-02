import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import ScreeningQueue from '../components/features/ScreeningQueue'
import { Card, EmptyState } from '../components/ui'
import { getScreeningQueue } from '../api/screening'

/** /admin — the tutor application queue on its own (the full admin is at /superadmin). */
export default function AdminScreening() {
  const [queue, setQueue] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error | forbidden

  const load = useCallback(() => {
    setStatus('loading')
    return getScreeningQueue()
      .then(({ data }) => { setQueue(data.queue ?? []); setStatus('ready') })
      .catch((err) => setStatus(err?.response?.status === 403 ? 'forbidden' : 'error'))
  }, [])

  useEffect(() => { load() }, [load])

  const patch = (id, change) => setQueue((list) => list.map((t) => (t.id_tutor === id ? { ...t, ...change } : t)))
  const pending = queue.filter((t) => t.screening_status === 'pending').length

  return (
    <HubLayout>
      <PageTitle title="Applications" icon="verified_user" />
      <div style={{ maxWidth: 880 }}>
        <div className="dash-head">
          <h1>Tutor applications</h1>
          {status === 'ready' && <span className="eyebrow">{pending} pending</span>}
        </div>
        {status === 'forbidden' ? (
          <Card>
            <EmptyState title="Only admins can review applications." action={<Link to="/hub" className="btn btn-ghost btn-sm">Back to the hub</Link>} />
          </Card>
        ) : (
          <ScreeningQueue queue={queue} loading={status === 'loading'} failed={status === 'error'} onReload={load} onChange={patch} />
        )}
      </div>
    </HubLayout>
  )
}
