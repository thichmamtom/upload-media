import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'https://upload-media-nsji.onrender.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const { uploadId } = await params;

  try {
    const response = await fetch(`${API_URL}/api/uploads/${uploadId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'Failed to get upload status' }, { status: 500 });
  }
}
