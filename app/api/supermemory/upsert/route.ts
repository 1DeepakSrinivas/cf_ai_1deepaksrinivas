import { NextRequest, NextResponse } from 'next/server';
import { upsertMemory } from '@/lib/supermemory';

export async function POST(req: NextRequest) {
  try {
    const { userId, content, embedding, metadata } = await req.json();

    if (!userId || !content) {
      return NextResponse.json(
        { error: 'userId and content are required' },
        { status: 400 }
      );
    }

    const memory = await upsertMemory(userId, content, embedding, metadata || {});

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error) {
    console.error('Supermemory upsert error:', error);
    return NextResponse.json(
      { error: 'Failed to upsert memory' },
      { status: 500 }
    );
  }
}

