import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Icon } from '../components/ui'
import { useConfirm } from '../components/ui/confirm'
import { createThread, getCategories } from '../api/forum'
import { notifyError } from '../lib/errors'
import { isSubmitShortcut, SUBMIT_KEYS } from '../lib/keyboard'

const TITLE_MAX = 200
const INVALID = { borderColor: 'var(--red)' }

export default function NewThread() {
  const { categoryId } = useParams({ strict: false })
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [categories, setCategories] = useState([])
  const [categoriesFailed, setCategoriesFailed] = useState(false)
  const [category, setCategory] = useState(String(categoryId ?? ''))
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [posting, setPosting] = useState(false)
  const fields = { category: useRef(null), title: useRef(null), content: useRef(null) }

  useEffect(() => { setCategory(String(categoryId ?? '')) }, [categoryId])

  useEffect(() => {
    getCategories()
      .then(({ data }) => setCategories(data.categories ?? []))
      .catch((err) => { setCategoriesFailed(true); notifyError(err, 'Couldn’t load the categories') })
  }, [])

  const origin = categories.find((c) => String(c.id) === String(categoryId))
  const selected = categories.find((c) => String(c.id) === category)
  const errors = {
    category: categories.length > 0 && !selected ? 'Choose a category' : null,
    title: !title.trim() ? 'Add a title' : title.trim().length > TITLE_MAX ? `Titles are limited to ${TITLE_MAX} characters` : null,
    content: !content.trim() ? 'Add some details' : null,
  }
  const invalid = (key) => submitted && Boolean(errors[key])
  const back = { to: '/forum/category/$categoryId', params: { categoryId: String(categoryId) } }

  async function submit(e) {
    e?.preventDefault()
    if (posting) return
    setSubmitted(true)
    const problem = ['category', 'title', 'content'].find((key) => errors[key])
    if (problem) {
      toast.error(errors[problem])
      fields[problem].current?.focus()
      return
    }
    setPosting(true)
    try {
      const { data } = await createThread(category, title.trim(), content.trim())
      toast.success('Thread posted')
      navigate({ to: '/forum/thread/$threadId', params: { threadId: String(data.thread.id) }, replace: true })
    } catch (err) {
      notifyError(err, 'Couldn’t post your thread')
      setPosting(false)
    }
  }

  function onKeyDown(e) {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    if (isSubmitShortcut(e)) {
      e.preventDefault()
      submit()
    } else if (e.target === fields.title.current) {
      e.preventDefault() // Enter in the title moves on to the details instead of submitting
      fields.content.current?.focus()
    }
  }

  // Cancel goes straight back unless something was typed.
  async function confirmDiscard(e) {
    if (!title.trim() && !content.trim()) return
    e.preventDefault()
    const ok = await confirm({ title: 'Discard this thread?', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true })
    if (ok) navigate(back)
  }

  return (
    <HubLayout>
      <PageTitle title="New thread" icon="forum" />

      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <Link to="/forum" className="card-link" activeOptions={{ exact: true }}><Icon name="arrow_back" />Forum</Link>
        {origin && (
          <>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>/</span>
            <Link {...back} className="card-link">{origin.name}</Link>
          </>
        )}
      </nav>

      <div className="dash-head">
        <h1>New thread</h1>
      </div>

      <form className="card" onSubmit={submit} noValidate style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px 16px' }}>
          <label className="field">
            <span>Category</span>
            <select ref={fields.category} className="input" value={category} disabled={!categories.length}
              onChange={(e) => setCategory(e.target.value)} aria-invalid={invalid('category')}
              style={invalid('category') ? INVALID : undefined}>
              {!selected && (
                <option value={category}>
                  {categories.length ? 'Choose a category' : categoriesFailed ? 'Couldn’t load categories' : 'Loading…'}
                </option>
              )}
              {categories.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </label>

          <label className="field">
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              Title
              {title.length > TITLE_MAX - 20 && (
                <span style={{ fontWeight: 500, color: title.length >= TITLE_MAX ? 'var(--amber)' : 'var(--text-faint)' }}>
                  {title.length}/{TITLE_MAX}
                </span>
              )}
            </span>
            <input ref={fields.title} className="input" value={title} maxLength={TITLE_MAX} autoFocus
              placeholder="What’s your question?" onChange={(e) => setTitle(e.target.value)} onKeyDown={onKeyDown}
              aria-invalid={invalid('title')} style={invalid('title') ? INVALID : undefined} />
          </label>

          <label className="field">
            <span>Details</span>
            <textarea ref={fields.content} className="input" rows={10} value={content}
              placeholder="Add details…" onChange={(e) => setContent(e.target.value)} onKeyDown={onKeyDown}
              aria-invalid={invalid('content')} style={invalid('content') ? INVALID : undefined} />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <Link {...back} className="btn btn-ghost" onClick={confirmDiscard}>Cancel</Link>
          <button type="submit" className="btn btn-coral" disabled={posting} title={`Post thread (${SUBMIT_KEYS})`}>
            {posting ? 'Posting…' : 'Post thread'}
          </button>
        </div>
      </form>
    </HubLayout>
  )
}
