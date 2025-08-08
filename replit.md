# KitRunner - Event Kit Management System

## Overview
KitRunner is a mobile-first web application for managing event kit pickup and delivery orders. It aims to streamline event kit logistics, providing a user-friendly experience for participants and efficient management tools for organizers. Key capabilities include browsing events, placing orders, confirming delivery details, and managing payments. The project envisions a robust system that simplifies event kit distribution, enhancing convenience for customers and operational efficiency for event organizers.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Fixes (August 8, 2025)

- **Sistema PIX Completamente Funcional**: Implementado fluxo PIX 100% funcional com suporte completo para pagamentos online e offline
  - **QR Code e Polling**: Sistema gera QR code com 30 minutos de validade, polling de 3 segundos que para automaticamente após aprovação
  - **Pagamentos Online**: Funciona perfeitamente quando cliente permanece na página - redirecionamento imediato após aprovação
  - **Pagamentos Offline**: Sistema agora suporta totalmente cliente copiar código PIX, sair da página, e pagar depois via webhook
  - **Webhook Seguro**: Configurado `MERCADOPAGO_WEBHOOK_SECRET` com validação HMAC-SHA256, verificação de timestamp e rate limiting
  - **Segurança Completa**: Validação de assinatura MercadoPago, proteção contra replay attacks, logs de auditoria completos
  - **Email Automático**: Sistema envia email de confirmação automaticamente quando pagamento PIX é aprovado via webhook
  - **Arquivos Corrigidos**: `server/routes.ts` (webhook), `client/src/pages/payment.tsx`, `client/src/components/payment/pix-payment.tsx`
  - **Status**: ✅ PIX 100% funcional - suporta todos os cenários de pagamento (online/offline) com segurança completa

## Recent Fixes (August 8, 2025)

- **Correção Completa de Fuso Horário em Datas de Eventos**: Resolvido problema onde datas dos eventos apareciam com 1 dia a menos no frontend E problema de filtro de eventos próximos
  - **Problema Principal**: Sistema convertia datas para UTC (`T00:00:00.000Z`) causando deslocamento de -3 horas (fuso brasileiro), resultando em data anterior
  - **Problema Secundário**: Filtro de eventos próximos comparava data completa (com horas) vs meia-noite, fazendo eventos de hoje desaparecerem da listagem
  - **Solução Frontend**: Função `formatDate()` em `brazilian-formatter.ts` agora faz parse correto em timezone brasileiro
  - **Solução Filtros**: Corrigida lógica de comparação nas páginas `/eventos` e landing page para comparar apenas datas (sem horas)
  - **Páginas Corrigidas**: `/events/{id}`, `/eventos`, landing page (`/`), painel admin `/admin/events`
  - **Filtro Aprimorado**: Eventos de hoje e amanhã agora aparecem corretamente na lista de próximos eventos
  - **Problema Identificado**: Sistema convertia datas para UTC (`T00:00:00.000Z`) causando deslocamento de -3 horas (fuso brasileiro), resultando em data anterior
  - **Solução Implementada**: Criada função `parseLocalDate()` que usa timezone brasileiro (`T00:00:00-03:00`) na edição de eventos
  - **Formatação Consistente**: Implementada função `formatEventDate()` para garantir formato correto de data em todos os endpoints de eventos
  - **Endpoints Corrigidos**: `/api/events`, `/api/events/:id`, `/api/admin/events`, `/api/admin/events/:id`, criação e edição de eventos
  - **Validação**: Teste confirma datas retornando corretamente como `"2025-02-15"` ao invés de dia anterior
  - **Status**: ✅ Problema de fuso horário completamente resolvido

## Recent Fixes (August 7, 2025)

- **Vulnerabilidade de Precificação CEP Corrigida**: Implementada correção completa da vulnerabilidade crítica na tela de confirmação de endereço
  - **Problema Identificado**: Sistema permitia avanço sem validação correta da precificação por zona CEP, permitindo pedidos com valores incorretos
  - **Race Conditions Eliminadas**: Corrigido useEffect assíncrono e estado de carregamento não sincronizado no handleConfirmAddress  
  - **Validação Frontend**: Implementado sistema obrigatório de validação com estados `pricingValidationStatus` e verificação explícita no botão
  - **Validação Backend**: Adicionada validação de segurança na criação de pedidos que bloqueia pedidos com precificação CEP inválida
  - **Estados Visuais**: Indicadores de carregamento aprimorados e mensagens claras para o usuário durante validação
  - **Logs de Auditoria**: Sistema completo de logs para monitoramento e debugging de tentativas de bypass
  - **Fallback Controlado**: Eventos CEP zones nunca fazem fallback silencioso para outros tipos de precificação
  - **Arquivos Modificados**: `client/src/pages/address-confirmation.tsx`, `server/routes.ts`, `server/cep-zones-calculator.ts`
  - **Status**: ✅ Vulnerabilidade completamente resolvida com medidas preventivas ativas

