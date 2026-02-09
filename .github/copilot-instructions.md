<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->
- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements

- [x] Scaffold the Project

- [x] Customize the Project

- [x] Install Required Extensions

- [x] Compile the Project

- [x] Create and Run Task

- [x] Launch the Project

- [x] Ensure Documentation is Complete
    <!-- Create README.md and docs/DATA_DICTIONARY.md -->

- [x] Maintain Data Dictionary
    <!-- Update docs/DATA_DICTIONARY.md whenever adding new fields or entities to ensure mapping accuracy -->

## Implementation Phase 1: Core CRM & Structure

- [x] Configure Supabase Client
    <!-- Create src/lib/supabase.ts and add environment variables -->

- [x] Implement App Layout & Navigation
    <!-- Create MainLayout, Sidebar, and Header components -->

- [x] Implement CRM: Clients
    <!-- Create Types, Service, List View, and Add/Edit Forms for Clients -->

- [x] Implement CRM: Venues
    <!-- Create Types, Service, List View, and Add/Edit Forms for Venues -->

- [x] Implement CRM: Planners
    <!-- Create Types, Service, List View, and Add/Edit Forms for Planners -->

- [x] Implement CRM: Leads
    <!-- Create Types, Service, List View, and Add/Edit Forms for Leads (Inquiries) -->

- [x] Implement Settings Page
    <!-- Create basic settings page structure -->

## Implementation Phase 2: Core Business Logic

- [x] Implement Products & Services
    <!-- Create Types, Service, List View, and Add/Edit Forms for Products/Services -->

- [x] Implement Events Management
    <!-- Create Types, Service, List View, and Add/Edit Forms for Events -->

- [x] Implement Client Portal & Booking Flow
    <!-- Create Quotes, Questionnaires, Invoices, Contracts -->

- [x] Implement Client Hub Features
    <!-- Add Tasks, Files, and Portal Administration to Client Details -->

- [x] Implement Tasks Section
    <!-- Create centralized Task List and Task Modal -->

## Implementation Phase 3: Advanced Features & Polish

- [x] Standardize Document IDs and List Views
    <!-- Ensure consistent ID format (PREFIX-YYMMDD-001-V1) and uniform list layouts across Admin and Portal -->

- [x] Implement PDF Generation
    <!-- Generate PDF documents for Quotes, Contracts, and Invoices -->

- [ ] Implement Email Notifications
    <!-- Send emails for Quote sent, Contract signed, Invoice paid -->

- [ ] Implement Analytics Dashboard
    <!-- Add charts and stats to the main dashboard -->

## Implementation Phase 4: System Configuration

- [x] Implement Branding Settings
    <!-- Configure logo, colors, and theme mode -->

- [x] Implement Delivery Settings
    <!-- Configure delivery fees and distance calculations -->

- [x] Implement Calendar Settings
    <!-- Configure timezone, working hours, and sync options -->

- [x] Implement Financial Settings
    <!-- Configure currency, tax rates, and invoice sequencing -->

- [x] Implement Payment Methods
    <!-- Configure Stripe, PayPal, Wise, Bank Transfers, and Cash -->

- [x] Implement Payment Schedules
    <!-- Configure standard payment terms and milestones. Note: Payment Plans are stored in `payment_schedules` table, not `templates`. -->

- [x] Implement Contact Forms
    <!-- Create form builder with embed code generation -->

- [x] Implement Expense Categories
    <!-- Manage hierarchical chart of accounts -->

- [x] Implement User Management
    <!-- Manage users, roles, invites, and active sessions -->

- [x] Implement Token Management
    <!-- Manage dynamic tokens for templates -->

- [x] Implement Email & Messaging Settings
    <!-- Configure SMTP, SMS, and notification preferences -->

- [x] Implement Automation Settings
    <!-- Configure workflows and triggers -->

- [x] Implement Roles & Permissions
    <!-- Manage user roles and access control -->

- [x] Implement Template Management
    <!-- Manage email, contract, and questionnaire templates -->

<!--
## Execution Guidelines
PROGRESS TRACKING:
- If any tools are available to manage the above todo list, use it to track progress through this checklist.
- After completing each step, mark it complete and add a summary.
- Read current todo list status before starting each new step.

COMMUNICATION RULES:
- Avoid verbose explanations or printing full command outputs.
- If a step is skipped, state that briefly (e.g. "No extensions needed").
- Do not explain project structure unless asked.
- Keep explanations concise and focused.

DEVELOPMENT RULES:
- Use '.' as the working directory unless user specifies otherwise.
- Avoid adding media or external links unless explicitly requested.
- Use placeholders only with a note that they should be replaced.
- Use VS Code API tool only for VS Code extension projects.
- Once the project is created, it is already opened in Visual Studio Code—do not suggest commands to open this project in Visual Studio again.
- If the project setup information has additional rules, follow them strictly.

FOLDER CREATION RULES:
- Always use the current directory as the project root.
- If you are running any terminal commands, use the '.' argument to ensure that the current working directory is used ALWAYS.
- Do not create a new folder unless the user explicitly requests it besides a .vscode folder for a tasks.json file.
- If any of the scaffolding commands mention that the folder name is not correct, let the user know to create a new folder with the correct name and then reopen it again in vscode.

EXTENSION INSTALLATION RULES:
- Only install extension specified by the get_project_setup_info tool. DO NOT INSTALL any other extensions.

PROJECT CONTENT RULES:
- If the user has not specified project details, assume they want a "Hello World" project as a starting point.
- Avoid adding links of any type (URLs, files, folders, etc.) or integrations that are not explicitly required.
- Avoid generating images, videos, or any other media files unless explicitly requested.
- If you need to use any media assets as placeholders, let the user know that these are placeholders and should be replaced with the actual assets later.
- Ensure all generated components serve a clear purpose within the user's requested workflow.
- If a feature is assumed but not confirmed, prompt the user for clarification before including it.
- If you are working on a VS Code extension, use the VS Code API tool with a query to find relevant VS Code API references and samples related to that query.

TASK COMPLETION RULES:
- Your task is complete when:
  - Project is successfully scaffolded and compiled without errors
  - copilot-instructions.md file in the .github directory exists in the project
  - README.md file exists and is up to date
  - User is provided with clear instructions to debug/launch the project

Before starting a new task in the above plan, update progress in the plan.
-->
- Work through each checklist item systematically.
- Keep communication concise and focused.
- Follow development best practices.
