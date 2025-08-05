# KitRunner - Event Kit Management System

## Overview
KitRunner is a mobile-first web application for managing event kit pickup and delivery orders. It aims to streamline event kit logistics, providing a user-friendly experience for participants and efficient management tools for organizers. Key capabilities include browsing events, placing orders, confirming delivery details, and managing payments. The project envisions a robust system that simplifies event kit distribution, enhancing convenience for customers and operational efficiency for event organizers.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool.
- **Routing**: Wouter for navigation.
- **State Management**: TanStack React Query for data fetching and caching.
- **UI Components**: Radix UI primitives integrated with shadcn/ui for a consistent and accessible design.
- **Styling**: Tailwind CSS with custom CSS variables for responsive, mobile-first design.
- **Design Principles**: Optimized for mobile devices, touch-friendly, Brazilian Portuguese localization, and Brazilian Real (BRL) currency formatting.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database**: PostgreSQL, managed with Drizzle ORM and provided by Supabase PostgreSQL (serverless).
- **API Style**: RESTful API with JSON responses.

### Key Components & Features
- **Database Schema**: Comprehensive schema including Events, Customers, Orders, and Kits.
- **Core Features**: Event management, user authentication (with CPF validation), profile and address management, dynamic cost calculation (distance-based, fixed, and CEP zones pricing), kit configuration, multiple payment methods (credit, debit, PIX), order tracking, bulk order status management, and simplified ordering for logged-in users.
- **Monorepo Structure**: Shared types and schemas between client and server for end-to-end type safety.
- **Session-Based Flow**: Multi-step order process utilizing session storage.
- **Brazilian Market Focus**: Includes CPF validation, Portuguese localization, and BRL currency.
- **Authentication**: JWT-based admin authentication, persistent user login, role-based access control (RBAC), ownership validation, and streamlined login redirection.
- **PDF Generation**: Professional PDF label generation for order kits.
- **Email Notification System**: Comprehensive system for order confirmations, status updates, and payment reminders with professional, responsive HTML templates, including custom templates with delivery date calculations and WhatsApp contact integration.
- **CEP Zones System**: Complete CRUD operations for postal code zones, with event-specific pricing override capabilities. This allows for custom pricing per zone for each event, with fallbacks to global zone prices.

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
- **Database Provider**: Neon Database serverless driver (used for PostgreSQL connection).
- **Validation**: Zod.
- **Session Management**: Connect-pg-simple.
- **Payment Gateway**: Mercado Pago SDK (mercadopago package).
- **Email Service**: SendGrid.

### Development Dependencies
- **Build Tools**: Vite, esbuild.
- **TypeScript**: Full TypeScript support.
- **Development**: tsx.