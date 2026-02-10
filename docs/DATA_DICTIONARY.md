# OMD Data Dictionary & Schema Map

This document serves as the central reference for all data entities, their fields, and how they map from the UI to the Database.

**Goal:** Ensure 100% accuracy in data mapping, especially for complex financial calculations (Contracts, Invoices).

## 1. Core CRM Entities

### Clients (`clients` table)
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| First Name | `first_name` | string | Yes | |
| Last Name | `last_name` | string | Yes | |
| Email | `email` | string | Yes | Unique identifier often used for lookup |
| Phone | `phone` | string | No | |
| Company | `company_name` | string | No | |
| Address | `address` | string | No | |
| City | `city` | string | No | |
| State/Province | `state` | string | No | |
| Zip/Postal Code | `zip_code` | string | No | |
| Country | `country` | string | No | |
| Client Role | `role` | enum | No | Bride, Groom, Parent, External Planner, Hotel/Resort, Private Venue |
| Client Type | `type` | enum | No | Direct, Preferred Vendor |
| Lead Source | `lead_source` | enum | No | Website, Facebook, Facebook Group, Instagram, TikTok, External Planner, Hotel/Venue, Hotel/Venue PV, Vendor Referral, Client Referral, Other |
| Instagram | `instagram` | string | No | @username |
| Facebook | `facebook` | string | No | Profile URL or Username |
| Notes | `notes` | string | No | Internal notes |
| Portal Access | `portal_access` | boolean | No | Default false |
| Last Login | `portal_last_login` | timestamp | No | |
| Portal Settings | `portal_settings` | jsonb | No | { show_quotes, show_contracts, ... } |
| (System) | `id` | uuid | Yes | Primary Key |
| (System) | `created_at` | timestamp | Yes | |

### Venues (`venues` table)
*Ref: `src/types/venue.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Name | `name` | string | Yes | |
| Address | `address` | string | Yes | |
| Email | `email` | string | No | General Venue Email |
| Phone | `phone` | string | No | General Venue Phone |
| Venue Area | `venue_area` | enum | No | Playa/Costa Mujeres, Cancun Z/H, Cancun, Puerto Morelos, Playa Del Carmen, Puerto Aventuras, Akumal, Tulum, Isla Mujeres, Cozumel, Other |
| City | `city` | string | No | |
| State/Province | `state` | string | No | |
| Zip/Postal Code | `zip_code` | string | No | |
| Country | `country` | string | No | |
| Website | `website` | string | No | |
| Instagram | `instagram` | string | No | @username |
| Facebook | `facebook` | string | No | Profile URL or Username |
| Notes | `notes` | string | No | Access codes, parking info, etc. |

### Venue Contacts (`venue_contacts` table)
*Ref: `src/types/venue.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Venue ID | `venue_id` | uuid | Yes | Foreign Key |
| First Name | `first_name` | string | Yes | |
| Last Name | `last_name` | string | Yes | |
| Role | `role` | string | Yes | e.g. Wedding Planner, Accounting |
| Email | `email` | string | Yes | |
| Phone | `phone` | string | No | |
| Is Primary | `is_primary` | boolean | Yes | Default false |

