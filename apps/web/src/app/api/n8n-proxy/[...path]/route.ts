import { type NextRequest, NextResponse } from 'next/server';

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_URL ?? 'http://localhost:5678';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const upstreamPath = '/' + path.join('/');
  const search = request.nextUrl.search;

  let upstream: Response;
  try {
    upstream = await fetch(`${N8N_BASE}${upstreamPath}${search}`, {
      headers: {
        Accept: request.headers.get('Accept') ?? '*/*',
        'Accept-Language': request.headers.get('Accept-Language') ?? 'en',
        'Accept-Encoding': 'identity',
      },
      redirect: 'follow',
    });
  } catch {
    return new NextResponse('n8n unreachable', { status: 502 });
  }

  const headers = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) headers.set('Content-Type', ct);
  headers.set('Cache-Control', 'public, max-age=3600');
  // Intentionally omit X-Frame-Options and CSP frame-ancestors

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, { status: upstream.status, headers });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const upstreamPath = '/' + path.join('/');
  const search = request.nextUrl.search;
  const body = await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(`${N8N_BASE}${upstreamPath}${search}`, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
        Accept: request.headers.get('Accept') ?? 'application/json',
      },
      body,
      redirect: 'follow',
    });
  } catch {
    return new NextResponse('n8n unreachable', { status: 502 });
  }

  const headers = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) headers.set('Content-Type', ct);

  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers,
  });
}
