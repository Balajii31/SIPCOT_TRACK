import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // 1. Delete from Auth
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // 2. Profile and other related data should be deleted via CASCADE in DB,
    // but we can manually ensure profile is gone if needed.
    // The profiles table has FK with CASCADE (usually).

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
