# Doktu - Telemedicine Platform

## Overview
Doktu is a professional telemedicine platform designed to connect patients with certified healthcare providers across Europe. Its core purpose is to facilitate secure video consultations, streamline appointment booking, and manage payment processing while adhering strictly to GDPR compliance and high security standards. The platform aims to be a leading solution for virtual healthcare, offering a comprehensive suite of tools for both patients and medical professionals.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform utilizes React with TypeScript for the frontend, styled with Tailwind CSS and shadcn/ui components for a modern and responsive user interface. Radix UI primitives are used for accessible components with custom theming. The design emphasizes a clean, intuitive interface with clear navigation, especially seen in the doctor's redesigned horizontal navigation matching the homepage header. Color schemes are professional, focusing on user accessibility and clarity.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite for bundling, TanStack Query for server state management, and Wouter for routing.
- **Backend**: Node.js with Express.js and TypeScript, providing RESTful APIs with robust error handling and logging.
- **Authentication**: Uses Supabase Auth for secure user authentication, including comprehensive registration, login, password reset flows, and role-based access control for Patients, Doctors, and Admins.
- **Payment Processing**: Integrates Stripe for secure payment processing, supporting payment intents and subscription management with a focus on the European market (EUR currency) and PCI DSS compliance.
- **Database**: PostgreSQL with Neon serverless, managed via Drizzle ORM and Drizzle Kit for type-safe operations and schema migrations.
- **Core Features**:
    - **Doctor Management**: Comprehensive doctor profiles, real-time availability management with time slot locking, and verification (e.g., RPPS for France).
    - **Appointment System**: Real-time slot reservation, integrated Stripe payments, and full appointment lifecycle management. **Critical Fix (Aug 2025)**: Resolved slot availability filtering - booked appointments now correctly hide from available slots through proper UTC-to-local timezone conversion. **Enhancement (Aug 2025)**: Added appointment rescheduling and cancellation functionality with audit trails, 60-minute buffer enforcement, maximum 2 reschedules per appointment, and automatic refund eligibility determination. **Video Consultations (Aug 2025)**: Implemented Zoom-integrated video consultations with time-based access controls, equipment testing, doctor late/no-show handling, and post-consultation satisfaction surveys with star ratings and comments. **Patient Calendar (Jan 2025)**: Implemented read-only patient calendar view with modal-only appointment interactions, removed all availability management features (doctor-only), fixed duplicate UI elements and navigation errors. **Doctor Workflow Update (Jan 2025)**: Doctors can only cancel appointments (not reschedule directly) - cancellation automatically invites patients to reschedule.
    - **Administrative Dashboard**: Provides analytics, user management, appointment oversight, and revenue tracking. **Enhanced (Jan 2025)**: Added real-time meetings section displaying live video consultations, planned appointments, and connection issues with automatic refresh. **Data Integrity Fix (Aug 2025)**: Removed all mock/estimated data from admin metrics - acquisition channels now show real data only (no fake "Paid Search" traffic), feedback metrics use actual calculations from reviews and retention data, customer acquisition cost correctly shows 0 when no paid marketing is active.
    - **Video Consultation System (Jan 2025)**: Fully integrated Zoom video consultation platform with Server-to-Server OAuth authentication. Features automatic meeting creation upon payment completion, professional video consultation interface with countdown timers and 10-minute early join window, secure meeting password display, HIPAA compliance messaging, and direct "Join Video Call" buttons in patient dashboard for seamless access to paid appointments. **Status**: Zoom app activated and fully operational as of January 15, 2025.
    - **Naming System**: Structured name system (title, firstName, lastName) consistently applied across the platform for users.
    - **Timezone Management**: Robust timezone handling ensures accurate display and storage of appointment times across all user interfaces. **Enhanced (Aug 2025)**: Fixed critical slot availability matching by implementing proper UTC+2 timezone conversion for European time zones.
    - **Email System with Calendar Integration (Aug 2025)**: Comprehensive email notification system with ICS calendar file attachments for all appointment confirmations. **UI Kit Update (Aug 2025)**: Completely modernized email design framework implementing the Doktu Email UI Kit v2 with pixel-consistent brand alignment to homepage design. Features include dark mode support, accessible color schemes with 4.5:1 contrast ratios, mobile-first responsive design, component-based structure (section titles, key-facts rows, primary CTA buttons, info cards), and email-safe emoji iconography. All templates use system font stacks, preheader text for better inbox previews, and consistent Master Frame pattern for brand uniformity.
    - **Document Management**: HIPAA/GDPR compliant document storage with encryption at rest/transit, access control lists (ACL), audit logging, and automatic PHI classification. Legacy document migration system guides users to re-upload through secure channels.

### System Design Choices
The architecture emphasizes a clear separation of concerns between frontend and backend. Data flow is designed for security and efficiency, from user registration through authentication and appointment booking. The system employs secure session management with PostgreSQL storage and adheres to role-based access control. Error handling is comprehensive, including global error suppression for a stable user experience. The design prioritizes scalability and maintainability through modular components and well-defined API structures.

**Medical Compliance**: All document storage implements HIPAA/GDPR compliance through encrypted object storage with comprehensive access controls. The system automatically classifies medical documents as PHI (Protected Health Information), applies encryption at rest and in transit, logs all access attempts for audit trails, and enforces role-based access permissions. Legacy documents from the pre-compliance era are handled with clear migration paths to ensure no data loss while maintaining security standards.

## External Dependencies

- **Neon Database**: Serverless PostgreSQL hosting.
- **Supabase**: Comprehensive authentication services (replacing previous Replit Auth).
- **Stripe**: Payment processing and subscription management.
- **Vite**: Frontend development server and build tool.
- **Drizzle Kit**: Database schema management and migration tool.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Radix UI**: Accessible component primitives for UI building.
- **Lucide React**: Icon library.
```