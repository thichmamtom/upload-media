import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'https://upload-media-nsji.onrender.com';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const { uploadId } = await params;

  try {
    const body = await request.json();
    const response = await fetch(`${API_URL}/api/uploads/${uploadId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
  }
}
