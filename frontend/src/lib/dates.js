// Date maths shared by the calendars and the scheduling forms. All dates are local time.

const pad = (n) => String(n).padStart(2, '0')

export const startOfDay = (value) => {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)

export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Sort comparator for anything with a `start_time`, earliest first. */
export const byStart = (a, b) => new Date(a.start_time) - new Date(b.start_time)

/** Value for <input type="date">: "2026-11-04". */
export const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Naive local timestamp the API stores as-is: "2026-11-04T18:00:00". */
export const toLocalISO = (d) => `${toDateInput(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
