/**
 * PRD Section 11: Security & Compliance
 * Handles encryption of offline data using Web Crypto API (AES-GCM).
 */
export class SecurityService {
  private key: CryptoKey | null = null;

  /**
   * Derives a symmetric key from a user secret (e.g., PIN or token).
   * In a real implementation, salt should be random and stored.
   */
  async initialize(secret: string): Promise<void> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    this.key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode("mod4_static_salt_v1"), // TODO: Use random salt per user
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async encrypt(data: any): Promise<{ cipherText: string; iv: string }> {
    if (!this.key) throw new Error("SecurityService not initialized");
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.key,
      encoded
    );

    return {
      cipherText: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv.buffer as ArrayBuffer)
    };
  }

  async decrypt(cipherText: string, iv: string): Promise<any> {
    if (!this.key) throw new Error("SecurityService not initialized");

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: this.base64ToArrayBuffer(iv) as any },
      this.key,
      this.base64ToArrayBuffer(cipherText) as any
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }
}