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
    - **Appointment System**: Real-time slot reservation, integrated Stripe payments, and full appointment lifecycle management. Video consultation integration is planned.
    - **Administrative Dashboard**: Provides analytics, user management, appointment oversight, and revenue tracking.
    - **Naming System**: Structured name system (title, firstName, lastName) consistently applied across the platform for users.
    - **Timezone Management**: Robust timezone handling ensures accurate display and storage of appointment times across all user interfaces.

### System Design Choices
The architecture emphasizes a clear separation of concerns between frontend and backend. Data flow is designed for security and efficiency, from user registration through authentication and appointment booking. The system employs secure session management with PostgreSQL storage and adheres to role-based access control. Error handling is comprehensive, including global error suppression for a stable user experience. The design prioritizes scalability and maintainability through modular components and well-defined API structures.

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