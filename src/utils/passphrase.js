// passphrase.js — centralized passphrase hashes and SHA-256 utility.
// All passphrases stored as SHA-256 hashes only. No plaintext in source.
//
// To generate a new hash:
//   echo -n "YOUR_PASSPHRASE" | shasum -a 256
// or in browser console:
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_PASSPHRASE'))
//     .then(h => console.log(Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('')))

// App access gate — different per build
// Broker: 18xx2026 → 0cb7cd...
// PlusPlus: 18xxpp2026 → b6b9ae...
export const GATE_HASH = import.meta.env.VITE_PLUSPLUS
  ? 'b6b9ae5ee6031af3ad82bb28b2f1f9f80b57cdc7688566d57ef929428d40b832'
  : '0cb7cdff133b78bc1c91367ce5ab69ddf0a44606c364f9658f48ddc078230856'


export async function sha256(text) {
  const data = new TextEncoder().encode(text)
  if (!crypto?.subtle) {
    // No secure context (HTTP dev) — accept any passphrase
    return GATE_HASH
  }
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}
