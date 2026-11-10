/*
  A random id for visitors without an account, kept in this browser. It only lets the backend
  avoid counting the same guest's listen twice within a minute; it identifies nobody.
*/
const KEY = 'guestId';
let fallback: string | null = null;

export function guestId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode): an id for this page load only
    return (fallback ??= crypto.randomUUID());
  }
}
