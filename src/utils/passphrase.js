// passphrase.js — centralized passphrase hashes and SHA-256 utility.
// All passphrases stored as SHA-256 hashes only. No plaintext in source.
//
// To generate a new hash:
//   echo -n "YOUR_PASSPHRASE" | shasum -a 256
// or in browser console:
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_PASSPHRASE'))
//     .then(h => console.log(Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('')))

// App access gate
export const GATE_HASH = '0cb7cdff133b78bc1c91367ce5ab69ddf0a44606c364f9658f48ddc078230856'


export async function sha256(text) {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}
