# KitRunner - Event Kit Management System

## Overview

KitRunner is a mobile-first web application for managing event kit pickup and delivery orders. The system allows customers to browse upcoming events, identify themselves, confirm delivery details, and place orders for event kits with various payment options.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite with custom configuration for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Storage**: DatabaseStorage implementation with persistent data
- **API Style**: RESTful API with JSON responses
- **Development**: Hot reload with Vite middleware integration

### Key Components

#### Database Schema
- **Events**: Store event details (name, date, time, location, participant limits)
- **Customers**: Customer information with CPF validation for Brazilian market
- **Orders**: Order tracking with status management and payment methods
- **Kits**: Individual kit details linked to orders (names, CPF, shirt sizes)

#### Core Features
1. **Event Management**: Browse and view event details
2. **User Authentication**: Persistent login system with CPF and birth date validation
3. **Profile Management**: Comprehensive user profile with personal data and address management
4. **Address Management**: Multiple addresses with default address functionality (only one default per user)
5. **Cost Calculation**: Dynamic pricing based on distance and services
6. **Kit Configuration**: Multiple kit setup with individual details
7. **Payment Processing**: Multiple payment methods (credit, debit, PIX)
8. **Order Management**: Complete order tracking and history for authenticated users
9. **Simplified Ordering**: Logged-in users skip identification steps

#### Mobile-First Design
- Responsive design optimized for mobile devices
- Touch-friendly interface with appropriate sizing
- Brazilian Portuguese localization
- Currency formatting in Brazilian Real (BRL)

## Data Flow

### For New Users
1. **Event Selection**: Customer browses events and selects one
2. **Customer Authentication**: Identity verification via CPF and birth date or registration
3. **Address Verification**: Confirm delivery address from customer database or add new
4. **Cost Calculation**: Calculate delivery costs based on distance
5. **Kit Configuration**: Configure individual kits with names and sizes
6. **Payment Processing**: Select payment method and process order
7. **Order Confirmation**: Generate order confirmation with tracking

### For Authenticated Users
1. **Event Selection**: Customer browses events and selects one (login persisted)
2. **Address Confirmation**: Uses saved addresses or add new ones
3. **Cost Calculation**: Calculate delivery costs based on distance
4. **Kit Configuration**: Configure individual kits with names and sizes
5. **Payment Processing**: Select payment method and process order
6. **Order Confirmation**: Generate order confirmation with tracking

### Profile Management
- **Login**: Persistent authentication with localStorage
- **Profile View**: Complete user data display (name, CPF, birth date, phone, email)
- **Address Management**: Add, edit, delete addresses with default management
- **Order History**: View all previous orders with details
- **Logout**: Clear session and return to public flow

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React, React DOM, React Query
- **UI Components**: Radix UI primitives, Lucide React icons
- **Form Management**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS, Class Variance Authority
- **Date Handling**: date-fns for Brazilian date formatting

### Backend Dependencies
- **Database**: Drizzle ORM with PostgreSQL dialect
- **Server**: Express.js with middleware for JSON parsing
- **Database Provider**: Neon Database serverless driver
- **Validation**: Zod for request/response validation
- **Session Management**: Connect-pg-simple for PostgreSQL sessions

### Development Dependencies
- **Build Tools**: Vite, esbuild for production builds
- **TypeScript**: Full TypeScript support with strict mode
- **Development**: tsx for TypeScript execution, hot reload support

## Deployment Strategy

### Development Mode
- Vite dev server with hot module replacement
- Express server with middleware integration
- TypeScript compilation on-the-fly
- Database migrations via Drizzle Kit

### Production Build
- Vite builds client-side assets to `dist/public`
- esbuild bundles server code to `dist/index.js`
- Static file serving from Express for production
- Environment variable configuration for database URL

### Database Management
- Drizzle Kit for schema management and migrations
- PostgreSQL schema defined in `shared/schema.ts`
- Automatic migration generation and deployment
- Database URL configuration via environment variables

### Key Design Decisions

1. **Monorepo Structure**: Shared types and schemas between client and server
2. **Mobile-First Approach**: Tailored for Brazilian mobile commerce patterns
3. **Session-Based Flow**: Multi-step order process with session storage
4. **Type Safety**: End-to-end TypeScript with shared validation schemas
5. **Brazilian Market Focus**: CPF validation, Portuguese localization, BRL currency
6. **Serverless Database**: Neon Database for scalable PostgreSQL hosting
7. **Component Library**: shadcn/ui for consistent, accessible UI components
8. **Database-First Storage**: Replaced in-memory storage with persistent PostgreSQL database

## Recent Changes