### Planners (`planners` table)
*Ref: `src/types/planner.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| First Name | `first_name` | string | Yes | |
| Last Name | `last_name` | string | Yes | |
| Company | `company` | string | No | |
| Email | `email` | string | Yes | |
| Phone | `phone` | string | No | |
| Website | `website` | string | No | |
| Instagram | `instagram` | string | No | @username |
| Facebook | `facebook` | string | No | Profile URL or Username |

---

### Leads (`leads` table)
*Captures raw inquiries from the website contact form.*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| First Name | `first_name` | string | Yes | |
| Last Name | `last_name` | string | Yes | |
| Email | `email` | string | Yes | |
| Phone | `phone` | string | No | |
| Role | `role` | enum | No | Bride, Groom, Parent, External Planner, Hotel/Resort, Private Venue |
| Event Type | `event_type` | enum | No | Wedding, Social Event, Corporate Event, Convention, Other |
| Event Date | `event_date` | date | No | |
| Guest Count | `guest_count` | number | No | Approximate |
| Budget | `budget` | number | No | |
| Venue Name | `venue_name` | string | No | Text field (user input) |
| Services | `services_interested` | array | No | Mini-Churros, Mini-Pancakes, etc. |
| Notes | `notes` | string | No | "Other information" |
| Lead Source | `lead_source` | enum | No | Website, Facebook, Facebook Group, Instagram, TikTok, External Planner, Hotel/Venue, Hotel/Venue PV, Vendor Referral, Client Referral, Other |
| Status | `status` | enum | Yes | New, Contacted, Qualified, Converted, Lost |
| (System) | `id` | uuid | Yes | Primary Key |
| (System) | `created_at` | timestamp | Yes | |

### Events (`events` table)
*Ref: `src/types/event.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Event Name | `name` | string | Yes | |
| Date | `date` | date | Yes | |
| Client | `client_id` | uuid | Yes | Foreign Key |
| Venue | `venue_id` | uuid | No | Foreign Key |
| Planner | `planner_id` | uuid | No | Foreign Key |
| Status | `status` | enum | Yes | inquiry, confirmed, completed, cancelled |
| Guest Count | `guest_count` | number | No | |
| Budget | `budget` | number | No | |
| Notes | `notes` | string | No | |
| Hashtag | `hashtag` | string | No | |
| Dietary Restrictions | `dietary_restrictions` | string | No | |
| Meet/Load Time | `meet_load_time` | string | No | |
| Leave Time | `leave_time` | string | No | |
| Arrive Venue Time | `arrive_venue_time` | string | No | |
| Setup Time | `setup_time` | string | No | |
| Start Time | `start_time` | string | No | |
| End Time | `end_time` | string | No | |
| Venue Contact ID | `venue_contact_id` | string | No | |
| Venue Address | `venue_address` | string | No | |
| Venue Contact Name | `venue_contact_name` | string | No | |
| Venue Contact Phone | `venue_contact_phone` | string | No | |
| Venue Contact Email | `venue_contact_email` | string | No | |
| Venue Sub Location | `venue_sub_location` | string | No | |
| Planner Company | `planner_company` | string | No | |
| Planner Name | `planner_name` | string | No | |
| Planner First Name | `planner_first_name` | string | No | |
| Planner Last Name | `planner_last_name` | string | No | |
| Planner Email | `planner_email` | string | No | |
| Planner Phone | `planner_phone` | string | No | |
| Planner Instagram | `planner_instagram` | string | No | |
| Day of Contact Name | `day_of_contact_name` | string | No | |
| Day of Contact Phone | `day_of_contact_phone` | string | No | |

### Notes (`notes` table)
*Ref: `src/types/note.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Entity ID | `entity_id` | uuid | Yes | Polymorphic ID |
| Entity Type | `entity_type` | enum | Yes | client, event, venue, planner, lead |
| Content | `content` | string | Yes | |
| Created By | `created_by` | string | Yes | User ID/Name |

### Activity Logs (`activity_logs` table)
*Ref: `src/types/activity.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Entity ID | `entity_id` | uuid | Yes | Polymorphic ID |
| Entity Type | `entity_type` | enum | Yes | client, event, venue, planner, lead |
| Action | `action` | string | Yes | e.g., "Status Updated" |
| Details | `details` | string | No | |
| Created By | `created_by` | string | Yes | User ID/Name |

### Inbox Emails (`inbox_emails` table)
*Used for syncing Zoho IMAP inbox messages into the app.*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Message ID | `message_id` | string | Yes | Unique message identifier |
| From | `from_address` | string | Yes | Sender address |
| To | `to_address` | string | Yes | Recipient list |
| CC | `cc_address` | string | No | Carbon copy list |
| Subject | `subject` | string | No | |
| Sent At | `sent_at` | timestamp | No | Email date header |
| Received At | `received_at` | timestamp | No | When synced |
| Text Body | `text_body` | text | No | Plain text content |
| HTML Body | `html_body` | text | No | HTML content |
| Source | `source` | string | No | Default `zoho` |
| Status | `status` | string | No | Default `unread` |
| (System) | `id` | uuid | Yes | Primary Key |
| (System) | `created_at` | timestamp | Yes | |

## 2. Financials & Contracts (Client Portal)

