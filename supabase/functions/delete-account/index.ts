import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller's JWT and extract their user ID.
    // userClient carries the caller's Authorization header, so auth.uid() resolves
    // correctly inside any RPC called through this client.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Atomically delete all DB data for this account in a single Postgres transaction.
    // The RPC independently re-verifies auth.uid() = p_user_id — identity is
    // derived from the JWT, not trusted from the p_user_id parameter alone.
    // If this throws, nothing has been deleted and the error surfaces cleanly.
    const { error: rpcError } = await userClient.rpc('delete_account_data', {
      p_user_id: userId,
    });
    if (rpcError) throw rpcError;

    // DB data is now atomically gone. Remaining steps (storage, auth user) are
    // best-effort with explicit logging on failure — they do not roll back the RPC.

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Delete swing video files from storage (stored at {userId}/{filename}).
    // Non-fatal: videos are inaccessible once profiles are deleted, but we log
    // failures clearly rather than silently swallowing them.
    const { data: storageFiles, error: listError } = await admin.storage
      .from('swing-videos')
      .list(userId, { limit: 1000 });
    if (listError) {
      console.error(`[delete-account] storage list failed for user ${userId}:`, listError.message);
    } else if (storageFiles && storageFiles.length > 0) {
      const paths = storageFiles.map((f: { name: string }) => `${userId}/${f.name}`);
      const { error: removeError } = await admin.storage.from('swing-videos').remove(paths);
      if (removeError) {
        console.error(`[delete-account] storage remove failed for user ${userId}:`, removeError.message);
      }
    }

    // Delete the auth.users row — requires service role, must be last.
    // Worst-case failure here: DB data atomically gone, auth user still exists.
    // User can log in to an empty account and retry deletion to clean up.
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) throw deleteUserError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message :
      (typeof error === 'object' && error !== null && 'message' in error) ? String((error as { message: unknown }).message) :
      'Account deletion failed';
    console.error('[delete-account] error:', message, '| full:', JSON.stringify(error, null, 2));
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
