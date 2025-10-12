# Product Requirements Document (PRD): Admin Doctor Management Enhancement

**Date:** 2025-10-12
**Status:** Draft
**Owner:** Admin Dashboard Team
**Stakeholders:** Platform Administrators, System Operators

---

## 1. Introduction/Overview

The Doktu telemedicine platform currently has basic doctor account creation capabilities through the admin dashboard. However, administrators lack comprehensive tools to effectively manage doctor profiles, view availability schedules, monitor meetings, and make modifications to existing doctor records.

This PRD defines enhancements to the Admin Dashboard's Doctor Management section to provide full CRUD (Create, Read, Update, Delete) operations for doctor profiles, including detailed views of doctor availability, appointment history, and meeting management.

### Problem Statement
Currently, administrators can:
- ✅ Create new doctor accounts
- ✅ View basic doctor list

However, administrators cannot:
- ❌ View comprehensive doctor profiles with all details
- ❌ Edit existing doctor profiles (name, specialization, fees, bio, etc.)
- ❌ View and manage doctor availability schedules
- ❌ See doctor-specific meetings and appointments
- ❌ Deactivate or reactivate doctor accounts
- ❌ View doctor performance metrics at an individual level

This limitation forces administrators to rely on SQL queries or direct database access for routine management tasks, creating operational inefficiency and security risks.

---

## 2. Goals

### Primary Goals
1. **Enable full CRUD operations** for doctor profiles through the admin dashboard UI
2. **Provide visibility** into each doctor's availability schedule, appointments, and meetings
3. **Improve operational efficiency** by allowing admins to manage doctors without database access
4. **Enhance data quality** through structured editing interfaces with validation

### Secondary Goals
1. Improve admin user experience with intuitive UI/UX
2. Maintain audit trail of all administrative changes to doctor records
3. Provide search and filtering capabilities for large doctor rosters
4. Enable bulk operations for efficiency (future enhancement)

### Success Metrics
- **Operational Efficiency:** Reduce time spent on doctor profile management by 70%
- **Adoption:** 100% of doctor profile changes made through the dashboard (vs database)
- **User Satisfaction:** Admin users rate the doctor management interface 4+/5
- **Data Quality:** Zero manual database edits required for doctor management

---

## 3. User Stories

### US-1: View All Doctors
**As an** administrator
**I want to** see a comprehensive list of all doctors with key information
**So that** I can quickly understand who is in the system and their status

**Acceptance Criteria:**
- Display table/grid showing: Name, Specialization, Status, Total Appointments, Rating, Join Date
- Support sorting by any column
- Support search by name, email, or specialization
- Show online/offline status indicator
- Display 20 doctors per page with pagination

### US-2: View Individual Doctor Profile
**As an** administrator
**I want to** view complete profile details for a specific doctor
**So that** I can understand their full information and activity

**Acceptance Criteria:**
- Display all profile fields: personal info, credentials, pricing, languages, bio
- Show performance metrics: total appointments, completion rate, average rating, revenue
- Display upcoming and past meetings
- Show availability schedule
- Include action buttons: Edit Profile, Manage Availability, View Meetings

### US-3: Edit Doctor Profile
**As an** administrator
**I want to** modify existing doctor information
**So that** I can keep profiles accurate and up-to-date

**Acceptance Criteria:**
- Provide editable form with all profile fields
- Validate all inputs (email format, license number, fees > 0, etc.)
- Show confirmation dialog before saving changes
- Log all changes with timestamp and admin user
- Display success/error messages
- Cannot change doctor's email (security constraint)
- Cannot edit if doctor has meetings scheduled in next 24 hours (prevent disruption)

### US-4: View and Manage Doctor Availability
**As an** administrator
**I want to** see and modify a doctor's availability schedule
**So that** I can help doctors manage their calendar or fix scheduling issues

**Acceptance Criteria:**
- Display current availability schedule in calendar format
- Show available time slots in green, booked slots in red, blocked slots in gray
- Allow adding new availability windows (date, time range)
- Allow removing availability slots (with warning if already booked)
- Display appointments associated with each time slot
- Prevent deletion of slots with confirmed appointments
- Support recurring availability patterns (e.g., "every Monday 9am-5pm")

### US-5: View Doctor Meetings and Appointments
**As an** administrator
**I want to** see all meetings and appointments for a specific doctor
**So that** I can monitor their activity and assist with issues

