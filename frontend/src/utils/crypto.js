/**
 * Hash a password with SHA-256 using the Web Crypto API.
 * This ensures the plain-text password never leaves the browser.
 * The backend then bcrypt-hashes the received SHA-256 hash for storage.
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