## Recent Fixes (August 7, 2025)
- **Comprehensive Reactivity System**: Implemented complete real-time data updates across client interfaces
  - **Profile Page Reactivity**: Created GET endpoint `/api/customers/:id` for fetching fresh user data from server
  - **Admin Changes Detection**: Profile page automatically detects and applies changes made by administrators
  - **Orders Page Reactivity**: Added real-time status change detection in `/my-orders` page  
  - **Status Notifications**: Users receive automatic notifications when order status is updated by admin
  - **Admin Panel Reactivity**: Implemented comprehensive reactivity in `/admin/customers` page for real-time updates
  - **Admin Customer Management**: Create, edit, delete operations automatically refresh the customer list without manual refresh
  - **Cache Management**: Comprehensive React Query cache invalidation following reactividade solution pattern
  - **User Context Updates**: Authentication context automatically refreshes when user data changes

- **Customer Profile Editing System**: Successfully implemented comprehensive profile editing with security restrictions
  - **Backend Implementation**: Added PUT endpoint `/api/customers/:id` with restricted field access (customers cannot edit CPF or ID)
  - **Frontend Profile Edit**: Created dedicated `/profile/edit` page with form validation and authentication
  - **Security Measures**: CPF field displayed as read-only, ownership validation prevents cross-customer editing
  - **Profile Management**: Added edit button to profile page, proper navigation and error handling

- **Address Limit System**: Implemented 2-address maximum per customer across all interfaces
  - **Backend Validation**: Address creation endpoints validate maximum 2 addresses with appropriate error responses
  - **Frontend Restrictions**: Hide/disable "Add Address" buttons when limit reached
  - **Address Deletion**: Added delete functionality with safety checks (cannot delete last address)
  - **Multi-screen Coverage**: Applied limits in profile page, event address selection, and new address creation
  - **User Experience**: Clear messaging when limits reached, smooth deletion workflow

- **Authentication Fixes**: Resolved JWT token transmission issues in profile editing requests
  - **Token Management**: Added proper Authorization headers to profile update and address deletion requests
  - **Error Handling**: Improved authentication error messages and user feedback

- **Replit Migration Completed (August 8, 2025)**: Successfully migrated project from Replit Agent to standard Replit environment
  - **Database Configuration**: Configured Supabase PostgreSQL connection via DATABASE_URL environment variable
  - **Payment Integration**: Configured MercadoPago with ACCESS_TOKEN, PUBLIC_KEY, and WEBHOOK_SECRET
  - **Email Service**: Configured SendGrid API for email notifications
  - **Development Environment**: Added SKIP_WEBHOOK_VALIDATION for development webhook testing
  - **Dependencies**: All packages installed and configured correctly for Replit environment (tsx runtime fixed)
  - **Workflow Setup**: Application running on port 5000 with proper Vite development setup
  - **System Services**: CEP Zones router and Payment Reminder Scheduler initialized successfully
  - **API Verification**: All endpoints tested and responding correctly
  - **Status**: ✅ Project fully functional and ready for development

## Previous Fixes (August 5, 2025)
- **Coupon Date Timezone Fix**: Resolved coupon date handling issue where dates were being shifted by 1 day due to UTC/local timezone conversion
  - **Problem**: JavaScript `new Date('2025-01-15')` interprets as UTC midnight, converting to 21h previous day in Brazilian timezone (UTC-3)
  - **Solution**: Added `parseLocalDate()` utility function that explicitly sets Brazilian timezone (-03:00) for coupon validity dates
  - **Implementation**: Updated both coupon creation and update routes to use local timezone conversion
  - **Files Modified**: `server/routes/coupons.ts` with utility function and corrected date parsing

- **Terms and Policies System Implementation**: Successfully implemented comprehensive backend system for managing terms and policies with user acceptance tracking
  - **Database**: Added `policy_documents` and `policy_acceptances` tables with proper relationships and migration completed
  - **Backend Service**: Created `PolicyService` class with full CRUD operations and acceptance tracking logic
  - **API Routes**: Implemented complete REST API with public endpoints for policy retrieval/acceptance and admin endpoints for management
  - **Validation**: Added Zod schemas for policy document creation/update and acceptance tracking
  - **Updated Content**: Integrated actual "Termos e Condições Gerais de Uso da KITRUNNER" from Politicas.md into both registration and order policies
  - **Policy Structure**: General terms appear in both registration and order processes, with order-specific conditions added for payment flow
  - **Frontend Integration**: Fixed policy modal display issues and improved UI design with organized hyperlinks
  - **Files Created**: `server/policy-service.ts`, `server/routes/policies.ts` with full API implementation
  - **Testing**: All endpoints tested and confirmed working (policy retrieval, acceptance recording, duplicate prevention)

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