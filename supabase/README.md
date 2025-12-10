# Supabase Database Setup

## Schema Migration

The database schema is defined in `migrations/20251209000000_initial_schema.sql`.

### How to apply:

1.  **Supabase Dashboard:**
    *   Go to the SQL Editor in your Supabase project.
    *   Copy the contents of `migrations/20251209000000_initial_schema.sql`.
    *   Paste it into the editor and run it.

2.  **Supabase CLI:**
    *   If you have the Supabase CLI installed and linked:
        ```bash
        supabase db push
        ```

## Tables Created

*   **Core CRM:** `clients`, `venues`, `planners`, `leads`, `events`, `products`
*   **Financials:** `quotes`, `contracts`, `invoices`, `invoice_items`
*   **Operations:** `tasks`, `task_templates`, `client_files`, `reviews`, `event_timeline_items`
*   **Settings:** `branding_settings`, `calendar_settings`, `financial_settings`, `payment_methods`, `payment_schedules`, `contact_forms`, `expense_categories`, `email_settings`, `workflows`, `automation_logs`, `roles`, `tokens`
*   **System:** `users`, `user_sessions`, `templates`, `notes`, `activity_logs`
