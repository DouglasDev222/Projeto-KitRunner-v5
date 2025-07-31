# KitRunner - Event Kit Management System

## Overview
KitRunner is a mobile-first web application designed for managing event kit pickup and delivery orders. It enables customers to browse events, place orders, confirm delivery details, and manage payments. The system aims to streamline event kit logistics, providing a user-friendly experience for participants and efficient management tools for organizers.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (July 31, 2025)
- **Email Template Customization**: Updated all email templates with specific delivery dates (1 day before event), WhatsApp contact integration, order details page redirects, and removed all tracking code references
- **Status Display Updates**: Changed "Retirada Confirmada" to "Retirada em Andamento" 
- **Enhanced Next Steps**: Updated service confirmation emails with improved timeline and emojis
- **Contact Integration**: Added WhatsApp button (83 98130-2961) to all email footers

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
- **Core Features**: Event management, user authentication (with CPF validation for Brazil), profile and address management, dynamic cost calculation (distance-based pricing), kit configuration, multiple payment methods (credit, debit, PIX), order tracking, and simplified ordering for logged-in users.
- **Monorepo Structure**: Shared types and schemas between client and server.
- **Mobile-First Approach**: Tailored for Brazilian mobile commerce patterns.
- **Session-Based Flow**: Multi-step order process with session storage.
- **Type Safety**: End-to-end TypeScript with shared validation schemas.
- **Brazilian Market Focus**: CPF validation, Portuguese localization, BRL currency.
- **Component Library**: shadcn/ui for consistent, accessible UI components.
- **Authentication**: JWT-based admin authentication, persistent user login with localStorage, role-based access control (RBAC), and ownership validation.
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