# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "fbaged-v2", a React-based budget and campaign management application with multi-user support. The application uses:
- **React 18** with Vite for fast development
- **Supabase** for backend services and authentication  
- **React Query** for data fetching and caching
- **React Router** for navigation
- **Styled Components** for styling
- **React Hook Form** for form management
- **Recharts** for data visualization

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Folder Structure
- `/src/pages/` - Main application pages (Dashboard, Campaigns, Budget, AdminDashboard)
- `/src/features/` - Feature-specific components organized by domain:
  - `auth/` - Authentication and user management
  - `budget/` - Budget management (accounts, deposits, expenses, balance)
  - `campaigns/` - Campaign management and analytics
  - `admin/` - Administrative controls and forms
  - `dashboard/` - Dashboard-specific components
- `/src/ui/` - Reusable UI components (Layout, Form, Table, Modal, etc.)
- `/src/services/` - API services for Supabase integration
- `/src/hooks/` - Custom React hooks
- `/src/utils/` - Utility functions and helpers

### Key Architectural Patterns
- **Feature-based organization**: Components grouped by business domain rather than technical type
- **Protected routes**: Authentication required for all routes except login
- **React Query**: All API calls use React Query for caching, loading states, and error handling
- **Custom hooks pattern**: Business logic extracted into custom hooks (e.g., `useBudget`, `useCampaigns`)
- **Modal system**: Centralized modal management using context pattern
- **Form handling**: React Hook Form for all forms with validation

### Authentication & Authorization
- Supabase authentication with protected route system
- User roles: regular users and admin users (admin-dashboard route)
- Authentication state managed through `useUser` hook

### Data Flow
1. Components use custom hooks (e.g., `useCampaigns`, `useBudget`)
2. Custom hooks call API services in `/services/` directory
3. API services interact with Supabase client
4. React Query manages caching, loading, and error states
5. UI updates reactively based on query state

### State Management
- React Query for server state
- React Hook Form for form state  
- Local component state for UI state
- Context for modal management and global UI state

## Key Files
- `src/App.jsx` - Main app component with routing setup
- `src/services/supabase.js` - Supabase client configuration
- `src/ui/AppLayout.jsx` - Main application layout wrapper
- `src/features/auth/ProtectedRoute.jsx` - Authentication wrapper for protected pages

## Styling
Uses Styled Components with:
- Global styles in `src/styles/GlobalStyles.js`
- Component-level styled components
- Responsive design patterns
- Consistent design system through reusable UI components