import { type NextRequest, NextResponse } from 'next/server';

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_URL ?? 'http://localhost:5678';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path') ?? '/';

  let response: Response;
  try {
    response = await fetch(`${N8N_BASE}${path}`, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
    });
  } catch {
    return NextResponse.json({ error: 'n8n unreachable' }, { status: 502 });
  }

  const contentType = response.headers.get('content-type') ?? '';
  const body = await response.text();

  // No URL rewriting needed — Next.js rewrites in next.config.ts proxy /rest/, /assets/, /static/
  const html = body;

  const headers = new Headers();
  headers.set('Content-Type', contentType || 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  // Intentionally omit X-Frame-Options so the iframe can load

  return new NextResponse(html, { status: response.status, headers });
}
