# KitRunner - Event Kit Management System

## Overview
KitRunner is a mobile-first web application designed for managing event kit pickup and delivery orders. Its primary purpose is to streamline event kit logistics, offering a user-friendly experience for participants and efficient management tools for organizers. The system provides capabilities such as browsing events, placing orders, confirming delivery details, and managing payments. The project's vision is to simplify event kit distribution, thereby enhancing convenience for customers and operational efficiency for event organizers, with ambitions for robust market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite.
- **Routing**: Wouter.
- **State Management**: TanStack React Query for data fetching and caching.
- **UI Components**: Radix UI primitives integrated with shadcn/ui for consistent design.
- **Styling**: Tailwind CSS with custom CSS variables for responsive, mobile-first design.
- **Design Principles**: Optimized for mobile devices, touch-friendly, Brazilian Portuguese localization, and Brazilian Real (BRL) currency formatting.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database**: PostgreSQL, managed with Drizzle ORM via Supabase PostgreSQL.
- **API Style**: RESTful API with JSON responses.

### Key Components & Features
- **Database Schema**: Comprehensive schema covering Events, Customers, Orders, and Kits.
- **Core Features**: Event management, user authentication (with CPF validation), profile and address management, dynamic cost calculation (distance-based, fixed, and CEP zones pricing), kit configuration, multiple payment methods (credit, debit, PIX), order tracking, bulk order status management, and simplified ordering for logged-in users.
- **Monorepo Structure**: Shared types and schemas between client and server for end-to-end type safety.
- **Session-Based Flow**: Multi-step order process utilizing session storage.
- **Brazilian Market Focus**: Includes CPF validation, Portuguese localization, and BRL currency.
- **Authentication**: JWT-based admin authentication, persistent user login, role-based access control (RBAC), ownership validation, and streamlined login redirection.
- **PDF Generation**: Professional PDF label generation for order kits.
- **Email Notification System**: Comprehensive system for order confirmations, status updates, and payment reminders with professional, responsive HTML templates.
- **CEP Zones System**: Complete CRUD operations for postal code zones, with event-specific pricing override capabilities and fallbacks to global zone prices.
- **Terms and Policies System**: Backend system for managing terms and policies with user acceptance tracking, integrated with registration and order processes.
- **Reactivity System**: Real-time data updates across client interfaces, including customer profiles, orders, and admin panels, with comprehensive React Query cache invalidation.

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React, React DOM, React Query.
- **UI Components**: Radix UI primitives, Lucide React icons.
- **Form Management**: React Hook Form with Zod validation.
- **Styling**: Tailwind CSS, Class Variance Authority.
- **Date Handling**: date-fns.

### Backend Dependencies
- **Database**: Drizzle ORM with PostgreSQL dialect.
- **Server**: Express.js.
- **Database Provider**: Neon Database serverless driver (for PostgreSQL connection).
- **Validation**: Zod.
- **Session Management**: Connect-pg-simple.
- **Payment Gateway**: Mercado Pago SDK (mercadopago package).
- **Email Service**: SendGrid.