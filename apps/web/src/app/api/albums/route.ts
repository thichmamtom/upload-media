import { NextRequest, NextResponse } from 'next/server';

// Use Node.js runtime with extended timeout
export const maxDuration = 60; // 60 seconds for Hobby plan

const API_URL = process.env.API_URL || 'https://upload-media-nsji.onrender.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '50';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const response = await fetch(`${API_URL}/api/albums?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('API response not ok:', response.status, response.statusText);
      return NextResponse.json({ error: `API returned ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error instanceof Error ? error.message : error);
    const message = error instanceof Error ? error.message : 'Failed to fetch albums';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${API_URL}/api/albums`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error instanceof Error ? error.message : error);
    const message = error instanceof Error ? error.message : 'Failed to create album';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