### Quotes (`quotes` table)
*Ref: `src/types/quote.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Client | `client_id` | uuid | Yes | Foreign Key |
| Event | `event_id` | uuid | Yes | Foreign Key |
| Items | `items` | jsonb | Yes | Array of {description, quantity, unit_price, total} |
| Taxes | `taxes` | jsonb | No | Array of {name, rate, amount, is_retention}; MXN amounts, retentions stored as negative |
| Total Amount | `total_amount` | number | Yes | Stored in MXN |
| Currency | `currency` | enum | Yes | MXN, USD, GBP, EUR, CAD |
| Exchange Rate | `exchange_rate` | number | Yes | Rate at time of creation (MXN base) |
| Questionnaire | `questionnaire_template_id` | uuid | No | Template ID |
| Contract | `contract_template_id` | uuid | No | Template ID |
| Payment Plan | `payment_plan_template_id` | uuid | No | Payment Schedule ID (from `payment_schedules` table) |
| Status | `status` | enum | Yes | draft, sent, accepted, rejected |
| Valid Until | `valid_until` | date | Yes | |
| Version | `version` | number | Yes | Default 1. Increments on edit. |
| Parent Quote | `parent_quote_id` | uuid | No | ID of original quote if this is a change order |

### Event Timeline (`event_timeline_items` table)
*Ref: `src/modules/events/EventTimeline.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Event ID | `event_id` | uuid | Yes | Foreign Key |
| Title | `title` | string | Yes | |
| Description | `description` | string | No | |
| Offset Minutes | `offset_minutes` | number | Yes | Relative to event start (e.g., -60, 0, 120) |
| Icon | `icon` | enum | Yes | package, car, pin, wrench, party, flag |
| Is Anchor | `is_anchor` | boolean | No | True for "Event Start" |

### Products (`products` table)
*Ref: `src/types/product.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Name | `name` | string | Yes | |
| Description | `description` | string | No | |
| Category | `category` | string | Yes | Planning, Catering, Decor, etc. |
| Cost | `cost` | number | Yes | Internal cost in MXN |
| Direct Price | `price_direct` | number | Yes | Price for direct clients in MXN |
| PV Price | `price_pv` | number | Yes | Price for Preferred Vendors in MXN |
| Is Active | `is_active` | boolean | Yes | Default true |
| Unit | `unit` | string | No | flat fee, per person, per hour |
| Image URL | `image_url` | string | No | |

### Templates (`templates` table)
*Ref: `src/modules/settings/TemplateSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Name | `name` | string | Yes | |
| Type | `type` | enum | Yes | email, contract, invoice, quote, questionnaire |
| Subject | `subject` | string | No | For emails |
| Content | `content` | text | No | HTML content for RTE templates |
| Questions | `questions` | jsonb | No | Array of question objects for questionnaires |
| Is Active | `is_active` | boolean | Yes | |

### Questionnaires (`questionnaires` table)
*Ref: `src/types/questionnaire.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Client | `client_id` | uuid | Yes | Foreign Key |
| Event | `event_id` | uuid | Yes | Foreign Key |
| Title | `title` | string | Yes | |
| Status | `status` | enum | Yes | pending, completed |
| Answers | `answers` | jsonb | No | Array of {question_id, answer} |

### Contracts (`contracts` table)
*Ref: `src/types/contract.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Client | `client_id` | uuid | Yes | Foreign Key |
| Event | `event_id` | uuid | Yes | Foreign Key |
| Quote | `quote_id` | uuid | No | Links back to originating quote |
| Content | `content` | text | Yes | HTML/Markdown |
| Status | `status` | enum | Yes | draft, sent, signed |
| Signed At | `signed_at` | timestamp | No | |
| Signature Metadata | `signature_metadata` | jsonb | No | Stores signer IP, user agent, timestamps, fingerprints |
| Document Version | `document_version` | integer | Yes | Defaults to 1 for versioned footer |

### Invoices (`invoices` table)
*Ref: `src/types/invoice.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Client | `client_id` | uuid | Yes | Foreign Key |
| Event | `event_id` | uuid | Yes | Foreign Key |
| Invoice # | `invoice_number` | string | Yes | |
| Items | `items` | jsonb | Yes | Array of {description, amount} |
| Total Amount | `total_amount` | number | Yes | |
| Status | `status` | enum | Yes | draft, sent, paid, overdue, cancelled |
| Due Date | `due_date` | date | Yes | |
| Type | `type` | enum | Yes | retainer, standard, change_order, final_balance |

### Tasks (`tasks` table)
*Ref: `src/types/task.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Client | `client_id` | uuid | Yes | Foreign Key |
| Title | `title` | string | Yes | |
| Description | `description` | string | No | |
| Status | `status` | enum | Yes | pending, completed |
| Due Date | `due_date` | date | No | |
| Completed At | `completed_at` | timestamp | No | |
| Completed By | `completed_by` | string | No | User ID/Name |

