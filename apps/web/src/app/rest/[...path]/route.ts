import { type NextRequest, NextResponse } from 'next/server';

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_URL ?? 'http://localhost:5678';
const N8N_EMAIL = process.env.N8N_OWNER_EMAIL ?? 'admin@mantleagents.local';
const N8N_PASS = process.env.N8N_OWNER_PASSWORD ?? 'password';

// Cached session cookie from n8n login
let sessionCookie: string | null = null;
let sessionExpiry = 0;

async function getSession(): Promise<string | null> {
  if (sessionCookie && Date.now() < sessionExpiry) return sessionCookie;

  try {
    const res = await fetch(`${N8N_BASE}/rest/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrLdapLoginId: N8N_EMAIL, password: N8N_PASS }),
    });
    const setCookie = res.headers.get('set-cookie');
    if (res.ok && setCookie) {
      sessionCookie = setCookie.split(';')[0];
      sessionExpiry = Date.now() + 55 * 60 * 1000;
      console.log('[n8n-proxy] session login OK');
      return sessionCookie;
    }
    console.error('[n8n-proxy] session login failed', res.status, await res.text());
  } catch (e) {
    console.error('[n8n-proxy] session login error', e);
  }
  return null;
}

async function proxy(request: NextRequest, path: string[]) {
  const upstreamPath = '/rest/' + path.join('/');
  const search = request.nextUrl.search;

  // For login itself, pass through as-is (browser-initiated login)
  const isLogin = path[0] === 'login';

  const headers: Record<string, string> = {
    'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
    Accept: request.headers.get('Accept') ?? 'application/json',
  };

  if (!isLogin) {
    const cookie = await getSession();
    if (cookie) headers['Cookie'] = cookie;
  }

  const body = request.method !== 'GET' && request.method !== 'HEAD'
    ? await request.arrayBuffer()
    : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(`${N8N_BASE}${upstreamPath}${search}`, {
      method: request.method,
      headers,
      body,
      redirect: 'follow',
    });
  } catch {
    return new NextResponse('n8n unreachable', { status: 502 });
  }

  const resHeaders = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) resHeaders.set('Content-Type', ct);

  // Forward set-cookie so browser session works too
  const sc = upstream.headers.get('set-cookie');
  if (sc) resHeaders.set('Set-Cookie', sc);

  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
