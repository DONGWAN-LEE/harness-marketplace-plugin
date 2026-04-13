import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!bearer) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(bearer);

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: posts, error: queryError } = await supabase
    .from('posts')
    .select('id, user_id, title, created_at')
    .eq('user_id', user.id);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  return NextResponse.json({ posts });
}
