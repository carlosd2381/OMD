
export interface SystemToken {
  key: string;
  label: string;
  category: string;
  description?: string;
}

export const SYSTEM_TOKENS: SystemToken[] = [
  // --- Client Category ---
  // Primary Contact
  { key: 'client_first_name', label: 'Client 1 First Name', category: 'Client', description: "Primary client's first name" },
  { key: 'client_last_name', label: 'Client 1 Last Name', category: 'Client', description: "Primary client's last name" },
  { key: 'client_company', label: 'Client 1 Company', category: 'Client', description: "Client's company or organization" },
  { key: 'client_job_title', label: 'Client 1 Job Title', category: 'Client', description: "Client's job title" },
  { key: 'client_phone', label: 'Client 1 Mobile', category: 'Client', description: "Primary mobile number" },
  { key: 'client_phone_office', label: 'Client 1 Office Phone', category: 'Client', description: "Office phone number" },
  { key: 'client_email', label: 'Client 1 Email', category: 'Client', description: "Primary email address" },
  { key: 'client_address', label: 'Client 1 Address', category: 'Client', description: "Billing address street" },
  { key: 'client_city_state_zip', label: 'Client 1 City/State/Zip', category: 'Client', description: "Full location string" },
  { key: 'client_instagram', label: 'Client 1 Instagram', category: 'Client', description: "Social media handle" },

  // Secondary Contact
  { key: 'client_2_first_name', label: 'Client 2 First Name', category: 'Client', description: "Secondary client's first name" },
  { key: 'client_2_last_name', label: 'Client 2 Last Name', category: 'Client', description: "Secondary client's last name" },
  { key: 'client_2_relationship', label: 'Client 2 Relationship', category: 'Client', description: "e.g. Groom, Spouse, Assistant" },
  { key: 'client_2_phone', label: 'Client 2 Phone', category: 'Client', description: "Secondary client's phone" },
  { key: 'client_2_email', label: 'Client 2 Email', category: 'Client', description: "Secondary client's email" },
  
  // General Account Info
  { key: 'client_referral_source', label: 'Referral Source', category: 'Client', description: "How they found us" },
  { key: 'client_type', label: 'Client Type', category: 'Client', description: "Direct or Preferred Vendor" },
  { key: 'couple_names', label: 'Couple Names', category: 'Client', description: "e.g. Jane & John" },

  // --- Event Category ---
  // Event Basics
  { key: 'event_name', label: 'Event Name', category: 'Event', description: "e.g. Smith Wedding" },
  { key: 'event_type', label: 'Event Type', category: 'Event', description: "Wedding, Corporate, etc." },
  { key: 'event_date', label: 'Event Date', category: 'Event', description: "Date of the main event" },
  { key: 'event_hashtag', label: 'Event Hashtag', category: 'Event', description: "Social media hashtag" },

  // Timeline
  { key: 'time_meet_load', label: 'Meet & Load Time', category: 'Timeline', description: "Staff arrival time" },
  { key: 'time_leave', label: 'Leave for Event', category: 'Timeline', description: "Departure time" },
  { key: 'time_arrive', label: 'Arrive at Venue', category: 'Timeline', description: "Arrival at venue" },
  { key: 'time_setup', label: 'Setup Time', category: 'Timeline', description: "Setup start time" },
  { key: 'time_start', label: 'Event Start Time', category: 'Timeline', description: "Guest arrival / Start" },
  { key: 'event_start_time', label: 'Event Start Time (Alias)', category: 'Timeline', description: "Alias for time_start" },
  { key: 'time_end', label: 'Event End Time', category: 'Timeline', description: "Event conclusion" },
  { key: 'event_end_time', label: 'Event End Time (Alias)', category: 'Timeline', description: "Alias for time_end" },

  // Counts & Dietary
  { key: 'guest_count', label: 'Guest Count', category: 'Event', description: "Total expected guests" },
  { key: 'dietary_restrictions', label: 'Dietary List', category: 'Event', description: "Summary of allergies/restrictions" },

  // --- Venue Category ---
  // Location
  { key: 'venue_name', label: 'Venue Name', category: 'Venue', description: "Name of the venue" },
  { key: 'venue_sub_location', label: 'Venue Sub-Location', category: 'Venue', description: "Specific room or area" },
  { key: 'venue_address', label: 'Venue Address', category: 'Venue', description: "Street address" },
  { key: 'venue_location_full', label: 'Venue City/State/Zip', category: 'Venue', description: "Full location string" },
  { key: 'venue_website', label: 'Venue Website', category: 'Venue', description: "Website URL" },

  // Venue Contact
  { key: 'venue_contact_name', label: 'Venue Contact Name', category: 'Venue', description: "Full name of venue contact" },
  { key: 'venue_contact_phone', label: 'Venue Contact Phone', category: 'Venue', description: "Phone number" },
  { key: 'venue_contact_email', label: 'Venue Contact Email', category: 'Venue', description: "Email address" },
  { key: 'venue_contact_role', label: 'Venue Contact Role', category: 'Venue', description: "Job title/Position" },

  // --- Planner / Coordinator Category ---
  // Planner Details
  { key: 'planner_company', label: 'Planner Company', category: 'Planner', description: "Agency name" },
  { key: 'planner_name', label: 'Lead Planner Name', category: 'Planner', description: "Full name" },
  { key: 'planner_phone', label: 'Planner Phone', category: 'Planner', description: "Mobile number" },
  { key: 'planner_email', label: 'Planner Email', category: 'Planner', description: "Email address" },
  { key: 'planner_instagram', label: 'Planner Instagram', category: 'Planner', description: "Social handle" },

  // Day-of Coordinator
  { key: 'day_of_contact_name', label: 'Day-of Contact Name', category: 'Planner', description: "On-site contact person" },
  { key: 'day_of_contact_phone', label: 'Day-of Contact Phone', category: 'Planner', description: "Emergency number" },

  // --- Financial Category ---
  { key: 'invoice_total', label: 'Invoice Total', category: 'Financial', description: "Total amount of invoice" },
  { key: 'balance_due', label: 'Balance Due', category: 'Financial', description: "Remaining balance" },
  { key: 'quote_line_items', label: 'Quote Line Items', category: 'Financial', description: "Table of items from the quote" },
  { key: 'invoice_schedule', label: 'Invoice Schedule', category: 'Financial', description: "List of invoices with due dates and amounts" },
  
  // --- System Category ---
  { key: 'company_name', label: 'My Company Name', category: 'System', description: "Your company name" },
  { key: 'current_date', label: 'Current Date', category: 'System', description: "Today's date" },
];