**Acceptance Criteria:**
- Display filterable list: Upcoming, Past, Cancelled
- Show: Patient name, Date/Time, Status, Duration, Payment status
- Support date range filtering
- Allow clicking appointment to see full details
- Show meeting link for live appointments
- Display no-show and cancellation rates

### US-6: Deactivate/Reactivate Doctor Account
**As an** administrator
**I want to** deactivate or reactivate doctor accounts
**So that** I can manage doctors who are on leave or no longer active

**Acceptance Criteria:**
- Provide "Deactivate" button on active doctor profiles
- Show confirmation dialog with impact warning (upcoming appointments)
- Deactivated doctors: hidden from patient search, cannot accept new bookings
- Existing appointments remain intact
- Provide "Reactivate" button for deactivated accounts
- Log all status changes with reason

### US-7: Search and Filter Doctors
**As an** administrator
**I want to** search and filter the doctor list
**So that** I can quickly find specific doctors or groups of doctors

**Acceptance Criteria:**
- Full-text search across: name, email, specialization
- Filter by: Status (active/inactive), Specialization, Rating range, Join date range
- Filter by availability (has availability this week, no availability)
- Combine multiple filters
- Clear all filters button
- Show result count

### US-8: Create Doctor with Full Profile
**As an** administrator
**I want to** create new doctor accounts with complete profile information
**So that** doctors can start accepting appointments immediately

**Acceptance Criteria:**
- ✅ Already implemented (existing feature)
- Enhancement: Add profile picture upload
- Enhancement: Add initial availability settings during creation
- Enhancement: Send welcome email automatically

---

## 4. Functional Requirements

### FR-1: Doctor List View
**Must have:**
- Table displaying all doctors with columns: Photo, Name, Specialization, Status, Appointments, Rating, Actions
- Pagination (20 per page)
- Sort by any column
- Search bar (name, email, specialization)
- Filter dropdown: All / Active / Inactive / Pending Verification
- Quick action buttons: View, Edit, Manage Schedule

**Should have:**
- Export to CSV
- Column visibility toggle
- Responsive design (mobile-friendly)

### FR-2: Doctor Detail View (Modal or Page)
**Must have:**
- Profile section: Photo, Name, Title, Specialization, Email, Phone, License, Bio
- Credentials: Years of experience, Languages, Certification status
- Pricing: Consultation fee, Currency
- Statistics: Total appointments, Completed, Cancelled, No-shows, Average rating
- Recent activity: Last 5 appointments
- Action buttons: Edit Profile, Manage Availability, View All Meetings, Deactivate

**Should have:**
- Revenue chart (last 30 days)
- Patient satisfaction trend
- Most common diagnoses/conditions

### FR-3: Edit Doctor Profile Form
**Must have:**
- Editable fields: First Name, Last Name, Title, Specialization, Bio, License Number, Years of Experience, Consultation Fee, Languages
- Read-only fields: Email, Join Date, Account Status
- Validation: Required fields, email format, positive numbers for fees
- Cancel and Save buttons
- Confirmation dialog: "Are you sure you want to save changes?"
- Success message: "Doctor profile updated successfully"
- Error handling with specific messages

**Should have:**
- Profile photo upload/change
- Preview mode before saving
- Undo last change

### FR-4: Availability Management Interface
**Must have:**
- Weekly calendar view showing availability slots
- Color coding: Available (green), Booked (red), Blocked (gray), Past (light gray)
- Add availability: Date, Start time, End time, Repeat pattern (once, weekly, custom)
- Delete availability with confirmation
- Validation: No overlapping slots, Cannot delete booked slots
- Display patient name for booked slots (hover tooltip)
- Save and Cancel buttons

**Should have:**
- Monthly view toggle
- Copy availability from previous week
- Bulk operations: "Add availability for next 4 weeks"
- Export to iCal format

### FR-5: Doctor Meetings View
**Must have:**
- Tabs: Upcoming (default), Past, All, Cancelled
- Table: Date/Time, Patient Name, Status, Duration, Payment Status, Actions
- Date range picker
- Filter by status
- Click row to expand details: Meeting link, Notes, Payment info
- "Join Meeting" button for live appointments
- Pagination

**Should have:**
- Download appointment report (PDF)
- Send reminder to patient (manual trigger)
- Reschedule appointment (admin override)

