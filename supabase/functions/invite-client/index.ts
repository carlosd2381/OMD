import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { clientId } = await req.json();
    if (!clientId) {
      console.error('invite-client: missing clientId');
      return new Response(JSON.stringify({ error: 'clientId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('invite-client: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Missing Supabase environment variables' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: client, error: clientError } = await admin
      .from('clients')
      .select('id, email, auth_user_id, portal_access')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('invite-client: client lookup failed', clientError?.message || 'Client not found');
      return new Response(JSON.stringify({ error: clientError?.message || 'Client not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!client.email) {
      console.error('invite-client: client email missing');
      return new Response(JSON.stringify({ error: 'Client email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let authUserId = client.auth_user_id as string | null;

    if (!authUserId) {
      const { data: listData, error: listError } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });

      if (listError) {
        console.error('invite-client: listUsers failed', listError.message);
      }

      const existingUser = listData?.users?.find(
        (user) => user.email?.toLowerCase() === client.email.toLowerCase()
      );

      if (existingUser) {
        authUserId = existingUser.id;
      } else {
        const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(client.email);
        if (inviteError) {
          console.error('invite-client: inviteUserByEmail failed', inviteError.message);
          return new Response(JSON.stringify({ error: inviteError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        authUserId = invited.user?.id ?? null;
      }
    }

    if (!authUserId) {
      console.error('invite-client: auth user id unresolved');
      return new Response(JSON.stringify({ error: 'Failed to resolve auth user id' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (client.auth_user_id !== authUserId || !client.portal_access) {
      const { error: updateError } = await admin
        .from('clients')
        .update({ auth_user_id: authUserId, portal_access: true })
        .eq('id', client.id);

      if (updateError) {
        console.error('invite-client: client update failed', updateError.message);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, auth_user_id: authUserId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('invite-client: unexpected error', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
