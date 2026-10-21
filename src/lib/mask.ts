/**
 * Sensitive Credential Masking Utility
 * Ensures API keys, secrets, passwords, private keys, and tokens
 * are masked when displayed to Gashtyar Management (read-only users).
 */

export function maskSecretString(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 8) return '••••••••';
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-4);
  return `${prefix}••••••••••••${suffix}`;
}

/**
 * Parses a config string or JSON object and recursively masks sensitive fields
 * such as api_secret, api_key, password, token, private_key, secret, credential.
 */
export function maskSensitiveConfigs(configInput: string | null | undefined): string {
  if (!configInput) return '';

  try {
    const parsed = JSON.parse(configInput);
    if (typeof parsed !== 'object' || parsed === null) {
      return configInput;
    }

    const sensitiveKeyPatterns = [/secret/i, /key/i, /token/i, /pass/i, /credential/i, /auth/i, /cert/i];

    function maskObject(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map(maskObject);
      } else if (typeof obj === 'object' && obj !== null) {
        const masked: Record<string, any> = {};
        for (const [k, v] of Object.entries(obj)) {
          const isSensitive = sensitiveKeyPatterns.some((pattern) => pattern.test(k));
          if (isSensitive && typeof v === 'string') {
            masked[k] = maskSecretString(v);
          } else if (typeof v === 'object' && v !== null) {
            masked[k] = maskObject(v);
          } else {
            masked[k] = v;
          }
        }
        return masked;
      }
      return obj;
    }

    const maskedResult = maskObject(parsed);
    return JSON.stringify(maskedResult, null, 2);
  } catch {
    // If it's plain text rather than JSON, mask patterns like key=... or password=...
    return configInput.replace(/(secret|key|token|password|auth)=([^\s,;]+)/gi, (_match, p1, p2) => {
      return `${p1}=${maskSecretString(p2)}`;
    });
  }
}
