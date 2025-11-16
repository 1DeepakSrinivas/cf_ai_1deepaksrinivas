import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/supermemory';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default-user';

    const profile = await getUserProfile(userId);

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Supermemory profile error:', error);
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}