### FR-6: Account Status Management
**Must have:**
- Status badge on profile: Active (green), Inactive (gray), Pending (yellow)
- "Deactivate Account" button (only visible for active doctors)
- Confirmation dialog: "Deactivate Dr. Smith? This will prevent new bookings. X upcoming appointments will not be affected."
- Reason dropdown: On leave, Suspended, Left platform, Other
- Optional notes field
- "Reactivate Account" button for inactive doctors
- Audit log entry created automatically

### FR-7: Search and Filtering
**Must have:**
- Global search bar with instant results
- Filter panel with: Status checkboxes, Specialization dropdown, Rating slider (1-5), Join date range
- "Apply Filters" and "Clear Filters" buttons
- Result count display: "Showing 15 of 47 doctors"
- Filters persist across page refreshes (session storage)

---

## 5. Non-Goals (Out of Scope)

To maintain focus, the following features will **NOT** be included in this release:

1. **Direct messaging to doctors** - This is a separate communication feature
2. **Doctor performance reviews/ratings by admins** - Ratings come only from patients
3. **Financial payout management** - This is handled by a separate billing system
4. **Credential verification workflow** - Assume all doctors are pre-verified
5. **Video call quality monitoring** - This is a separate infrastructure concern
6. **Doctor-side dashboard improvements** - This PRD focuses on admin tools only
7. **Patient management** - Separate feature, not part of doctor management
8. **Bulk import of doctors via CSV** - Future enhancement
9. **Custom roles and permissions for sub-admins** - All admins have full access
10. **Integration with external credentialing services** - Not needed for MVP

---

## 6. Design Considerations

### UI/UX Guidelines
1. **Consistency:** Use existing ShadCN UI components (Card, Table, Button, Form, Dialog)
2. **Accessibility:** WCAG 2.1 AA compliant, keyboard navigation, screen reader support
3. **Responsive:** Mobile-first design, touch-friendly targets (min 44x44px)
4. **Performance:** Lazy load doctor images, virtualize large lists (>100 doctors)
5. **Feedback:** Loading states, success/error toasts, disabled buttons during async ops

### Layout Recommendations
- **Doctor List:** Table layout for desktop, card layout for mobile
- **Doctor Detail:** Modal overlay (desktop) or full-page (mobile)
- **Edit Form:** Side panel drawer (desktop) or full-page (mobile)
- **Availability Calendar:** Full-width component with week/month toggle

### Visual Design
- Use green color for "active" and positive actions
- Use red color for "inactive" and destructive actions
- Use blue color for informational elements
- Include doctor profile photos (fallback to initials avatar)
- Use badges for status indicators

### Component Breakdown
```
AdminDashboard
└── DoctorsSection (enhanced)
    ├── DoctorListView (NEW)
    │   ├── SearchBar
    │   ├── FilterPanel
    │   └── DoctorTable
    │       └── DoctorRow (with Actions)
    ├── DoctorDetailModal (NEW)
    │   ├── ProfileSection
    │   ├── StatisticsSection
    │   ├── RecentActivitySection
    │   └── ActionButtons
    ├── DoctorEditForm (NEW)
    │   ├── ProfileFields
    │   ├── CredentialFields
    │   ├── PricingFields
    │   └── SaveCancelButtons
    ├── AvailabilityManager (NEW)
    │   ├── CalendarView
    │   ├── AddAvailabilityDialog
    │   └── SlotsList
    ├── DoctorMeetingsView (NEW)
    │   ├── TabNavigation
    │   ├── DateRangePicker
    │   └── MeetingsTable
    └── DoctorCreateForm (existing, minor enhancements)
```

---

## 7. Technical Considerations

### Backend API Endpoints Required

**Existing (already implemented):**
- `GET /api/admin/doctors` - List all doctors
- `POST /api/admin/create-doctor` - Create new doctor

**New endpoints needed:**
```typescript
// Doctor Profile Management
GET    /api/admin/doctors/:id                  // Get single doctor details
PUT    /api/admin/doctors/:id                  // Update doctor profile
PATCH  /api/admin/doctors/:id/status           // Change status (activate/deactivate)
DELETE /api/admin/doctors/:id                  // Soft delete (optional)

// Availability Management
GET    /api/admin/doctors/:id/availability     // Get availability schedule
POST   /api/admin/doctors/:id/availability     // Add availability slots
DELETE /api/admin/doctors/:id/availability/:slotId  // Remove slot

// Meetings & Appointments
GET    /api/admin/doctors/:id/meetings         // Get doctor's meetings
GET    /api/admin/doctors/:id/appointments     // Get doctor's appointments
GET    /api/admin/doctors/:id/stats            // Get performance statistics
```

