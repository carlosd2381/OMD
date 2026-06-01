# Client Import Mapping (Current CRM -> OMD)

Use this with docs/client_import_template.csv.

## Required columns in OMD
- first_name
- last_name
- email

## Supported columns in OMD template
- first_name
- last_name
- email
- phone
- company_name
- address
- city
- state
- zip_code
- country
- role
- relationship
- type
- lead_source
- instagram
- facebook
- job_title
- phone_office
- notes
- portal_access

## Value rules
- role: Bride, Groom, Parent, External Planner, Hotel/Resort, Private Venue
- type: Direct, Preferred Vendor
- lead_source: Website, Facebook, Facebook Group, Instagram, TikTok, External Planner, Hotel/Venue, Hotel/Venue PV, Vendor Referral, Client Referral, Other
- portal_access: true or false

## Suggested mapping from your attached export
- first_name/last_name: split from Clients (or Contacts with Role: Primary Contact)
- email: first email from Client Emails
- phone: not reliably present in your export; leave blank if missing
- company_name: optional; use planner/company text only when the contact is not a private person
- address: Primary Session Location Address
- city/state/zip_code/country: parse from Primary Session Location Address when available
- role: from contact role columns (Bride/Groom/Organizer/Planner/Primary Contact)
- relationship: optional free text (example: Mother of Bride)
- type: default Direct unless this is a referral partner profile
- lead_source: Source
- instagram/facebook: leave blank unless you have clean values
- notes: Lead Notes
- portal_access: false for bulk imports unless you want immediate portal invitations

## Columns from current export to ignore for client import
These are event or financial fields and should not be imported into clients:
- Job Date, Stage, Products Ordered, Revenue, Cost, Profit, Balance, Paid To Date
- Next Payment Due, Next Payment Amount, Booking Date, Fulfillment Date, Completed Date
- Gallery fields, Deliverables, Team, Vendors
