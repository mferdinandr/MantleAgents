/**
 * SIWE + JWT authentication for MantleAgents.
 *
 * Replaces Thirdweb Auth: the `siwe` library builds and verifies the EIP-4361
 * (Sign-In with Ethereum) challenge, and `jose` signs/verifies the session JWT
 * (HS256) whose `sub` claim is the wallet address.
 *
 * Nonce handling is stateless: the nonce + issuedAt + expirationTime are baked
 * into the signed SIWE message and trusted via the signature + domain binding +
 * expiry window. (Supabase-backed single-use nonces are a hardening follow-up.)
 */
import { randomBytes } from 'node:crypto';
import { getAddress } from 'viem';
import { SiweMessage } from 'siwe';
import { SignJWT, jwtVerify } from 'jose';
import { MANTLE_CHAIN_ID } from './chains.js';

const authDomain = process.env.AUTH_DOMAIN;
if (!authDomain) throw new Error('AUTH_DOMAIN is required');

const jwtSecretRaw = process.env.JWT_SECRET;
if (!jwtSecretRaw) throw new Error('JWT_SECRET is required');
const jwtSecret = new TextEncoder().encode(jwtSecretRaw);

// Session JWT lifetime (see design: 7 days).
const JWT_EXPIRY = '7d';
// SIWE challenge validity window — short to limit signature replay.
const SIWE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

const SIWE_URI = `https://${authDomain}`;

export interface SiwePayload {
  /** The full EIP-4361 message string the frontend must sign. */
  message: string;
  /** The (checksummed) address the message is bound to. */
  address: string;
  /** Server-generated nonce embedded in the message. */
  nonce: string;
}

/**
 * Build a SIWE login challenge bound to AUTH_DOMAIN, a fresh nonce, the
 * requested address, the Mantle chain id, and an issuance/expiry window.
 */
export function buildSiwePayload(params: {
  address: string;
  chainId?: number;
}): SiwePayload {
  const address = getAddress(params.address); // EIP-55 checksum (siwe requires it)
  const nonce = randomBytes(16).toString('hex');
  const now = new Date();
  const expirationTime = new Date(now.getTime() + SIWE_EXPIRY_MS);

  const siwe = new SiweMessage({
    domain: authDomain,
    address,
    statement: 'Sign in to MantleAgents',
    uri: SIWE_URI,
    version: '1',
    chainId: params.chainId ?? MANTLE_CHAIN_ID,
    nonce,
    issuedAt: now.toISOString(),
    expirationTime: expirationTime.toISOString(),
  });

  return { message: siwe.prepareMessage(), address, nonce };
}

/**
 * Verify a signed SIWE message. Returns the recovered (checksummed) address on
 * success. siwe's `.verify()` checks the signature, domain, and expiry window.
 */
export async function verifySiweMessage(params: {
  message: string;
  signature: string;
}): Promise<{ valid: boolean; address?: string }> {
  try {
    const siwe = new SiweMessage(params.message);
    const result = await siwe.verify({
      signature: params.signature,
      domain: authDomain,
    });
    if (!result.success) return { valid: false };
    return { valid: true, address: result.data.address };
  } catch {
    return { valid: false };
  }
}

/** Sign a session JWT (HS256) with `sub` = wallet address. */
export async function issueJwt(address: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(address)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(jwtSecret);
}

/** Verify a session JWT and return its `sub` claim (the wallet address). */
export async function verifyJwt(
  token: string,
): Promise<{ valid: boolean; sub?: string }> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    if (typeof payload.sub !== 'string') return { valid: false };
    return { valid: true, sub: payload.sub };
  } catch {
    return { valid: false };
  }
}
