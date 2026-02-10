// Zoho Mail Sync Edge Function
// Triggers on a schedule to fetch new emails from Zoho Mail and insert into Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment Variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Zoho Mail Configuration
// You generally need these from https://api-console.zoho.com
const ZOHO_CLIENT_ID = Deno.env.get('ZOHO_CLIENT_ID');
const ZOHO_CLIENT_SECRET = Deno.env.get('ZOHO_CLIENT_SECRET');
const ZOHO_REFRESH_TOKEN = Deno.env.get('ZOHO_REFRESH_TOKEN');
const ZOHO_ACCOUNT_ID = Deno.env.get('ZOHO_ACCOUNT_ID'); // Optional: can be fetched dynamically, but faster if hardcoded
// Base URL varies by region: .com, .eu, .in, etc.
const ZOHO_API_BASE = Deno.env.get('ZOHO_API_BASE') || 'https://mail.zoho.com/api'; 
const ZOHO_ACCOUNTS_URL = Deno.env.get('ZOHO_ACCOUNTS_URL') || 'https://accounts.zoho.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  try {
    // 0. Validate Config
    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
        throw new Error("Missing Zoho Mail Configuration");
    }

    // 1. Get Access Token
    const accessToken = await refreshZohoToken();

    // 2. Get Account ID (if not provided)
    let accountId = ZOHO_ACCOUNT_ID;
    if (!accountId) {
        accountId = await fetchAccountId(accessToken);
    }

    // 3. Fetch recent emails
    // We'll fetch emails from the last hour or unread ones
    const messages = await fetchZohoEmails(accessToken, accountId);

    if (messages.length === 0) {
      return new Response(JSON.stringify({ message: 'No new emails' }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 4. Transform and Insert
    // Note: Zoho list API only gives summaries. We might need to fetch details for full body if 'summary' isn't enough.
    // tailored for 'inbox_emails' schema
    const emailsToUpsert = [];

    for (const msg of messages) {
        // Detailed fetch might be needed for full HTML body if the list endpoint only returns a snippet
        // For efficiency, we often just use the summary or fetch detail only if needed
        // Here we'll implement a detail fetch for the body
        const fullMsg = await fetchMessageDetail(accessToken, accountId, msg.messageId);
        
        emailsToUpsert.push({
            message_id: msg.messageId, // Zoho's unique ID
            from_address: msg.fromAddress,
            to_address: msg.toAddress, // Might need parsing if "Name <email>"
            subject: msg.subject,
            text_body: fullMsg.content || msg.summary, // Use full content if available
            html_body: fullMsg.content, // Zoho returns HTML content usually
            received_at: new Date(parseInt(msg.receivedTime)).toISOString(),
            status: 'unread',
            source: 'zoho_sync'
        });
    }

    // 5. Upsert to Supabase
    const { data, error } = await supabase
      .from('inbox_emails')
      .upsert(emailsToUpsert, { onConflict: 'message_id' })
      .select();

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: `Synced ${data.length} emails`, data }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})

// --- Zoho Helpers ---

async function refreshZohoToken() {
    const params = new URLSearchParams();
    params.append('refresh_token', ZOHO_REFRESH_TOKEN!);
    params.append('client_id', ZOHO_CLIENT_ID!);
    params.append('client_secret', ZOHO_CLIENT_SECRET!);
    params.append('grant_type', 'refresh_token');

    const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
        method: 'POST',
        body: params
    });

    const data = await res.json();
    if (data.error) throw new Error(`Zoho Token Error: ${data.error}`);
    return data.access_token;
}

async function fetchAccountId(accessToken: string) {
    const res = await fetch(`${ZOHO_API_BASE}/accounts`, {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
    });
    const data = await res.json();
    if (data.status.code !== 200) throw new Error("Failed to fetch Zoho Accounts");
    // Return primary account
    return data.data[0].accountId;
}

async function fetchZohoEmails(accessToken: string, accountId: string) {
    // Search API or List Messages API
    // Getting last 20 messages from Inbox
    // https://www.zoho.com/mail/help/api/get-messages-list.html
    const res = await fetch(`${ZOHO_API_BASE}/accounts/${accountId}/messages/view?limit=20&status=unread`, {
         headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
    });
    
    const data = await res.json();
    if (data.status && data.status.code !== 200) throw new Error(`Zoho List Error: ${data.data?.moreInfo || JSON.stringify(data.status)}`);
    
    return data.data || [];
}

async function fetchMessageDetail(accessToken: string, accountId: string, messageId: string) {
    // https://www.zoho.com/mail/help/api/get-message-content.html
    const res = await fetch(`${ZOHO_API_BASE}/accounts/${accountId}/messages/${messageId}/content`, {
        headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
   });
   
   const data = await res.json();
   // data.data.content contains the HTML body
   return data.data || {};
}
