Build a comprehensive business management application for dessert catering businesses, providing end-to-end functionality from lead generation to event completion. The app features CRM, event planning, financial management, and client portals.

Details to consider when building this app:
- Small files - Modular
- Company is based in Mexico. Multi-Currency support for quotes and invoices. For tax simplicity purposes, all final financials figures will have to be in Mexican Pesos (MXN). 
- No hard coded mock data

Important sections to complete first:
- CRM Hubs: Clients - Venues - Planners
- Client Portal & Booking Flow Package > Quotes, Questionnaires, Invoices, Contracts
- Events
- Products/Services
- Settings Page

Sections to complete after:
- Calendar
- Payroll
- Kitchen/Production
- Financials
- Email
- Analytics
- Tasks
- Marketing

Frontend Framework
- React 19 with TypeScript for component-based UI development
- Vite as the build tool and development server
- React Router DOM for client-side routing

Styling & UI
- Tailwind CSS with PostCSS for utility-first styling
- Headless UI and Heroicons for accessible UI components
- Lucide React for additional iconography
- Custom CSS variables for theming
- Responsive design supporting mobile (320px+), tablet (768px+), desktop (1024px+), and large screens (1280px+)

Backend & Database
- Supabase (PostgreSQL) as the primary backend service
- Database tables with Row Level Security (RLS) policies
- Authentication managed via Supabase Auth
- Real-time subscriptions
- API endpoints via Supabase functions
- Express.js** for custom proxy servers (Wise payments, Google Places, email handling)

Payments & Financial
- Stripe for payment processing and financial operations
- Wise integration for international payments
- Multi-currency support with exchange rate handling

Forms & Validation
- React Hook Form for form management
- Zod for schema validation
- React Phone Number Input and libphonenumber-js for phone number handling

Rich Content & Editing
- TipTap rich text editor with extensions for tables, images, links, colors, etc.
- @react-pdf/renderer for PDF generation

Data Visualization & Charts
- Recharts for business intelligence and reporting dashboards

HTTP & API Communication
- Axios for HTTP requests
- CORS handling for cross-origin requests

Email & Communication
- Nodemailer for sending emails
- IMAP and mailparser for email processing and parsing
- Zoho integration for email services

Drag & Drop Functionality
- @hello-pangea/dnd for Kanban boards and task management

Date & Time Handling
- date-fns for date manipulation and formatting

Development & Testing
- TypeScript for type safety
- ESLint with React-specific rules for code linting
- Vitest with Testing Library for unit and integration testing
- @vitest/ui for test UI
- Partial test coverage (API layer and some components)

Additional Libraries
- React Hot Toast for notifications
- React Grid Layout for dashboard customization
- Classnames and clsx for conditional CSS classes
- Dotenv for environment variable management
