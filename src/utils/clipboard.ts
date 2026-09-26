// src/utils/clipboard.ts
//
// Put text on the clipboard, including where the modern API cannot.
//
// Written out once because two admin screens now need it and the fallback is
// the part that is easy to leave out: navigator.clipboard is undefined outside
// a secure context, and can be refused even inside one, so a button that only
// calls it works on the deployed site and silently does nothing when the shop
// is opened over the local network.

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    // Fall through to the textarea, which still works there.
  }

  const el = document.createElement('textarea')
  el.value = text
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(el)
  }
}
