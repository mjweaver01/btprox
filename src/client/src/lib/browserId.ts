const STORAGE_KEY = 'btprox:browserId';

function generateId(): string {
  return crypto.randomUUID();
}

export function getBrowserId(): string {
  if (typeof localStorage === 'undefined') return generateId();
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}
