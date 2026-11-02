// Forum helpers shared by the forum pages.

/** The name shown for a thread or reply author; accounts without a name read as "Member". */
export const authorOf = (item) => item?.author_name?.trim() || 'Member'
