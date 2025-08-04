# KitRunner - Event Kit Management System

## Overview
KitRunner is a mobile-first web application designed for managing event kit pickup and delivery orders. It enables customers to browse events, place orders, confirm delivery details, and manage payments. The system aims to streamline event kit logistics, providing a user-friendly experience for participants and efficient management tools for organizers.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (August 4, 2025)
- **Event-Specific CEP Zone Pricing Implementation Complete**: Successfully implemented the comprehensive event-specific pricing customization system for CEP zones as requested
  - **Database Schema**: Created `eventCepZonePrices` table with foreign keys to events and CEP zones, supporting custom pricing per event
  - **Backend API**: Enhanced CEP zones calculator to support event-specific pricing with fallback to global zone prices
  - **API Routes**: Added GET/PUT endpoints for managing event-specific CEP zone prices in admin interface
  - **Frontend Components**: Created `EventCepZonePrices` React component for admin interface with real-time price editing
  - **Integration**: Updated admin event form to show CEP zone pricing configuration after event creation when using CEP zones pricing type
  - **Client Integration**: Enhanced `checkCepZone` function to support eventId parameter for event-specific pricing calculation
  - **Sample Data**: Added example pricing configurations showing "Corrida de João Pessoa" with custom prices (Centro: R$ 15.00, Zona Sul: R$ 22.00, Bayeux: R$ 35.00)

