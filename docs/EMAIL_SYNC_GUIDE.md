# Email Synchronization Guide for OMD

Since the OMD application runs in the browser, it cannot directly "listen" for emails or connect to mail servers (IMAP/POP3) due to browser security restrictions. To get emails into your `inbox_emails` database table, you need a backend process (a "sync engine").

Here are the three best ways to implement this:

## Option 1: Automation Tools (Easiest / Low-Code)
**Tools:** [n8n](https://n8n.io) (Self-hostable, free) or [Make.com](https://make.com) (Paid)

This is effectively "glue" logic. You don't write code; you just connect boxes.

### Workflow Logic:
1.  **Trigger:** Watch for new emails (e.g., "Zoho Mail - New Email" node).
2.  **Filter (Optional):** Only sync emails from specific domains or with specific keywords.
3.  **Action:** Insert row into Supabase.
    -   **Table:** `inbox_emails`
    -   **Mapping:**
        -   `message_id` -> Email ID (forces uniqueness so you don't get duplicates)
        -   `from_address` -> From
        -   `subject` -> Subject
        -   `text_body` -> Text content
        -   `received_at` -> Date
        -   `status` -> 'unread'

**Pros:** Setup takes 10 minutes. Visual debugging.
**Cons:** Can get expensive if you have high volume (Make.com). n8n requires hosting.

---

## Option 2: Supabase Edge Functions (Recommended / Developer Native)
**Tech:** TypeScript, Deno, Supabase Cron

You write a small script that runs every few minutes on Supabase's servers.

### Architecture:
1.  **Setup Zoho API Console:**
    -   Go to [Zoho API Console](https://api-console.zoho.com/).
    -   Create a "Server-based Application".
    -   **Client Name:** OMD CRM Sync
    -   **Authorized Redirect URI:** `http://localhost:5173`
    -   **Scopes:** `ZohoMail.messages.READ`, `ZohoMail.accounts.READ`.
    -   Generate a `refresh_token` using the helper script `get_zoho_token.js` in the project root.
2.  **Configure Secrets:**
    Run the following command in your terminal:
    ```bash
    npx supabase secrets set ZOHO_CLIENT_ID=your_client_id ZOHO_CLIENT_SECRET=your_client_secret ZOHO_REFRESH_TOKEN=your_refresh_token
    ```
3.  **Create Edge Function:**
    -   The code is located in `supabase/functions/sync-emails/index.ts`.
4.  **Schedule:**
    -   Deploy the function: `npx supabase functions deploy sync-emails`
    -   Configure the cron string in `supabase/config.toml` (or via Dashboard) to run every 10 minutes.

### Why this is best for OMD:
-   **Free/Cheap:** Included in Supabase project usage.
-   **Secure:** Tokens stored in Supabase Secrets, never exposed to client.
-   **Control:** You can add complex logic (e.g., "If sender is a client, automatically link to Client record").

*(I have included a scaffold for this in `supabase/functions/sync-emails/index.ts`)*

---

## Option 3: Inbound Email Parsing (Enterprise / Real-time)
**Providers:** Postmark, SendGrid, Mailgun

You setup a specific forwarding address (e.g., `crm@yourcompany.com`) or domain routing.

### Workflow:
1.  You forward emails to `crm@inbound.yourcompany.com`.
2.  The provider (e.g., Postmark) receives the email.
3.  They convert the email into a JSON object.
4.  They send a `POST` request (Webhook) to your Supabase Integration function.
5.  Your function parses the JSON and inserts it into the database.

**Pros:** Instant (Real-time). No polling.
**Cons:** Requires DNS configuration. harder to sync "Sent" items (only receives incoming mail).

---

## Recommendation for OMD
Start with **Option 2 (Edge Functions)** if you are comfortable with TypeScript and APIs, as it keeps everything inside your current stack.

If you want to get it running today with zero coding, use **Option 1 (n8n or Make)**.