### Data Models

**Doctor Profile (existing, reference):**
```typescript
interface Doctor {
  id: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  title: string;
  specialization: string;
  bio: string;
  licenseNumber: string;
  yearsOfExperience: number;
  consultationFee: number;
  languages: string[];
  profilePictureUrl?: string;
  rating: number;
  reviewCount: number;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}
```

**Doctor Statistics (new):**
```typescript
interface DoctorStats {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShows: number;
  completionRate: number;
  averageRating: number;
  totalRevenue: number;
  availableSlotsCount: number;
  upcomingMeetingsCount: number;
}
```

### Database Considerations
- Add `status` column to `doctors` table if not exists (enum: active, inactive, pending)
- Add `deactivatedAt`, `deactivationReason` columns for audit trail
- Ensure proper indexes on: `userId`, `status`, `specialization`, `createdAt`
- Add audit log table for tracking admin changes: `doctor_audit_log`

### Security & Authorization
- All endpoints require authentication: `isAuthenticated` middleware
- All endpoints require admin role: check `user.role === 'admin'`
- Audit logging: Log all UPDATE/DELETE operations with admin user ID
- Rate limiting: Apply stricter limits to modification endpoints
- Data sanitization: Validate and sanitize all user inputs

### Performance Considerations
- Cache doctor list for 5 minutes (invalidate on update)
- Use pagination for all list views (default 20 items)
- Lazy load doctor profile pictures
- Use database indexes for frequently queried fields
- Consider Redis caching for hot data (top 10 doctors)

### Integration Points
- **Storage Layer:** Uses existing `storage.ts` methods, may need to add new methods
- **Supabase Auth:** No changes needed, uses existing auth flow
- **Notification Service:** Send email when doctor profile is updated
- **Audit Middleware:** Use existing `auditAdminMiddleware` for logging

---

## 8. Success Metrics

### Quantitative Metrics
| Metric | Current | Target | Measurement Method |
|--------|---------|--------|-------------------|
| Time to update doctor profile | ~5 min (SQL) | <1 min (UI) | User surveys + time tracking |
| Admin satisfaction score | N/A | 4.5/5 | Post-implementation survey |
| Doctor profile completeness | 70% | 95% | Database audit |
| Manual database queries for doctors | ~10/week | 0/week | Query logs |
| Doctor onboarding time | 15 min | 10 min | Process timing |

### Qualitative Metrics
- **Admin Confidence:** Admins feel confident managing doctors without dev support
- **Data Quality:** Fewer errors in doctor profiles due to validation
- **Operational Efficiency:** Reduced support tickets related to doctor management
- **Platform Professionalism:** Admins perceive the platform as more professional

### Usage Metrics (Analytics)
- Doctor list page views (track daily)
- Doctor profile views (track per doctor)
- Profile edits performed (track count and type)
- Search queries executed (track terms)
- Filter usage (track which filters are popular)

---

## 9. Open Questions

1. **Photo Upload:** Should admin be able to upload/change doctor profile photos?
   - **Proposed Answer:** Yes, but also allow doctors to do it themselves. Admin can override.

2. **Bulk Operations:** Is bulk editing (e.g., "change fee for all pediatricians") needed?
   - **Proposed Answer:** Not for MVP, but design UI to support it in future.

3. **Notification:** Should doctors be notified when admin edits their profile?
   - **Proposed Answer:** Yes, send email notification with summary of changes.

4. **Approval Workflow:** Should profile changes require approval?
   - **Proposed Answer:** No, admins have full authority. Log changes for audit.

5. **Deletion:** Should admins be able to permanently delete doctors?
   - **Proposed Answer:** Soft delete only (set status to deleted), keep data for records.

6. **Availability Conflicts:** How to handle when admin adds availability that conflicts with existing?
   - **Proposed Answer:** Show error message, prevent save until conflict is resolved.

7. **Doctor Permissions:** Can doctors override admin changes to their profile?
   - **Proposed Answer:** Yes, but log it. Admins can see change history.

8. **Multi-language Support:** Should doctor bios support multiple languages?
   - **Proposed Answer:** Not in MVP. English only for now.