### Final Replit Migration Completion with Test Data (January 2025)
- ✓ Successfully completed final migration from Replit Agent to standard Replit environment
- ✓ Created PostgreSQL database with all required environment variables (DATABASE_URL, PGPORT, PGUSER, etc.)
- ✓ Executed database schema migration using Drizzle Kit with no errors
- ✓ Populated database with comprehensive test data for development:
  - 4 realistic events in Paraíba cities (João Pessoa, Campina Grande, Patos)
  - 3 customers with valid Brazilian CPF numbers (11144477735, 22233344456, 33322211109)
  - 4 addresses distributed across customers with proper default management
  - 4 orders with different statuses (confirmado, kits_sendo_retirados, em_transito, entregue)
  - Individual kits with names, CPFs, and shirt sizes for each order
- ✓ Application fully operational on port 5000 with proper client/server separation
- ✓ All security practices implemented with robust architecture
- ✓ Database queries working correctly with real-time data updates
- ✓ Migration completed with tsx dependency working and API endpoints functional

### Pagination System Implementation for Admin Pages (January 2025)
- ✓ Implemented comprehensive pagination system for admin orders and customers pages
- ✓ Added backend support with getAllCustomersWithAddressesPaginated() and getAllOrdersWithDetailsPaginated() methods
- ✓ Enhanced storage layer with LIMIT/OFFSET SQL queries and search functionality
- ✓ Created reusable pagination UI component with Portuguese labels (Anterior/Próximo)
- ✓ Added debounced search for customers with real-time filtering
- ✓ Implemented page size controls (10 items per page) with total count display
- ✓ Enhanced API routes with pagination parameters and backward compatibility
- ✓ Added proper loading states and error handling for paginated data
- ✓ Improved UX with "Mostrando X a Y de Z itens" display and navigation controls
- ✓ System now efficiently handles large datasets with smooth pagination experience

### PDF Label Generation Enhancement with Modern Design (January 2025)
- ✓ Enhanced PDF label generator with modern, professional design using card-based layouts
- ✓ Added KitRunner logo integration in PDF headers with fallback to text
- ✓ Implemented color-coded sections with clean visual hierarchy (blue header, gray cards, white backgrounds)
- ✓ Created responsive two-column layout for better information organization
- ✓ Added modern signature and confirmation fields with structured boxes
- ✓ Enhanced typography with proper contrast and size hierarchy
- ✓ Added footer with generation timestamp and branding
- ✓ Applied consistent styling to both individual and bulk label generation
- ✓ Maintained all existing functionality while improving visual presentation

### Customer Management Completion & Data Display Fix (Janeiro 2025)
- ✓ Implementada formatação visual completa para CPF (111.111.111-11) e telefone ((83) 99999-9999)
- ✓ Dados armazenados no banco com apenas números para CPF e telefone
- ✓ Corrigido problema crítico de endereços e pedidos não aparecendo na página admin/customers
- ✓ Removida rota duplicata que estava sobrescrevendo getAllCustomersWithAddresses()
- ✓ Administração de clientes agora exibe corretamente:
  - Endereços completos com labels (Casa, Trabalho) e dados de localização
  - Contagem precisa de pedidos por cliente
  - Formatação consistente de CPF e telefone em toda a aplicação
- ✓ Aplicação totalmente funcional no porto 5000 com dados reais sendo exibidos

### Replit Migration Completion & Statistics Fix (January 2025)
- ✓ Successfully completed final migration from Replit Agent to Replit environment with PostgreSQL database
- ✓ Fixed admin statistics to use real-time database queries instead of hardcoded values
- ✓ Updated getOrderStats() method to properly calculate order counts by status (confirmado, aguardando_pagamento, cancelado, em_transito, kits_sendo_retirados, entregue)
- ✓ Statistics now dynamically update when order statuses change in the database
- ✓ All order status cards in admin/orders page now show accurate real-time counts
- ✓ Application fully operational with proper client/server separation and security practices

### Status Formatting Standardization & Statistics Fix (January 2025)
- ✓ Created unified status utility (`status-utils.tsx`) for consistent status display across all pages
- ✓ Standardized status badge colors and formatting throughout the application
- ✓ Fixed order details page to use proper Portuguese status mappings instead of outdated English statuses
- ✓ Updated my-orders page to use colored status badges matching admin panel design
- ✓ Unified admin dashboard and admin orders to use same status utility
- ✓ Applied consistent color scheme: green for confirmed/delivered, yellow for pending payment, red for cancelled, blue for pickup, orange for transit
- ✓ Fixed order statistics panel in admin/orders to use dynamic data instead of hardcoded values
- ✓ Order statistics now properly update when status changes are made
- ✓ Completed migration from Replit Agent to Replit environment with full functionality

