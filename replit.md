# Doktu - Telemedicine Platform

## Overview

Doktu is a professional telemedicine platform that connects patients with certified healthcare providers across Europe. The platform provides secure video consultations, appointment booking, payment processing, and administrative tools while maintaining GDPR compliance and high security standards.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom theming

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: OpenID Connect (OIDC) with Replit Auth integration
- **Session Management**: Express sessions with PostgreSQL storage
- **API Structure**: RESTful endpoints with proper error handling and logging

### Database Layer
- **Primary Database**: PostgreSQL with Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Connection**: Connection pooling with @neondatabase/serverless

## Key Components

### Authentication System
- **Provider**: Replit OIDC for secure authentication
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **User Roles**: Patient, Doctor, and Admin with role-based access control
- **Security**: HTTPS-only cookies, CSRF protection, and secure session management

### Payment Integration
- **Provider**: Stripe for secure payment processing
- **Features**: Payment intents, subscription management, and European compliance
- **Currency**: EUR for European market focus
- **Security**: PCI DSS compliant payment flows

### Doctor Management
- **Profiles**: Comprehensive doctor profiles with specialty, education, and experience
- **Availability**: Time slot management with locking mechanism to prevent double bookings
- **Online Status**: Real-time availability tracking
- **Verification**: RPPS number validation for French healthcare providers

### Appointment System
- **Booking**: Real-time slot reservation with temporary locking
- **Payment**: Integrated Stripe payment processing
- **Status Tracking**: Complete appointment lifecycle management
- **Video Integration**: Ready for video consultation implementation

### Administrative Dashboard
- **Analytics**: KPI tracking and performance metrics
- **User Management**: Patient and doctor administration
- **Appointment Oversight**: System-wide appointment monitoring
- **Revenue Tracking**: Financial analytics and reporting

## Data Flow

### User Registration and Authentication
1. User initiates login through Replit OIDC
2. System validates credentials and creates/updates user profile
3. Session established with PostgreSQL storage
4. Role-based routing to appropriate dashboard

### Appointment Booking Process
1. Patient browses available doctors and time slots
2. Slot selection triggers temporary lock mechanism
3. Payment intent created with Stripe
4. Successful payment confirms appointment and releases lock
5. Email notifications sent to both parties

### Doctor Availability Management
1. Doctor sets available time slots through calendar interface
2. Slots stored with availability status and locking mechanism
3. Real-time updates prevent double bookings
4. Expired locks automatically released

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: OIDC authentication provider
- **Stripe**: Payment processing and subscription management

### Development Tools
- **Vite**: Development server and build tool
- **Drizzle Kit**: Database migration management
- **TypeScript**: Type safety and development experience

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Database**: Neon development instance
- **Environment Variables**: Local .env configuration

### Production Build
- **Frontend**: Vite build to static assets
- **Backend**: esbuild compilation to single bundle
- **Database**: Drizzle migrations applied automatically
- **Assets**: Static file serving through Express

### Environment Configuration
- **Database**: CONNECTION_STRING for PostgreSQL
- **Authentication**: OIDC configuration for Replit
- **Payments**: Stripe API keys for payment processing
- **Sessions**: SECRET for session encryption

## Changelog
```
Changelog:
- June 30, 2025: Initial setup
- June 30, 2025: Implemented Hand-Picked Medical Team DoctorsGrid on public Home page
- June 30, 2025: Fixed DoctorsGrid API endpoints for proper JOIN query data handling
- June 30, 2025: Fixed missing Alert icon import in DoctorProfile component
- June 30, 2025: Completely rebuilt AvailabilityCalendar with CSS Grid layout and sticky positioning
- June 30, 2025: Added horizontal scroll navigation and mobile-responsive design to calendar
- June 30, 2025: Implemented Playwright e2e tests for calendar functionality verification
- June 30, 2025: Unified data structure between DoctorsGrid and DoctorProfile with standardized API format
- June 30, 2025: Fixed null reference errors in DoctorProfile with comprehensive optional chaining
- June 30, 2025: Implemented database-driven availability data with proper timestamp formatting
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```