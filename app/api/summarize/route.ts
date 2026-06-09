import { NextRequest, NextResponse } from 'next/server';
import { summarizeSession } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { entries } = await req.json();
    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Missing entries' }, { status: 400 });
    }
    const summary = await summarizeSession(entries);
    return NextResponse.json({ summary });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to summarize' }, { status: 500 });
  }
}
