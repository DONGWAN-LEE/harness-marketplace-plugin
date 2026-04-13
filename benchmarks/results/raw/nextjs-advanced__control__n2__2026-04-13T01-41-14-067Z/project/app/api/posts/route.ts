import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, user_id, title, created_at')
    .eq('user_id', user.id);

  if (postsError) {
    return NextResponse.json({ error: postsError.message }, { status: 500 });
  }

  return NextResponse.json({ posts });
}
