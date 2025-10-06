# Doktu Platform - Manual QA Testing Checklist

**Platform URL:** https://doktu-tracker.vercel.app/
**Last Updated:** 2025-10-05

---

## 🚨 CRITICAL KNOWN ISSUES TO VERIFY

### 1. SendGrid Email Delivery (CRITICAL)
- [ ] **Test:** Register new user → Check email arrives within 2 minutes
- **Expected:** Welcome email in inbox within 120 seconds
- **Previous Bug:** Emails delayed up to 30 minutes
- **Status:** Fixed - needs verification

### 2. Slot Availability in Reschedule (HIGH)
- [ ] **Test:** Book slot → Logout → Login as different patient → Reschedule existing appointment
- **Expected:** Previously booked slot does NOT appear in available slots
- **Previous Bug:** Booked slots showing as available
- **Status:** Fixed - needs verification

### 3. Membership Allowance Auto-Init (HIGH)
- [ ] **Test:** Subscribe to membership → Check dashboard widget immediately
- **Expected:** Credits appear automatically without manual initialization
- **Previous Bug:** Required clicking "Initialize Allowance" button
- **Status:** Fixed - needs verification

---

## 📋 PATIENT DASHBOARD TESTING

### Authentication & Registration
**Browser:** Chrome ☐ Firefox ☐ Safari ☐ Edge ☐

- [ ] Navigate to https://doktu-tracker.vercel.app/
- [ ] Click "Sign Up" or "Register"
- [ ] Fill form with valid data:
  - First Name: Test
  - Last Name: Patient
  - Email: test-{timestamp}@example.com
  - Password: TestPass123! (min 8 chars, 1 uppercase, 1 number, 1 special)
- [ ] Submit registration
- [ ] **Verify:** Redirects to `/dashboard`
- [ ] **Verify:** User is logged in (see user name in header)
- [ ] **Check Email:** Welcome email arrives within 2 minutes ⏱️

**Edge Cases:**
- [ ] Try weak password → Should show validation error
- [ ] Try duplicate email → Should show "Email already exists"
- [ ] Try empty fields → Should show required field errors
- [ ] Try SQL injection: `'; DROP TABLE users;--` → Should be sanitized

---

### Appointments Tab
**Browser:** Chrome ☐ Firefox ☐ Safari ☐ Edge ☐

#### View Appointments
- [ ] Navigate to Dashboard → Appointments tab
- [ ] **Verify:** Upcoming appointments section visible
- [ ] **Verify:** Completed appointments section visible
- [ ] **Verify:** Empty state shows if no appointments

#### Book New Appointment
- [ ] Click "Book New Appointment" or navigate to `/doctors`
- [ ] **Verify:** List of doctors loads
- [ ] Click "Book Appointment" on first doctor
- [ ] **Verify:** Calendar/time slots load
- [ ] **Verify:** Only future dates are selectable
- [ ] Select an available time slot
- [ ] **Verify:** Slot becomes highlighted/selected
- [ ] Click "Confirm" or "Next"
- [ ] **Verify:** Stripe payment form loads OR membership coverage message appears
- [ ] If payment required:
  - [ ] Enter test card: 4242 4242 4242 4242
  - [ ] Expiry: 12/25
  - [ ] CVC: 123
  - [ ] Click "Pay"
- [ ] **Verify:** Redirects to dashboard with success message
- [ ] **Verify:** Appointment appears in "Upcoming Appointments"
- [ ] **Verify:** Appointment status is "Paid" or "Confirmed"
- [ ] **Verify:** Zoom link appears (if close to appointment time)

**Edge Cases:**
- [ ] Try to book slot in the past → Should be disabled
- [ ] Try to book already-booked slot → Should show error
- [ ] Cancel payment → Should not create appointment
- [ ] Network interruption during payment → Should handle gracefully

#### Join Video Consultation
- [ ] Create appointment for current time (+5 minutes)
- [ ] Wait until 10 minutes before appointment
- [ ] **Verify:** "Join Now" button appears
- [ ] Click "Join Now"
- [ ] **Verify:** Zoom link opens in new tab
- [ ] **Verify:** Meeting ID and password auto-filled or visible

**Timing Tests:**
- [ ] 15 min before → "Join Now" should be disabled
- [ ] 10 min before → "Join Now" should be enabled
- [ ] During appointment → "Join Now" should be enabled
- [ ] 60+ min after → "Join Now" should be disabled

