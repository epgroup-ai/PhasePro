# PhasePro Development Guide

## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## Code Style Guidelines
- **Components**: Functional components with named exports
- **Imports**: React first, external libraries next, internal (@/) paths, then relative
- **Naming**: PascalCase for components/types, camelCase for variables/functions, kebab-case for files
- **Types**: Use TypeScript interfaces for props with PascalCase naming and Props suffix
- **Error Handling**: Try/catch blocks with detailed error messages, toast notifications
- **React Hooks**: Custom hooks for reusable logic, proper effect cleanup
- **State Management**: React Query for server state, Context API for global state
- **Styling**: Tailwind CSS utility classes with shadcn/ui components

## File Organization
- Feature-based organization with components grouped by domain
- Shared UI components in `client/src/components/ui`
- Pages in `client/src/pages`
- Hooks in `client/src/hooks`
- Server code in `server/` directory