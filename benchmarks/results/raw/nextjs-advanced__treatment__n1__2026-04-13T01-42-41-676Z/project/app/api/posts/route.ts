import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!jwt) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(jwt);

  if (authError || !user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, user_id, title, created_at')
    .eq('user_id', user.id);

  if (postsError) {
    return Response.json({ error: postsError.message }, { status: 500 });
  }

  return Response.json({ posts });
}