9. **Export Functionality:** Should admins be able to export doctor data to CSV/PDF?
   - **Proposed Answer:** Yes, add "Export to CSV" button on doctor list page.

10. **Timezone Handling:** How to handle availability across different timezones?
    - **Proposed Answer:** Store in UTC, display in admin's local timezone, clearly label.

---

## 10. Edge Cases

### EC-1: Editing Doctor with Active Meeting
**Scenario:** Admin tries to edit profile while doctor is in a live video call
**Expected Behavior:**
- Show warning: "This doctor is currently in a meeting. Changes may affect their session."
- Allow edit but mark non-critical fields only
- Critical fields (fee, availability) require meeting to end

### EC-2: Deactivating Doctor with Upcoming Appointments
**Scenario:** Admin deactivates doctor who has appointments in next 7 days
**Expected Behavior:**
- Show confirmation: "Dr. Smith has 5 upcoming appointments. Deactivate anyway?"
- List affected appointments with dates
- Require admin to choose action: Cancel appointments, Reassign to other doctor, or Keep appointments
- Send notification to affected patients

### EC-3: Deleting Availability Slot with Booking
**Scenario:** Admin tries to remove availability slot that has confirmed booking
**Expected Behavior:**
- Block deletion with error: "Cannot delete. Slot is booked by [Patient Name] at [Time]."
- Suggest: "Cancel appointment first, then delete slot."
- Provide "Cancel Appointment" button for convenience

### EC-4: Duplicate Email During Creation
**Scenario:** Admin creates doctor with email that already exists
**Expected Behavior:**
- Show error: "Email already in use by [Dr. John Doe, ID: 123]."
- Suggest: "Use a different email or edit the existing profile."
- Provide link to existing profile

### EC-5: Concurrent Edits by Multiple Admins
**Scenario:** Two admins edit the same doctor profile simultaneously
**Expected Behavior:**
- Last write wins (simple approach)
- Show toast: "Profile was updated by [Admin Name] while you were editing. Your changes have been saved."
- Future: Implement optimistic locking with version numbers

### EC-6: No Availability Set
**Scenario:** Doctor profile exists but has zero availability slots
**Expected Behavior:**
- Show warning badge on profile: "No availability"
- Display prominent button: "Add Availability"
- In doctor list, show icon indicating "No slots available"

### EC-7: Extremely Long Bio (>5000 characters)
**Scenario:** Admin enters very long text in bio field
**Expected Behavior:**
- Limit input to 2000 characters with character counter
- Show warning at 1800 characters: "Approaching limit"
- Truncate gracefully with "Read more" on patient-facing view

### EC-8: Invalid License Number Format
**Scenario:** Admin enters invalid license number
**Expected Behavior:**
- Client-side validation: Warn if format looks wrong (country-specific)
- Server-side: Accept any string, log for manual review
- Future: Integrate with medical board API for validation

### EC-9: Setting Negative or Zero Consultation Fee
**Scenario:** Admin sets fee to 0 or negative
**Expected Behavior:**
- Validation error: "Fee must be greater than 0"
- Allow if admin explicitly checks "This doctor offers free consultations"
- Log unusual values for review

### EC-10: Doctor Account Has No Associated User
**Scenario:** Doctor record exists but userId points to deleted/non-existent user
**Expected Behavior:**
- Flag as "Orphaned Account" in admin list
- Disable most actions (cannot login, cannot book)
- Provide "Re-link to User" or "Permanently Delete" options

---

## 11. Implementation Plan

### Phase 1: Foundation (Week 1)
- **Backend:** Create new API endpoints for GET/PUT doctor profile
- **Backend:** Add doctor statistics endpoint
- **Database:** Add status, deactivation columns if missing
- **Frontend:** Build enhanced Doctor List View with search/filter
- **Frontend:** Implement Doctor Detail Modal (read-only)

### Phase 2: Core Editing (Week 2)
- **Frontend:** Build Doctor Edit Form with validation
- **Backend:** Implement profile update logic with validation
- **Backend:** Add audit logging for changes
- **Frontend:** Integrate edit form with API
- **Testing:** End-to-end tests for CRUD operations

### Phase 3: Availability Management (Week 3)
- **Backend:** Create availability endpoints (GET/POST/DELETE)
- **Frontend:** Build calendar-based availability manager
- **Frontend:** Add/remove slots UI with validation
- **Backend:** Implement conflict detection
- **Testing:** Availability management tests

