import { NextRequest, NextResponse } from 'next/server';
import { reflectSessionLayers } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { sessionContent } = await req.json();
    if (!sessionContent) {
      return NextResponse.json({ error: 'Missing sessionContent' }, { status: 400 });
    }
    const reflection = await reflectSessionLayers(sessionContent);
    return NextResponse.json({ reflection });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to reflect' }, { status: 500 });
  }
}
