# OMD - Dessert Catering Business Management App

A comprehensive business management application for dessert catering businesses, featuring CRM, event planning, financial management, and client portals.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Realtime), Express.js (Server)
- **State/Data:** React Query (via Supabase), React Hook Form, Zod
- **UI:** Headless UI, Heroicons, Lucide React, Recharts, TipTap, @hello-pangea/dnd

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Install frontend dependencies:
   ```bash
   npm install
   ```

2. Install server dependencies:
   ```bash
   cd server
   npm install
   cd ..
   ```

### Running the App

1. Start the frontend development server:
   ```bash
   npm run dev
   ```

2. Start the backend server (in a separate terminal):
   ```bash
   cd server
   npm run dev
   ```

  ### Environment Variables

  Create a `.env` file in the project root before running the app:

  ```bash
  VITE_SUPABASE_URL=your_supabase_url
  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
  VITE_NOTIFICATIONS_API_URL=http://localhost:3001
  # Optional – shown in outbound emails when present
  VITE_CLIENT_PORTAL_URL=https://portal.yourdomain.com
  ```

## Project Structure

- `src/` - Frontend source code
  - `components/` - Reusable UI components
  - `pages/` - Route components
  - `modules/` - Feature-specific modules (CRM, Events, etc.)
  - `services/` - API and service layers
  - `hooks/` - Custom React hooks
  - `utils/` - Utility functions
  - `types/` - TypeScript type definitions
- `server/` - Express.js backend server

## Features

- **CRM Hubs:** Clients, Venues, Planners
- **Client Portal:** Quotes, Invoices, Contracts
- **Events Management**
- **Products & Services**
- **Financials:** Multi-currency support (MXN primary)

## License

Private

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
