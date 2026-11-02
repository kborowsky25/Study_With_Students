// Keyboard shortcuts shared by the composers (forum replies, new threads).

export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

/** Label for the "submit" shortcut, for tooltips. */
export const SUBMIT_KEYS = IS_MAC ? '⌘ Enter' : 'Ctrl + Enter'

/** ⌘/Ctrl + Enter, ignoring Enter presses that confirm an IME composition. */
export const isSubmitShortcut = (e) =>
  e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !(e.nativeEvent ?? e).isComposing
