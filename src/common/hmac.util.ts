import * as crypto from 'crypto';

export function signPayload(payload: unknown, secret: string): string {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export function verifySignature(payload: unknown, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export function verifyMetaSignature(rawBody: string, metaHeader: string | undefined, appSecret: string): boolean {
  if (!metaHeader || !metaHeader.startsWith('sha256=')) return false;
  const signature = metaHeader.slice('sha256='.length);
  const h = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(h, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}
