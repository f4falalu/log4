/**
 * Security Service
 * Handles encryption of offline data using Web Crypto API (AES-GCM)
 * Adapted from archived code for Mod4 integration
 */

export class SecurityService {
  private key: CryptoKey | null = null;

  /**
   * Derives a symmetric key from a user secret (e.g., session token or device ID).
   * Uses PBKDF2 with SHA-256 for key derivation.
   */
  async initialize(secret: string, salt?: string): Promise<void> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    // Use provided salt or default
    const saltValue = salt || "mod4_biko_salt_v1";

    this.key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode(saltValue),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypts data using AES-GCM
   * Returns cipher text and IV (initialization vector) as base64 strings
   */
  async encrypt(data: any): Promise<{ cipherText: string; iv: string }> {
    if (!this.key) {
      throw new Error("SecurityService not initialized. Call initialize() first.");
    }

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

  /**
   * Decrypts data using AES-GCM
   * Requires cipher text and IV from encrypt()
   */
  async decrypt(cipherText: string, iv: string): Promise<any> {
    if (!this.key) {
      throw new Error("SecurityService not initialized. Call initialize() first.");
    }

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: this.base64ToArrayBuffer(iv) as any },
      this.key,
      this.base64ToArrayBuffer(cipherText) as any
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  }

  /**
   * Generate a device fingerprint for device identification
   */
  async generateDeviceFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset().toString(),
      screen.colorDepth.toString(),
      screen.width + 'x' + screen.height,
    ];

    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return this.arrayBufferToBase64(hashBuffer);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }

  /**
   * Check if crypto API is available
   */
  static isAvailable(): boolean {
    return typeof window !== 'undefined' &&
           typeof window.crypto !== 'undefined' &&
           typeof window.crypto.subtle !== 'undefined';
  }
}