#### Reschedule Appointment
- [ ] Click "Reschedule" on an upcoming appointment
- [ ] **Verify:** Reschedule modal opens
- [ ] **Verify:** Current appointment details shown
- [ ] **Verify:** Available time slots load
- [ ] **CRITICAL:** Verify booked slots do NOT appear
- [ ] Select new time slot
- [ ] Enter reason: "Schedule conflict"
- [ ] Click "Reschedule Appointment"
- [ ] **Verify:** Success message appears
- [ ] **Verify:** Appointment updated with new time
- [ ] **Verify:** Confirmation email sent

**Edge Cases:**
- [ ] Try to reschedule <1 hour before → Should be blocked with message
- [ ] Reschedule same appointment 3 times → Third attempt should be blocked (max 2)
- [ ] Select same slot as current → Should show error

#### Cancel Appointment
- [ ] Click "Cancel" on an upcoming appointment (>1 hour before)
- [ ] **Verify:** Cancel modal opens
- [ ] **Verify:** Warning message about cancellation
- [ ] **Verify:** Refund message shows (if >1 hour before)
- [ ] Enter reason: "No longer needed"
- [ ] Click "Cancel Appointment"
- [ ] **Verify:** Success message appears
- [ ] **Verify:** Appointment status changed to "Cancelled"
- [ ] **Verify:** Refund processed (check Stripe dashboard)
- [ ] **Verify:** Cancellation email sent

**Edge Cases:**
- [ ] Cancel <1 hour before → Should be blocked
- [ ] Cancel already-cancelled appointment → Should show error

#### Post-Consultation Survey
- [ ] Complete a video consultation (or mark as completed via admin)
- [ ] Return to dashboard after consultation
- [ ] **Verify:** Post-consultation survey modal appears
- [ ] Rate consultation: 5 stars
- [ ] Provide feedback: "Great experience!"
- [ ] Submit survey
- [ ] **Verify:** Survey saved successfully
- [ ] **Verify:** Survey doesn't appear again for same appointment

---

### Calendar Tab
**Browser:** Chrome ☐ Firefox ☐ Safari ☐ Edge ☐

- [ ] Click "Calendar" tab
- [ ] **Verify:** Full month calendar displays
- [ ] **Verify:** Current month highlighted
- [ ] **Verify:** Appointments show as indicators on dates
- [ ] Click previous month ←
- [ ] **Verify:** Calendar navigates to previous month
- [ ] Click next month →
- [ ] **Verify:** Calendar navigates to next month
- [ ] Click on date with appointment
- [ ] **Verify:** Appointment details appear
- [ ] **Verify:** Can join/reschedule/cancel from calendar view

**Responsive Tests:**
- [ ] Resize to mobile (375px) → Calendar should stack vertically
- [ ] Resize to tablet (768px) → Calendar should be readable
- [ ] Resize to desktop (1920px) → Calendar should use full width

---

### My Doctors Tab
**Browser:** Chrome ☐ Firefox ☐ Safari ☐ Edge ☐

- [ ] Click "My Doctors" tab
- [ ] **Verify:** List of previously consulted doctors appears
- [ ] **Verify:** Doctor avatars/photos load
- [ ] **Verify:** Doctor specialty displayed
- [ ] **Verify:** Doctor rating displayed
- [ ] Click on doctor name
- [ ] **Verify:** Navigates to doctor profile page
- [ ] **Verify:** "Book Again" button visible
- [ ] Click "Book Again"
- [ ] **Verify:** Booking flow starts for that doctor

**Edge Cases:**
- [ ] New user with no consultations → Should show empty state
- [ ] Doctor with missing photo → Should show placeholder

---

### Settings Tab
**Browser:** Chrome ☐ Firefox ☐ Safari ☐ Edge ☐

#### My Profile
- [ ] Click "Settings" tab → "My Profile"
- [ ] **Verify:** Current profile data loads
- [ ] Edit First Name: "Updated Test"
- [ ] Edit Last Name: "Patient Updated"
- [ ] Edit Phone: "+1234567890"
- [ ] Click "Save"
- [ ] **Verify:** Success toast appears
- [ ] Refresh page
- [ ] **Verify:** Changes persisted

**Validation Tests:**
- [ ] Empty first name → Should show error
- [ ] Invalid phone format → Should show error
- [ ] Very long name (100+ chars) → Should show error or truncate

