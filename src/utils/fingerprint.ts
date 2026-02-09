const FALLBACK_PRIME = 16777619;
const FALLBACK_OFFSET = 2166136261;

export async function generateDocumentFingerprint(content: string | undefined): Promise<string> {
  if (!content) return '';

  if (typeof window !== 'undefined' && window.crypto?.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.warn('Failed to compute crypto fingerprint, falling back:', error);
    }
  }

  // FNV-1a fallback for environments without SubtleCrypto
  let hash = FALLBACK_OFFSET;
  for (let i = 0; i < content.length; i += 1) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, FALLBACK_PRIME);
  }

  return (hash >>> 0).toString(16);
}