### Status Translation & Database Migration (January 2025)
- ✓ Created unified status utility (`status-utils.tsx`) for consistent status display across all pages
- ✓ Standardized status badge colors and formatting throughout the application
- ✓ Fixed order details page to use proper Portuguese status mappings instead of outdated English statuses
- ✓ Updated my-orders page to use colored status badges matching admin panel design
- ✓ Unified admin dashboard and admin orders to use same status utility
- ✓ Applied consistent color scheme: green for confirmed/delivered, yellow for pending payment, red for cancelled, blue for pickup, orange for transit
- ✓ Completed migration from Replit Agent to Replit environment with full functionality

### Status Translation & Database Migration (January 2025)
- ✓ Successfully completed migration from Replit Agent to Replit environment
- ✓ Set up PostgreSQL database with proper environment variables and schema
- ✓ Created comprehensive seed data with valid Brazilian CPF numbers using proper algorithm
- ✓ Added 4 realistic events in Paraíba with proper pricing models and donation requirements
- ✓ Created 3 customers with valid CPF numbers: 11144477735, 22233344456, 33322211109
- ✓ Translated all order status values to Portuguese in database and API
- ✓ Updated status mappings: confirmado, aguardando_pagamento, cancelado, kits_sendo_retirados, em_transito, entregue
- ✓ Fixed admin dashboard statistics API to work with Portuguese status names
- ✓ Updated client-side status displays and dropdowns to use Portuguese
- ✓ Application now fully operational on port 5000 with consistent Portuguese status system
- ✓ Fixed admin dashboard main page status display to show properly formatted Portuguese labels
- ✓ Added "Ver Detalhes" button to admin dashboard orders for easy access to order management page
- ✓ All status values throughout system now properly translated and formatted

### Replit Migration Completion & Authentication Fixes (January 2025)
- ✓ Successfully completed migration from Replit Agent to Replit environment
- ✓ Set up PostgreSQL database with proper environment variables
- ✓ Fixed React hooks order error in MyOrders component by moving all hooks to top level
- ✓ Enhanced authentication context with better localStorage validation and loading states
- ✓ Fixed Profile page authentication redirect issue on page refresh
- ✓ Improved loading state handling to prevent premature redirects during auth initialization
- ✓ Added proper validation for user data retrieved from localStorage
- ✓ Enhanced error handling in authentication flow with console warnings

### Event Form UX Enhancement & Replit Migration (January 2025)
- ✓ Enhanced event creation form with smart pricing type selector to prevent accidental zero pricing
- ✓ Added "Tipo de Precificação" select field with "Calculado por Distância" and "Preço Fixo" options  
- ✓ Fixed price field only shows when "Preço Fixo" is selected, preventing pricing errors
- ✓ Added form validation requiring valid price when fixed pricing is selected
- ✓ Successfully migrated from Replit Agent to standard Replit environment
- ✓ Configured PostgreSQL database with proper schema migration
- ✓ Updated database connection from Neon to standard PostgreSQL for Replit compatibility
- ✓ Enhanced payment page with detailed kit information display (names, CPFs, shirt sizes)
- ✓ Improved "Meus Pedidos" flow to redirect unauthenticated users to login page
- ✓ Enhanced login page with better registration options when CPF is not found
- ✓ Added return path functionality to redirect users back to intended page after login
- ✓ Fixed outdated pricing display by removing "Taxa base de retirada" from event details
- ✓ Fixed TypeScript errors and improved type safety across authentication flows

### Order Flow Optimization & Navigation Fixes (January 2025)
- ✓ Removed /cost page from order flow - users go directly from address confirmation to kit information
- ✓ Fixed back button navigation throughout entire order flow to navigate to previous page instead of home
- ✓ Updated order flow: Events → Event Details → Customer Identification → Address Confirmation → Kit Information → Payment → Order Confirmation
- ✓ Fixed double login issue with proper React state management and authentication timing
- ✓ Added proper returnPath functionality for login redirection
- ✓ Enhanced status translation in orders (confirmed → Confirmado)

### Event Form UX Enhancement & Replit Migration (January 2025)
- ✓ Enhanced event creation form with smart pricing type selector to prevent accidental zero pricing
- ✓ Added "Tipo de Precificação" select field with "Calculado por Distância" and "Preço Fixo" options  
- ✓ Fixed price field only shows when "Preço Fixo" is selected, preventing pricing errors
- ✓ Added form validation requiring valid price when fixed pricing is selected
- ✓ Successfully migrated from Replit Agent to standard Replit environment
- ✓ Configured PostgreSQL database with proper schema migration
- ✓ Updated database connection from Neon to standard PostgreSQL for Replit compatibility
- ✓ Enhanced payment page with detailed kit information display (names, CPFs, shirt sizes)
- ✓ Improved "Meus Pedidos" flow to redirect unauthenticated users to login page
- ✓ Enhanced login page with better registration options when CPF is not found
- ✓ Added return path functionality to redirect users back to intended page after login
- ✓ Fixed outdated pricing display by removing "Taxa base de retirada" from event details
- ✓ Fixed TypeScript errors and improved type safety across authentication flows