#### Health Profile
- [ ] Click "Health Profile" sub-tab
- [ ] Fill in medical history
- [ ] Add allergy: "Penicillin"
- [ ] Add medication: "Aspirin 100mg daily"
- [ ] Add insurance info
- [ ] Upload insurance card (PDF or image)
- [ ] Click "Save"
- [ ] **Verify:** Success message
- [ ] **Verify:** Completion percentage updates
- [ ] Refresh page
- [ ] **Verify:** All data persisted

**File Upload Tests:**
- [ ] Upload PDF → Should succeed
- [ ] Upload JPG → Should succeed
- [ ] Upload 15MB file → Should show size error
- [ ] Upload .exe file → Should show format error

#### Payment Methods
- [ ] Click "Payment Methods" sub-tab
- [ ] **Verify:** Stripe payment form loads
- [ ] Add credit card:
  - Card: 4242 4242 4242 4242
  - Expiry: 12/30
  - CVC: 123
- [ ] Click "Add Card"
- [ ] **Verify:** Card appears in list
- [ ] Set as default card
- [ ] **Verify:** "Default" badge appears
- [ ] Remove card
- [ ] **Verify:** Card removed from list

#### Security
- [ ] Click "Security" sub-tab
- [ ] **Change Email:**
  - [ ] Enter new email
  - [ ] Click "Change Email"
  - [ ] **Verify:** Confirmation email sent to NEW address
  - [ ] Check email and click confirmation link
  - [ ] **Verify:** Email updated
- [ ] **Change Password:**
  - [ ] Enter current password
  - [ ] Enter new password: "NewPass456!"
  - [ ] Confirm new password: "NewPass456!"
  - [ ] Click "Change Password"
  - [ ] **Verify:** Success message
  - [ ] Logout and login with new password
  - [ ] **Verify:** Login successful

**Validation Tests:**
- [ ] Wrong current password → Should show error
- [ ] Passwords don't match → Should show error
- [ ] Weak new password → Should show strength error

---

### Sidebar Features
**Browser:** Chrome ☐ Firefox ☐ Safari ☐ Edge ☐

#### Health Profile Completion
- [ ] **Verify:** Sidebar shows completion percentage
- [ ] **Verify:** Percentage is accurate based on filled fields
- [ ] Click "Complete Profile"
- [ ] **Verify:** Opens health profile form
- [ ] Fill one more field
- [ ] **Verify:** Percentage increases

#### Document Library
- [ ] Click "Documents" in sidebar (or icon)
- [ ] **Verify:** Document library panel opens
- [ ] Click "Upload Document"
- [ ] Select medical report PDF
- [ ] **Verify:** Upload progress shows
- [ ] **Verify:** Document appears in list
- [ ] Click document name
- [ ] **Verify:** Document downloads/opens
- [ ] Click delete icon
- [ ] **Verify:** Confirmation dialog appears
- [ ] Confirm delete
- [ ] **Verify:** Document removed

**File Tests:**
- [ ] Upload multiple files at once → Should queue uploads
- [ ] Upload duplicate filename → Should handle conflict
- [ ] Cancel upload mid-way → Should stop upload

#### Membership Widget
- [ ] **Verify:** Widget visible in sidebar or top navigation
- [ ] Click on widget
- [ ] **Verify:** Popover opens showing:
  - [ ] Credits remaining (if member)
  - [ ] Cycle start/end dates
  - [ ] Allowance history
  - [ ] "Manage Plan" button
- [ ] Click "Manage Plan"
- [ ] **Verify:** Navigates to `/membership`

**For Non-Members:**
- [ ] **Verify:** Shows "Get Membership" message
- [ ] Click "Get Membership"
- [ ] **Verify:** Navigates to membership plans

---

### Banner System
**Browser:** Chrome ☐ Firefox ☐ Safari ☐ Edge ☐

#### Payment Pending Banner
- [ ] Create appointment without completing payment
- [ ] Return to dashboard
- [ ] **Verify:** Yellow banner shows "Payment pending"
- [ ] **Verify:** "Complete Payment" button visible
- [ ] Click "Complete Payment"
- [ ] **Verify:** Redirects to Stripe checkout
- [ ] Complete payment
- [ ] **Verify:** Banner disappears

#### Email Verification Banner
- [ ] (If verification is implemented)
- [ ] Register new account
- [ ] **Verify:** Banner shows "Please verify your email"
- [ ] Check email and verify
- [ ] **Verify:** Banner disappears

---

## 👨‍⚕️ DOCTOR DASHBOARD TESTING