### Task Templates (`task_templates` table)
*Ref: `src/types/task.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Title | `title` | string | Yes | |
| Description | `description` | string | No | |
| Category | `category` | string | No | Onboarding, Planning, etc. |

### Client Files (`client_files` table)
*Ref: `src/types/clientFile.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Client | `client_id` | uuid | Yes | Foreign Key |
| Name | `name` | string | Yes | Original filename |
| Description | `description` | string | No | |
| URL | `url` | string | Yes | Storage URL |
| Type | `type` | string | Yes | MIME type |
| Size | `size` | number | Yes | In bytes |
| Uploaded By | `uploaded_by` | string | Yes | User ID/Name |

### Reviews (`reviews` table)
*Ref: `src/types/review.ts`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Client | `client_id` | uuid | Yes | Foreign Key |
| Event | `event_id` | uuid | Yes | Foreign Key |
| Rating | `rating` | number | Yes | 1-5 |
| Comment | `comment` | string | Yes | |
| Status | `status` | enum | Yes | pending, submitted |
| :--- | :--- | :--- | :--- |
| Total Amount | `total_amount` | decimal | Sum of all line items |
| Retainer % | `retainer_percentage` | decimal | e.g., 0.50 for 50% |
| Retainer Amount | `retainer_amount` | decimal | `total_amount * retainer_percentage` (or fixed override) |
| Paid Amount | `paid_amount` | decimal | Sum of all `payments` linked to this invoice |
| Balance Due | `balance_due` | decimal | `total_amount - paid_amount` |
| Status | `status` | enum | 'draft', 'sent', 'partial', 'paid', 'overdue' |

### Line Items (`invoice_items` table)
| UI Label | Field Name (Code/DB) | Type | Notes |
| :--- | :--- | :--- | :--- |
| Description | `description` | string | |
| Quantity | `quantity` | number | |
| Unit Price | `unit_price` | decimal | |
| Total | `total` | decimal | `quantity * unit_price` |

## 3. Mapping Strategy
To prevent "mapping errors":
1.  **Strict TypeScript Interfaces:** All frontend forms must use the exact types defined in `src/types`.
2.  **Zod Validation:** We will use Zod schemas that mirror the database constraints exactly.
3.  **Database Generated Types:** Once Supabase is fully connected, we will generate TypeScript types directly from the database schema to ensure they never drift out of sync.

## 4. System Configuration (Settings)

### Branding Settings (`branding_settings` table)
*Ref: `src/modules/settings/BrandingSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Company Name | `company_name` | string | Yes | |
| Logo URL | `logo_url` | string | No | |
| Primary Color | `primary_color` | string | Yes | Hex code |
| Secondary Color | `secondary_color` | string | Yes | Hex code |
| Accent Color | `accent_color` | string | Yes | Hex code |
| Theme Mode | `theme_mode` | enum | Yes | light, dark, system |

### Calendar Settings (`calendar_settings` table)
*Ref: `src/modules/settings/CalendarSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Timezone | `timezone` | string | Yes | e.g., America/Mexico_City |
| Week Start | `week_start` | enum | Yes | sunday, monday |
| Working Days | `working_days` | array | Yes | [1, 2, 3, 4, 5] |
| Working Hours Start | `working_hours_start` | string | Yes | HH:mm |
| Working Hours End | `working_hours_end` | string | Yes | HH:mm |
| Sync Google | `sync_google` | boolean | Yes | |
| Sync Outlook | `sync_outlook` | boolean | Yes | |
| Sync Apple | `sync_apple` | boolean | Yes | |

