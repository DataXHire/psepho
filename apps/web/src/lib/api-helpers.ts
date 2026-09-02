import { NextRequest, NextResponse } from 'next/server';
import { hashWithPepper, sha256 } from './db';

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'unknown-agent';
}

export function computeIpHash(ip: string, pollId: string): string {
  return hashWithPepper(ip, pollId);
}

export function computeUaHash(ua: string, pollId: string): string {
  return hashWithPepper(ua, pollId);
}

export function getBallotTokenFromRequest(req: NextRequest, pollSlug: string): string | null {
  const headerToken = req.headers.get('x-ballot-token');
  if (headerToken) return headerToken.trim();
  const cookie = req.cookies.get(`psepho_ballot_${pollSlug}`);
  return cookie?.value || null;
}

export function getCreatorTokenFromRequest(req: NextRequest): string | null {
  const headerToken = req.headers.get('x-creator-token');
  if (headerToken) return headerToken.trim();
  return null;
}

export function jsonError(message: string, status = 400, code?: string, details?: unknown) {
  return NextResponse.json(
    { error: message, code, details },
    { status }
  );
}

export function generateETag(updatedAt: Date | string, count: number): string {
  const timestamp = new Date(updatedAt).getTime();
  const hash = sha256(`${timestamp}:${count}`).slice(0, 16);
  return `"${hash}"`;
}