**Test Account:** doctor@doktu.co (you'll need to provide this)

### Live Appointments
**Browser:** Chrome ☐ Firefox ☐ Safari ☐ Edge ☐

- [ ] Login as doctor
- [ ] **If appointment is live:**
  - [ ] **Verify:** Green banner appears at top
  - [ ] **Verify:** "Join Call" button visible
  - [ ] **Verify:** Patient name displayed
  - [ ] Click "Join Call"
  - [ ] **Verify:** Zoom opens with correct meeting

### Upcoming Appointments
- [ ] **Verify:** Next 3 appointments shown
- [ ] **Verify:** Patient names visible
- [ ] **Verify:** Appointment times correct
- [ ] **Verify:** Status badges (Paid, Pending, etc.)
- [ ] Click "View All"
- [ ] **Verify:** Navigates to full calendar

### Doctor Calendar
- [ ] Navigate to calendar page
- [ ] **Verify:** Weekly/monthly view available
- [ ] **Verify:** Appointments displayed
- [ ] **Verify:** Can switch between views
- [ ] Click on appointment
- [ ] **Verify:** Appointment details modal opens
- [ ] **Verify:** Patient medical history accessible

### Time Slot Management
- [ ] Navigate to availability settings
- [ ] Click "Add Time Slots"
- [ ] Select date range: Next week
- [ ] Select time: 9:00 AM - 5:00 PM
- [ ] Set slot duration: 30 minutes
- [ ] Click "Generate Slots"
- [ ] **Verify:** Slots created successfully
- [ ] **Verify:** Slots appear in calendar
- [ ] Select a slot and click "Delete"
- [ ] **Verify:** Cannot delete if booked
- [ ] **Verify:** Can delete if available

### Doctor Profile Edit
- [ ] Navigate to profile settings
- [ ] Edit specialty: "Cardiology"
- [ ] Edit consultation price: €50.00
- [ ] Upload profile photo
- [ ] Add languages: English, French
- [ ] Edit bio
- [ ] Click "Save"
- [ ] **Verify:** Success message
- [ ] View public profile
- [ ] **Verify:** Changes visible

---

## 🎫 MEMBERSHIP SYSTEM TESTING

### Subscribe to Monthly Plan
**Browser:** Chrome ☐ Firefox ☐ Safari ☐ Edge ☐

- [ ] Login as patient
- [ ] Navigate to `/membership`
- [ ] **Verify:** 2 plans displayed (Monthly, 6-Month)
- [ ] **Verify:** Prices shown: €45/month, €219/6-months
- [ ] **Verify:** Features listed for each plan
- [ ] Click "Choose This Plan" for Monthly
- [ ] **Verify:** Stripe checkout loads
- [ ] Enter test card: 4242 4242 4242 4242
- [ ] Complete subscription
- [ ] **Verify:** Redirects to success page
- [ ] **Verify:** Success message displayed
- [ ] Navigate to dashboard
- [ ] **CRITICAL:** **Verify:** Membership widget shows 2 credits immediately
- [ ] Click widget
- [ ] **Verify:** Allowance details visible (2/2 credits)

### Book Appointment with Membership Credit
- [ ] Navigate to `/doctors`
- [ ] Select doctor and time slot
- [ ] Click "Confirm"
- [ ] **CRITICAL:** **Verify:** NO payment form appears
- [ ] **Verify:** Message shows "Covered by membership"
- [ ] **Verify:** Appointment immediately confirmed
- [ ] Return to dashboard
- [ ] **Verify:** Widget now shows 1/2 credits
- [ ] Click widget
- [ ] **Verify:** Allowance history shows 1 credit used

### Exhaust Credits
- [ ] Book second appointment
- [ ] **Verify:** Covered by membership (no payment)
- [ ] **Verify:** Widget now shows 0/2 credits
- [ ] Try to book third appointment
- [ ] **Verify:** Payment form appears (no credits left)
- [ ] **Verify:** Message shows "No credits remaining"

### Cancel Membership
- [ ] Navigate to `/membership`
- [ ] Click "Cancel Subscription"
- [ ] **Verify:** Confirmation dialog appears
- [ ] **Verify:** Warning about losing benefits
- [ ] Click "Yes, Cancel"
- [ ] **Verify:** Success message
- [ ] **Verify:** Shows "Active until [end date]"
- [ ] **Verify:** Can still use remaining credits until cycle ends

### Reactivate Membership
- [ ] After cancelling, click "Reactivate"
- [ ] **Verify:** Confirmation dialog
- [ ] Click "Yes, Reactivate"
- [ ] **Verify:** Success message
- [ ] **Verify:** Status changes to "Active"
- [ ] **Verify:** Will renew at cycle end

---

## 🌐 CROSS-BROWSER TESTING

Run key flows in each browser:

### Chrome (Latest)
- [ ] Patient booking flow
- [ ] Membership subscription
- [ ] Video consultation join
- [ ] File upload

### Firefox (Latest)
- [ ] Patient booking flow
- [ ] Reschedule appointment
- [ ] Settings update

### Safari (Latest)
- [ ] Patient booking flow
- [ ] Payment processing
- [ ] Video consultation

### Edge (Latest)
- [ ] Patient booking flow
- [ ] Calendar view

### Mobile Chrome (Android)
- [ ] Responsive dashboard
- [ ] Book appointment
- [ ] Join video call

### Mobile Safari (iOS)
- [ ] Responsive dashboard
- [ ] Book appointment
- [ ] Payment processing

---

## 📱 MOBILE RESPONSIVENESS

Test at these breakpoints:

### iPhone SE (320px)
- [ ] Navigation menu collapses
- [ ] Buttons are tappable (44x44px minimum)
- [ ] Forms are usable
- [ ] Calendar readable
- [ ] No horizontal scroll

### iPhone 12 (390px)
- [ ] All features accessible
- [ ] Images scale properly
- [ ] Modals fit screen

### iPad (768px)
- [ ] Sidebar appears
- [ ] Calendar in grid view
- [ ] Dashboard cards stack properly

### Desktop (1920px)
- [ ] Full layout visible
- [ ] No excessive whitespace
- [ ] Max-width containers used

---

## ⚡ PERFORMANCE TESTING

### Page Load Times
- [ ] Homepage: <2 seconds
- [ ] Dashboard: <2 seconds
- [ ] Doctors page: <2 seconds
- [ ] Booking flow: <1 second per step

### Network Conditions
**Use Chrome DevTools → Network → Throttling**

- [ ] Fast 3G: All features work, loading states visible
- [ ] Slow 3G: Page loads within 5 seconds, critical content prioritized
- [ ] Offline: Error message displayed, retry button available

### Lighthouse Audit
Run Lighthouse in Chrome DevTools:
- [ ] Performance: >90
- [ ] Accessibility: >95
- [ ] Best Practices: >90
- [ ] SEO: >90

---

## 🔒 SECURITY TESTING

### Authentication
- [ ] Cannot access `/dashboard` without login → Redirects to `/`
- [ ] Cannot access doctor routes as patient → Blocked
- [ ] Cannot access admin routes as patient → Blocked
- [ ] Session persists across tab close/reopen
- [ ] Logout clears session completely

### Input Validation
- [ ] SQL injection attempts blocked: `' OR '1'='1`
- [ ] XSS attempts sanitized: `<script>alert('xss')</script>`
- [ ] File upload validation (type, size)
- [ ] Form validation on all inputs

### API Security
- [ ] CORS configured correctly (only Vercel frontend)
- [ ] CSRF protection active
- [ ] Rate limiting on endpoints (max 100 req/15min)
- [ ] Sensitive data not logged

---

## 📊 TEST RESULTS TEMPLATE

### Test Session Information
- **Date:** YYYY-MM-DD
- **Tester:** Your Name
- **Browser:** Chrome 120.0.0
- **OS:** Windows 11 / macOS 14 / Ubuntu 22.04
- **Device:** Desktop / Laptop / Mobile

### Pass/Fail Summary
- **Total Tests:** XX
- **Passed:** XX
- **Failed:** XX
- **Blocked:** XX
- **Pass Rate:** XX%

### Bugs Found
1. **Bug #1:** [Short description]
   - **Severity:** Critical / High / Medium / Low
   - **Steps to reproduce:**
   - **Expected:**
   - **Actual:**
   - **Screenshot:** [Link or description]

---

## 🚀 Next Steps After Testing

1. **Document all bugs** in GitHub Issues
2. **Prioritize by severity:**
   - Critical: Blocks core functionality
   - High: Major feature broken
   - Medium: Minor feature broken
   - Low: Cosmetic issues
3. **Create test reports** with screenshots/videos
4. **Share results** with development team
5. **Retest after fixes** are deployed

---

**Happy Testing! 🧪**
