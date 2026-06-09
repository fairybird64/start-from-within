import { NextRequest, NextResponse } from 'next/server';
import { reflectPlayerInput } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { playerInput, cardQuestion } = await req.json();
    if (!playerInput || !cardQuestion) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const reflection = await reflectPlayerInput(playerInput, cardQuestion);
    return NextResponse.json({ reflection });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to reflect' }, { status: 500 });
  }
}
