import { NextRequest, NextResponse } from 'next/server';
import { reflectPlayerInput } from '@/lib/ai';
import type { IcebergLayer, CopingStance } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { playerInput, cardQuestion, currentLayer, copingStance } = await req.json();
    if (!playerInput || !cardQuestion) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const result = await reflectPlayerInput(
      playerInput,
      cardQuestion,
      currentLayer as IcebergLayer | null,
      copingStance as CopingStance | null,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to reflect' }, { status: 500 });
  }
}
