# Doktu - Telemedicine Platform

## Overview
Doktu is a professional telemedicine platform connecting patients with certified healthcare providers across Europe. It facilitates secure video consultations, streamlines appointment booking, and manages payment processing. The platform is designed for strict GDPR compliance and high security standards, aiming to be a leading solution for virtual healthcare with comprehensive tools for patients and medical professionals. Its business vision is to capture a significant share of the European telemedicine market, leveraging its robust compliance and user-friendly design.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform utilizes React with TypeScript for the frontend, styled with Tailwind CSS and shadcn/ui components for a modern and responsive user interface. Radix UI primitives are used for accessible components with custom theming. The design emphasizes a clean, intuitive interface with clear navigation and professional color schemes focused on user accessibility and clarity.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite for bundling, TanStack Query for server state management, and Wouter for routing.
- **Backend**: Node.js with Express.js and TypeScript, providing RESTful APIs with robust error handling and logging.
- **Authentication**: Supabase Auth for secure user authentication, including registration, login, password reset, and role-based access control (Patients, Doctors, Admins).
- **Payment Processing**: Stripe integration for secure payment processing, supporting payment intents and subscriptions with focus on the European market (EUR currency) and PCI DSS compliance.
- **Database**: PostgreSQL with Neon serverless, managed via Drizzle ORM and Drizzle Kit for type-safe operations and schema migrations.
- **GDPR Compliance**: Comprehensive GDPR Article 9 compliance for health data processing, including legal documentation, user consent management, and data processing records. This encompasses Privacy Policy, Terms of Service, GDPR Compliance Statement, Medical Disclaimer, and a granular consent management system for health data, marketing, and cookies.
- **Core Features**:
    - **Doctor Management**: Comprehensive doctor profiles, real-time availability with time slot locking, and professional verification (e.g., RPPS).
    - **Appointment System**: Real-time slot reservation, integrated Stripe payments, and full appointment lifecycle management including rescheduling, cancellation, and UTC-to-local timezone conversion for slot availability.
    - **Video Consultations**: Zoom-integrated video consultations with time-based access controls, equipment testing, and post-consultation surveys.
    - **Administrative Dashboard**: Analytics, user management, appointment oversight, revenue tracking, and real-time monitoring of live consultations and planned appointments.
    - **Security**: Comprehensive security measures including endpoint protection, server-side price validation, XSS protection (DOMPurify), rate limiting, security headers (Helmet), generic error messages, CSRF protection, JWT authentication, SQL injection prevention (Drizzle ORM), secure session management, bcrypt password hashing, and security audit logging. A Data Security Center manages AES-256-GCM encryption, role-based access control, real-time audit logging, encryption key rotation, and data breach incident tracking.
    - **Medical Device Regulation (MDR) Compliance**: System for MDR 2017/745 assessment, including MDCG 2019-11 decision tree evaluation, medical device classification, risk assessment, and CE marking determination.
    - **Professional Qualification Verification**: Comprehensive doctor verification system for EU-compliant credential management, including medical qualification tracking, insurance verification, cross-border practice declarations, and EU Professional Card (EPC) management.
    - **Naming System**: Consistent structured name system (title, firstName, lastName) across the platform.
    - **Timezone Management**: Robust timezone handling for accurate appointment display and storage, with proper UTC+2 conversion for European time zones.
    - **Enhanced Email System**: Comprehensive email notification system with ICS calendar file attachments, bulletproof cross-client compatibility, Doktu logo, timezone-aware datetime formatting, accessible plain-text alternatives, and Gmail clipping prevention.
    - **Membership Plan System**: Comprehensive subscription management with two tiers, full Stripe integration for recurring payments, allowance tracking, coverage determination, and billing automation.
    - **Universal Notification System**: Multi-channel notification system (email, SMS, push, in-app) with trigger code mapping, priority-based suppression, timezone-aware scheduling, frequency caps, deduplication, user preference management, and audit logging.
    - **Document Management**: HIPAA/GDPR compliant document storage with encryption at rest/transit, access control lists (ACL), audit logging, and automatic PHI classification.
    - **Patient Onboarding System**: Gentle onboarding banner for patient dashboard encouraging health profile completion with golden/yellow styling, progress indicator showing completion percentage, non-blocking design allowing normal navigation, localStorage-based 24-hour dismissal functionality, and seamless integration with existing health profile management system.

### System Design Choices
The architecture emphasizes a clear separation of concerns between frontend and backend. Data flow is designed for security and efficiency. The system employs secure session management with PostgreSQL storage and adheres to role-based access control. Error handling is comprehensive, and the design prioritizes scalability and maintainability through modular components and well-defined API structures. Medical compliance for document storage includes encryption, access controls, audit trails, and automatic PHI classification.

## External Dependencies

- **Neon Database**: Serverless PostgreSQL hosting.
- **Supabase**: Authentication services.
- **Stripe**: Payment processing and subscription management.
- **Vite**: Frontend bundling.
- **Drizzle Kit**: Database schema management.
- **Tailwind CSS**: CSS framework.
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **Zoom**: Video consultation integration.
- **SendGrid**: Email sending (pending quota upgrade).