## Previous Changes (August 3, 2025)
- **Project Migration Completed**: Successfully migrated KitRunner from Replit Agent to standard Replit environment with full database and API integration
- **Landing Page Implementation**: Implemented complete landing page as initial screen exactly as provided in ZIP file, with routing updated so landing page (/) leads to events page (/eventos)
- **Brand Color Update**: Applied brand color #822ae6 (hsl(267, 73%, 54%)) as primary color throughout the application
- **React Hook Fixes**: Fixed client-side rendering issues in auth context to prevent SSR/hydration errors
- **Database Setup Complete**: PostgreSQL database created and populated with comprehensive sample data (4 events, 6 customers, 7 orders, 13 kits, admin users)
- **Admin Credentials Created**: Super admin user created (username: superadmin, password: KitRunner2025!@#)
- **Sample Data Loaded**: Events, customers, addresses, orders, and kits populated for testing
- **CEP Zones System Implemented**: Complete CRUD operations for postal code zones with admin interface, backend API routes, and sample zones data
- **CEP Zones Pricing Bug Fixed**: Fixed critical issue where CEP zones pricing type was not being saved to database - corrected backend route that was incorrectly removing pricingType field before database save
- **Form Controls Enhancement**: Updated Select components in admin event form to use controlled values instead of defaultValues, ensuring proper form state management for pricing type selection
- **CEP Zones Client Integration Complete**: Implemented comprehensive client-side integration with error handling, loading states, user guidance, zone information display, and flow control blocking for unsupported CEPs

## Previous Changes (August 1, 2025)
- **Project Migration Completed**: Successfully migrated KitRunner from Replit Agent to standard Replit environment with full database and API integration
- **Authentication Flow Improvement**: Removed `/events/[id]/identify` page and implemented proper login redirect flow
- **Simplified User Experience**: Unauthenticated users are now redirected directly to main login page with automatic return to intended destination
- **Modal Blocking Bug Fix**: Resolved issue where `pointer-events: none` remained on body element after modal closure
- **Email Template Customization**: Updated all email templates with specific delivery dates (1 day before event), WhatsApp contact integration, order details page redirects, and removed all tracking code references
- **Status Display Updates**: Changed "Retirada Confirmada" to "Retirada em Andamento" 
- **Enhanced Next Steps**: Updated service confirmation emails with improved timeline and emojis
- **Contact Integration**: Added WhatsApp button (83 98130-2961) to all email footers
- **Authentication Flow Fix**: Corrected payment page redirect from old `/identify` route to proper login flow with smart data validation
- **Bulk Order Status Updates**: Fixed bulk status change functionality with proper email integration, removed duplicate email sending issue
- **Email System Optimization**: Configured specific email templates for different order statuses (confirmado, em_transito, entregue, aguardando_pagamento)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with custom CSS variables
- **Build Tool**: Vite
- **Design Principles**: Responsive design optimized for mobile devices, touch-friendly interface, Brazilian Portuguese localization, Brazilian Real (BRL) currency formatting.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Supabase PostgreSQL (serverless)
- **Storage**: Persistent DatabaseStorage implementation
- **API Style**: RESTful API with JSON responses

### Key Components & Features
- **Database Schema**: Events, Customers, Orders, and Kits with detailed attributes.
- **Core Features**: Event management, user authentication (with CPF validation for Brazil), profile and address management, dynamic cost calculation (distance-based pricing, fixed pricing, and planned CEP zones pricing), kit configuration, multiple payment methods (credit, debit, PIX), order tracking, bulk order status management, and simplified ordering for logged-in users.
- **Monorepo Structure**: Shared types and schemas between client and server.
- **Mobile-First Approach**: Tailored for Brazilian mobile commerce patterns.
- **Session-Based Flow**: Multi-step order process with session storage.
- **Type Safety**: End-to-end TypeScript with shared validation schemas.
- **Brazilian Market Focus**: CPF validation, Portuguese localization, BRL currency.
- **Component Library**: shadcn/ui for consistent, accessible UI components.
- **Authentication**: JWT-based admin authentication, persistent user login with localStorage, role-based access control (RBAC), ownership validation, and streamlined login redirect flow with automatic return to intended destination.
- **PDF Generation**: Modern, professional PDF label generation for order kits.
- **Email Notification System**: Comprehensive system for order confirmations, status updates, and payment reminders with professional, responsive HTML templates. Custom templates with delivery date calculations (1 day before event), WhatsApp contact integration (83 98130-2961), order details page redirects (/orders/{orderNumber}), and removal of tracking code references.

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React, React DOM, React Query
- **UI Components**: Radix UI primitives, Lucide React icons
- **Form Management**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS, Class Variance Authority
- **Date Handling**: date-fns

### Backend Dependencies
- **Database**: Drizzle ORM with PostgreSQL dialect
- **Server**: Express.js
- **Database Provider**: Neon Database serverless driver
- **Validation**: Zod
- **Session Management**: Connect-pg-simple
- **Payment Gateway**: Mercado Pago SDK (mercadopago package)
- **Email Service**: SendGrid

### Development Dependencies
- **Build Tools**: Vite, esbuild
- **TypeScript**: Full TypeScript support
- **Development**: tsx

## 🚀 Recently Implemented Features

### Event-Specific CEP Zone Pricing System ✅
A comprehensive event-specific pricing customization system has been successfully implemented. This extends the CEP zones system to allow different prices per zone for each specific event.

**Completed Features:**
- **Base CEP Zones System**: Interface to create and manage delivery zones by CEP ranges (e.g., "João Pessoa Z1: 58000-000 to 58099-999 = R$ 20.00") ✅
- **Event-Specific Pricing**: Events can override global zone prices with custom pricing per zone ✅
- **Database Schema**: `eventCepZonePrices` table for storing custom prices per event and zone ✅
- **Backend API**: Enhanced calculator supporting event-specific pricing with fallback to global prices ✅
- **Admin Interface**: Complete React component for managing custom prices per event ✅
- **Client Integration**: Automatic event-specific price calculation throughout the application ✅
- **Sample Data**: Example configurations demonstrating custom pricing for "Corrida de João Pessoa" ✅

**Pricing Hierarchy:**
1. **Event-Specific Price**: If custom price exists for the event and zone
2. **Global Zone Price**: Fallback to the default zone price
3. **No Service**: If CEP is not in any configured zone

**Documentation:**
- Complete implementation plan: `PERSONALIZACAO_PRECOS_CEP_POR_EVENTO.md`
- Previous plans: `CEP_ZONES_PRICING_SYSTEM.md`, `CEP_ZONES_IMPLEMENTATION_CHECKLIST.md`