### Financial Settings (`financial_settings` table)
*Ref: `src/modules/settings/FinancialSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Base Currency | `base_currency` | enum | Yes | MXN, USD |
| Tax Name | `tax_name` | string | Yes | e.g., IVA |
| Tax Rate | `tax_rate` | number | Yes | Percentage (e.g., 16) |
| Tax ID | `tax_id` | string | No | RFC |
| Invoice Prefix | `invoice_sequence_prefix` | string | Yes | e.g., INV- |
| Next Invoice # | `invoice_sequence_start` | number | Yes | |
| Quote Prefix | `quote_sequence_prefix` | string | Yes | e.g., QT- |
| Next Quote # | `quote_sequence_start` | number | Yes | |
| Fiscal Year Start | `fiscal_year_start` | string | Yes | MM-DD |

### Payment Methods (`payment_methods` table)
*Ref: `src/modules/settings/PaymentMethodSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Provider | `provider` | enum | Yes | stripe, paypal, wise, remitly, bank_transfer, cash |
| Enabled | `is_active` | boolean | Yes | |
| Config | `config` | jsonb | Yes | Stores API keys, account numbers, instructions, etc. |

### Payment Schedules (`payment_schedules` table)
*Ref: `src/modules/settings/PaymentScheduleSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Name | `name` | string | Yes | e.g., Standard Split |
| Description | `description` | string | No | |
| Is Default | `is_default` | boolean | Yes | |
| Milestones | `milestones` | jsonb | Yes | Array of {name, percentage, due_type, days_offset} |

### Contact Forms (`contact_forms` table)
*Ref: `src/modules/settings/ContactFormSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Name | `name` | string | Yes | |
| Fields | `fields` | jsonb | Yes | Array of {type, label, required, options} |
| Settings | `settings` | jsonb | Yes | {successAction, notifyEmail, spamProtection, ...} |

### Expense Categories (`expense_categories` table)
*Ref: `src/modules/settings/ExpenseCategorySettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Name | `name` | string | Yes | |
| Color | `color` | string | No | Hex code (Parent only) |
| Parent ID | `parent_id` | uuid | No | Null for top-level categories |
| Is Active | `is_active` | boolean | Yes | |

### Users (`users` table)
*Ref: `src/modules/settings/UserManagementSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Name | `name` | string | Yes | |
| Email | `email` | string | Yes | Unique |
| Role | `role` | enum | Yes | admin, manager, staff |
| Status | `status` | enum | Yes | active, pending, deactivated |
| Last Login | `last_login` | timestamp | No | |
| Security Config | `security_config` | jsonb | No | {2fa_enabled, password_changed_at} |

### Staff Profiles (`staff_profiles` table)
*Ref: `src/modules/staff/StaffProfileDetails.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| User ID | `user_id` | uuid | Yes | Foreign Key to `users.id` |
| First Name | `first_name` | string | No | Overrides default derived from `users.name` |
| Last Name | `last_name` | string | No | |
| Phone | `phone` | string | No | |
| Address | `address` | string | No | Street + city |
| Date of Birth | `date_of_birth` | date | No | |
| ID Type | `id_type` | enum | No | INE, Passport, Driver License, Other |
| ID Number | `id_number` | string | No | |
| ID Expiration | `id_expiration_date` | date | No | |
| ID Front Upload | `id_front_url` | string | No | Supabase storage path |
| ID Back Upload | `id_back_url` | string | No | Supabase storage path |
| Bank Name | `bank_name` | string | No | e.g., BBVA, Santander |
| Card Number | `card_number` | string | No | Mask in UI when displaying |
| CLABE | `clabe` | string | No | 18-digit MX interbank key |
| Account Number | `account_number` | string | No | Internal reference or last 4 |
| Is Driver | `is_driver` | boolean | No | Default false |
| (System) | `created_at` | timestamp | Yes | |
| (System) | `updated_at` | timestamp | Yes | |

### Staff Pay Rates (`staff_pay_rates` table)
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Position Key | `position_key` | string | Yes | Canonical role slug (e.g., `driver_a`, `sales_logistics_1`). |
| Position Label | `position_label` | string | Yes | Human readable label shown in UI. |
| Rate Type | `rate_type` | enum | Yes | `flat`, `per_direction`, `percent_revenue`, `tiered_hours`, `tiered_quantity`. |
| Config | `config` | jsonb | Yes | Rule payload (amounts, default units, overtime rates, etc.). |
| Notes | `notes` | text | No | Internal documentation for finance team. |
| (System) | `id` | uuid | Yes | Primary Key |
| (System) | `created_at` | timestamp | Yes | |
| (System) | `updated_at` | timestamp | Yes | |

### Event Staff Assignments (`event_staff_assignments` table)
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Event | `event_id` | uuid | Yes | Foreign Key |
| Staff | `staff_id` | uuid | Yes | Foreign Key to `users.id` |
| Role | `role` | string | Yes | Display label (Driver A, Operator 1, etc.) |
| Status | `status` | enum | Yes | pending, confirmed, declined, completed |
| Start Time | `start_time` | timestamp | No | Shift start (optional) |
| End Time | `end_time` | timestamp | No | Shift end (optional) |
| Hours Worked | `hours_worked` | number | No | Used for hourly/tiered rules |
| Pay Type | `pay_type` | enum | Yes | flat, hourly |
| Pay Rate | `pay_rate` | number | No | Base rate or per-unit amount |
| Total Pay | `total_pay` | number | No | Calculated payout for the assignment |
| Pay Rule | `pay_rate_id` | uuid | No | FK to `staff_pay_rates.id` used for defaulting |
| Compensation Config | `compensation_config` | jsonb | No | Overrides (directions, kg, manual total, etc.) |
| Paid? | `is_paid` | boolean | Yes | |
| Paid At | `paid_at` | timestamp | No | |
| Payroll Run | `payroll_run_id` | uuid | No | Links to `payroll_runs.id` |
| Payment Method | `payment_method` | string | No | cash, transfer, etc. |
| From Account | `from_account` | string | No | Funding source |
| To Account | `to_account` | string | No | Destination account |
| Reference | `payment_reference` | string | No | e.g., RUN-2026-03 |
| (System) | `created_at` | timestamp | Yes | |
| (System) | `updated_at` | timestamp | Yes | |

### User Sessions (`user_sessions` table)
*Ref: `src/modules/settings/UserManagementSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| User ID | `user_id` | uuid | Yes | Foreign Key |
| Device | `device` | string | Yes | User Agent summary |
| IP Address | `ip_address` | string | Yes | |
| Location | `location` | string | No | GeoIP |
| Last Active | `last_active` | timestamp | Yes | |