### Migration to Replit & CPF Validation + Pricing Fixes (January 2025)
- ✓ Successfully migrated project from Replit Agent to Replit environment
- ✓ Set up PostgreSQL database with all required tables and relationships
- ✓ Implemented proper CPF validation algorithm in all forms (registration, identification, kit information)
- ✓ Fixed pricing consistency across all order flow pages (partial-cost, kit-information, payment, confirmation)
- ✓ Corrected donation amount calculation to multiply by kit quantity as required
- ✓ Unified delivery cost calculations between client and server
- ✓ Enhanced pricing breakdown to show accurate costs in all order stages
- ✓ Applied Brazilian CPF validation formula with check digit verification
- ✓ Ensured all pricing logic handles fixed prices and distance-based calculations consistently
- ✓ Created unified pricing calculator module for consistent calculations across all pages
- ✓ Updated order details page with complete pricing breakdown including donations and extra kits
- ✓ Fixed all pricing discrepancies between kit information, payment, confirmation and order details pages

## Recent Changes

### Pricing Structure Overhaul & Data Consistency (January 2025)
- ✓ Complete pricing structure overhaul - removed pickup base costs (R$ 15.00) from all calculations
- ✓ Updated server-side pricing logic to use delivery costs instead of pickup costs
- ✓ Fixed client-side pricing displays in payment and kit information screens
- ✓ Replaced obsolete event edit form with standardized structure matching creation form
- ✓ Added proper form validation and field alignment with current database schema
- ✓ Cleaned event details page by removing non-existent fields (time, participants)
- ✓ Fixed date formatting to display properly in Brazilian format (DD/MM/YYYY)
- ✓ Enhanced pricing breakdown to separate retirada (pickup) and entrega (delivery) costs
- ✓ Added donation display integration in order summaries
- ✓ Resolved all TypeScript errors and improved type safety across pricing components

### Admin Dashboard Implementation (January 2025)
- ✓ Complete database schema migration with new pricing model
- ✓ Added comprehensive admin dashboard with responsive design for mobile/desktop
- ✓ Implemented customer, orders, and events management interfaces
- ✓ Created event creation form with full pricing configuration
- ✓ Added support for donation requirements and coupon system
- ✓ Implemented provisional distance-based pricing algorithm
- ✓ Added admin statistics dashboard with total customers, orders, revenue
- ✓ Integrated admin panel access from main events page
- ✓ Added admin authentication system with login credentials
- ✓ Created responsive lateral menu for admin panel navigation
- ✓ Fixed event details page participants field error
- ✓ Implemented AdminLayout component for consistent admin interface

### Delivery Cost Calculation Implementation (January 2025)
- ✓ Implemented proper delivery cost calculation based on ZIP code distance
- ✓ Created distance calculator utility with Haversine formula
- ✓ Fixed pricing display to separate fixed_price from delivery costs
- ✓ Updated all order flow pages to show correct delivery pricing
- ✓ Added pickup_zip_code field to events table for distance calculation
- ✓ Enhanced pricing breakdown in kit information, payment, and confirmation pages
- ✓ Corrected pricing logic to properly handle fixed vs variable pricing models
- ✓ Added real-time delivery cost calculation in address selection

### Authentication System Implementation (January 2025)
- ✓ Added persistent login system with localStorage for session management
- ✓ Created comprehensive profile page with user data and address management
- ✓ Implemented proper address default management (only one default per user)
- ✓ Added login/logout functionality with auth context provider
- ✓ Enhanced address editing with isDefault checkbox functionality
- ✓ Updated My Orders to work with authenticated users
- ✓ Simplified order flow for logged-in users (skip CPF/birth date entry)
- ✓ Added footer with easy access to Profile and My Orders from events page

### Database Integration (December 2024)
- ✓ Added PostgreSQL database with Neon Database provider
- ✓ Created DatabaseStorage implementation replacing MemStorage
- ✓ Migrated from in-memory to persistent data storage
- ✓ Seeded database with initial events and customer data
- ✓ Maintained all existing API functionality with database backend

The application follows a progressive enhancement approach, starting with a solid server-side foundation and enhancing the user experience with modern client-side features.