### Phase 4: Meetings & Status (Week 4)
- **Backend:** Create doctor meetings/appointments endpoints
- **Frontend:** Build Doctor Meetings View with tabs
- **Frontend:** Implement status management (activate/deactivate)
- **Backend:** Handle status change side effects
- **Testing:** Full integration testing

### Phase 5: Polish & Deployment (Week 5)
- **UI/UX:** Responsive design testing and fixes
- **Performance:** Optimize queries, add caching
- **Documentation:** Admin user guide
- **Deployment:** Staged rollout to production
- **Monitoring:** Setup analytics tracking

### Development Estimates
| Component | Effort | Developer |
|-----------|--------|-----------|
| Backend APIs | 3 days | Backend dev |
| Database changes | 1 day | Backend dev |
| Frontend components | 5 days | Frontend dev |
| Integration | 2 days | Full-stack dev |
| Testing | 3 days | QA + Devs |
| Documentation | 1 day | Tech writer |
| **Total** | **15 days** | 1-2 devs |

---

## 12. Acceptance Criteria (Overall)

This feature is considered **complete** when:

1. ✅ Admin can view complete list of doctors with search and filtering
2. ✅ Admin can view detailed profile for any doctor including statistics
3. ✅ Admin can edit all editable fields on a doctor profile and save changes
4. ✅ Admin can view a doctor's availability schedule in calendar format
5. ✅ Admin can add and remove availability slots (with validation)
6. ✅ Admin can view all meetings/appointments for a specific doctor
7. ✅ Admin can activate or deactivate doctor accounts with confirmation
8. ✅ All changes are logged in audit trail with admin user and timestamp
9. ✅ All forms have proper validation with user-friendly error messages
10. ✅ UI is responsive and works on mobile, tablet, and desktop
11. ✅ API endpoints have proper authentication and authorization
12. ✅ Documentation is updated with new features and API endpoints
13. ✅ E2E tests cover all CRUD operations and edge cases
14. ✅ Performance: List page loads in <2s, profile page in <1s

---

## 13. Dependencies

### Internal Dependencies
- **Existing Storage Layer:** Must extend methods for new operations
- **Admin Authentication:** Relies on existing auth system
- **Audit Middleware:** Will use existing audit logging infrastructure
- **Doctor Profile Schema:** Must be consistent with existing database structure

### External Dependencies
- None (fully internal feature)

### Blocking Issues
- None identified at this time

---

## 14. Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Performance degradation with >1000 doctors | High | Medium | Implement pagination, virtualization, caching |
| Concurrent edit conflicts | Medium | Low | Implement optimistic locking (future) |
| Accidental data deletion | High | Low | Soft deletes only, add confirmation dialogs |
| UI complexity overwhelming admins | Medium | Medium | User testing, iterative design improvements |
| Availability conflicts causing booking issues | High | Medium | Strict validation, prevent overlapping slots |

---

## 15. Future Enhancements (Post-MVP)

After initial release, consider these enhancements:

1. **Bulk Operations:** Select multiple doctors, apply changes to all
2. **Import/Export:** CSV import for bulk doctor creation, export for reporting
3. **Advanced Analytics:** Revenue forecasting, performance trends per doctor
4. **Credential Management:** Upload and verify medical licenses, certificates
5. **Notification Preferences:** Admin can configure notification settings per doctor
6. **Custom Fields:** Allow admins to add custom profile fields
7. **Role-Based Permissions:** Different permission levels for sub-admins
8. **Activity Timeline:** Visual timeline of all changes to doctor profile
9. **Integration with Stripe:** View payout history, banking details
10. **AI Recommendations:** Suggest optimal availability based on demand patterns

---

## 16. Appendix

### Glossary
- **CRUD:** Create, Read, Update, Delete
- **Availability Slot:** Time window when doctor is available for appointments
- **Soft Delete:** Mark record as deleted without removing from database
- **Audit Trail:** Log of all changes with who, what, when information

### Related Documents
- Admin Dashboard Overview PRD
- User Management PRD
- Appointment Booking System PRD
- Database Schema Documentation

### Mockups and Wireframes
- [To be added: Link to Figma/design files]

### API Documentation
- [To be added: OpenAPI/Swagger specification]

---

**END OF PRD**

**Next Steps:**
1. Review and approve this PRD with stakeholders
2. Create technical design document
3. Break down into development tasks/tickets
4. Assign to development team
5. Begin Phase 1 implementation