### Token Management (`tokens` table)
*Ref: `src/modules/settings/TokenManagementSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Key | `key` | string | Yes | Unique identifier (e.g., client_name) |
| Label | `label` | string | Yes | Human readable name |
| Default Value | `default_value` | string | No | Fallback value |
| Category | `category` | enum | Yes | client, event, company, date |

### Email & Messaging (`email_settings` table)
*Ref: `src/modules/settings/EmailMessagingSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| SMTP Config | `smtp_config` | jsonb | Yes | { host, port, user, pass, secure } |
| Sender Identity | `sender_identity` | jsonb | Yes | { fromName, replyTo } |
| Signature | `signature` | text | No | HTML signature |
| Notifications | `notifications` | jsonb | Yes | { event_type: { email, in_app, sms, push } } |
| SMS Config | `sms_config` | jsonb | No | { provider, sid, token, phone } |

> Current notification keys: `quoteSent`, `newLead`, `contractSigned`, `invoicePaid`, and `eventReminder`.

### Automations (`workflows` table)
*Ref: `src/modules/settings/AutomationSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Name | `name` | string | Yes | |
| Active | `active` | boolean | Yes | |
| Trigger | `trigger` | string | Yes | Event name (e.g., lead_created) |
| Actions | `actions` | jsonb | Yes | Array of { type, config } |

### Automation Logs (`automation_logs` table)
*Ref: `src/modules/settings/AutomationSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Workflow ID | `workflow_id` | uuid | Yes | Foreign Key |
| Triggered At | `triggered_at` | timestamp | Yes | |
| Status | `status` | enum | Yes | success, failed |
| Details | `details` | text | No | Error message or success summary |

### Roles (`roles` table)
*Ref: `src/modules/settings/RolesPermissionsSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Name | `name` | string | Yes | |
| Description | `description` | string | No | |
| Is System | `is_system` | boolean | Yes | Cannot be deleted if true |
| Permissions | `permissions` | jsonb | Yes | { module: { create, read, update, delete } } |
| Field Security | `field_security` | jsonb | Yes | { viewFinancialTotals, etc. } |

### Templates (`templates` table)
*Ref: `src/modules/settings/TemplateSettings.tsx`*
| UI Label | Field Name (Code/DB) | Type | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Name | `name` | string | Yes | |
| Type | `type` | enum | Yes | email, contract, invoice, quote, questionnaire |
| Subject | `subject` | string | No | For emails |
| Content | `content` | text | Yes | HTML or JSON string |
| Last Modified | `last_modified` | timestamp | Yes | |
