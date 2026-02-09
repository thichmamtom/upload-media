import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'https://upload-media-nsji.onrender.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const albumId = searchParams.get('albumId');
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '50';

  const url = albumId
    ? `${API_URL}/api/media?albumId=${albumId}&page=${page}&limit=${limit}`
    : `${API_URL}/api/media?page=${page}&limit=${limit}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const response = await fetch(`${API_URL}/api/media`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}
