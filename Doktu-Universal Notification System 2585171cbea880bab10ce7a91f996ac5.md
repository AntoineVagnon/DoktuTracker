# Doktu — Universal Notification System

**Functional & Design Spec + Gherkin user stories**

*(tool-agnostic; your AI coding agent chooses the tech stack/templates—no code here)*

---

## 1) Goal

Provide a **single, consistent notification framework** for Doktu that covers **every critical moment** in the user journey (patients, doctors, admins): account, booking, payments, membership, documents, calendar, growth. Define **what to send, when, to whom, via which channel**, with **priority & suppression rules** so users get the right nudge at the right time—without spam.

---

## 2) Channels & priorities

- **Channels:** In-app banner, In-app inbox, Email, Push (optional), SMS (optional), Calendar invite (.ics), Desktop/OS calendar sync (if connected).
- **Priority (highest → lowest):**
    1. **Blocking/Compliance:** payment incomplete, security alerts.
    2. **Time-critical:** live/starting ≤ 5 min; 1h/24h reminders.
    3. **Operational:** confirmations, reschedules, cancellations.
    4. **Lifecycle/Growth:** onboarding, re-engagement, surveys, referrals.
- **Quiet hours (user timezone):** default **22:00–08:00** for SMS/Push; Email allowed; banners always permitted. (Admins not restricted.)

---

## 3) Global rules (apply to all)

- **Locale & timezone:** Use recipient’s **preferred language** and **local time** with TZ suffix.
- **Dedup & suppression:** Never send two notifications for the same event; suppress lower-priority items when a higher-priority banner is active (e.g., **Payment incomplete** outranks others).
- **Frequency caps:** Max **1 marketing email/week**, **3 lifecycle nudges/week**; transactional always allowed.
- **Fallbacks:** If email bounces → fallback to in-app inbox + banner; if Push unsubscribed → fallback to Email.
- **Unsubscribe controls:** Users can opt out of marketing/lifecycle by category; can’t opt out of transactional/security.
- **Accessibility:** Clear subjects, readable CTA labels, ALT text; WCAG AA colors.
- **Audit:** Log **who/what/when** for each notification, including delivery result (sent, bounced, opened if available).

---

## 4) Notification catalog (what, who, when, how)

> Subjects are examples; your agent will implement templates with placeholders like [FirstName], [DoctorName], [Date Local], [JoinLink], etc.
> 

### A) Account & security

| ID | Trigger | Audience | Timing | Channel(s) | Example Subject/Title | Purpose / CTA |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Registration success | Patient | Immediately | Email + In-app | Welcome to Doktu | Confirm account created; CTA **Go to dashboard** |
| A2 | Email verify (if enabled) | Patient/Doctor | Immediately | Email | Verify your email | Verify link |
| A3 | Password reset requested | Patient/Doctor | Immediately | Email | Reset your Doktu password | Secure reset link (expires) |
| A4 | Password changed | Patient/Doctor | Immediately | Email + In-app | Your password was changed | Security confirmation; CTA **Secure account** if not you |
| A5 | New device / session | Patient/Doctor | Immediately | Email | New login to your account | Device/time/IP, CTA **Review sessions** |
| A6 | MFA set up/removed (if used) | Patient/Doctor | Immediately | Email | Two-step verification updated | Security confirmation |

### B) Health profile & documents

| ID | Trigger | Audience | Timing | Channel(s) | Subject/Title | Purpose / CTA |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | Health profile incomplete (first dashboard visit) | Patient | Once, then weekly until done | In-app banner + In-app inbox (+ optional Email) | Complete your health profile | CTA **Complete profile** |
| H2 | Health profile completed | Patient | Immediately | In-app | Profile complete | Confirmation |
| H3 | Patient uploads doc to appointment | Doctor | Immediately | Email + In-app | New document from [Patient] | CTA **Open patient record** |
| H4 | Doctor shares doc with patient | Patient | Immediately | Email + In-app | Your doctor shared a document | CTA **View document** |
| H5 | Doc upload failed/virus flagged | Uploader | Immediately | In-app + Email | We couldn’t upload your file | Guidance to retry |

### C) Booking & appointment lifecycle

| ID | Trigger | Audience | Timing | Channel(s) | Subject/Title | Purpose / CTA |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | Slot selected, payment pending (15-min hold) | Patient | Immediately | **In-app banner (red)** | Complete payment to secure your booking | CTA **Pay now**; auto-expires after 15 min |
| B2 | Hold expired (no payment) | Patient | +15 min | In-app + Email (optional) | Your booking wasn’t completed | CTA **Rebook** |
| B3 | Booking confirmed (paid or covered) | Patient & Doctor | Immediately | Email + In-app + **.ics** | Your consultation is confirmed | CTA **View appointment** |
| B4 | 24-hour reminder | Patient & Doctor | −24h | Email (+ optional SMS/Push) | Reminder: your consultation is tomorrow | CTA **Review details** |
| B5 | 1-hour reminder | Patient & Doctor | −1h | Email + optional SMS/Push | Starting soon: your consultation | CTA **Join link** |
| B6 | Live/imminent (≤5 min) | Patient & Doctor | −5 to 0 min | **Banner (highest)** | Live now / starts in 5 min | CTA **Join** |
| B7 | Rescheduled | Patient & Doctor | Immediately | Email + In-app + updated .ics | Your consultation was rescheduled | CTA **Review** |
| B8 | Cancelled by patient (≥60 min) | Patient & Doctor | Immediately | Email + In-app | Appointment cancelled by patient | Slot released; membership credit restored if applicable |
| B9 | Cancelled by patient (<60 min) | Patient & Doctor | Immediately | Email + In-app | Late cancellation | Policy reminder; credit consumed if membership |
| B10 | Cancelled by doctor | Patient & Doctor | Immediately | Email + In-app | Appointment cancelled by doctor | Patient credit restored; CTA **Rebook** |
| B11 | Doctor no-show flag | Patient & Admin | +10 min from start if doctor absent | In-app + Email (Admin) | We’re looking into your session | Support awareness |
| B12 | Patient no-show flag | Doctor & Admin | +10 min if patient absent | In-app + Email (Admin) | Patient didn’t attend | Record for policy |

> ICS/calendar: All B3, B4, B5 carry correct local times. Calendar sync notifications (if user connected Google/Apple) fire separately (see Section E).
> 

### D) Payments & membership

| ID | Trigger | Audience | Timing | Channel(s) | Subject/Title | Purpose / CTA |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | Membership activated | Patient | Immediately | Email + In-app | Your membership is active | Plan, amount, cycle, next reset; CTA **Go to dashboard** |
| M2 | Membership renewal upcoming | Patient | T−3 days | Email + In-app | Your membership renews soon | CTA **Manage membership** |
| M3 | Membership renewed (success) | Patient | On charge | Email + In-app | Membership renewed | Receipt/invoice |
| M4 | Membership payment failed (1) | Patient | Immediately | Email + In-app (+ optional SMS) | We couldn’t process your payment | CTA **Update payment** |
| M5 | Membership suspended (fail 2) | Patient | +48h if unpaid | Email + In-app (blocking) | Membership suspended | Coverage blocked; CTA **Fix payment** |
| M6 | Membership cancelled by user | Patient | Immediately | Email + In-app | Cancellation confirmed | End date; still usable until end |
| M7 | Membership reactivated | Patient | On successful retry | Email + In-app | Membership reactivated | CTA **Book now** |
| M8 | Allowance 1 left | Patient | On using 1st | In-app + optional Email | You have 1 visit left this month | CTA **Book** |
| M9 | Allowance exhausted | Patient | On using 2nd | In-app + optional Email | You’ve used all visits this month | CTA **Book pay-per-visit** |
| M10 | Monthly reset | Patient | On reset | In-app + optional Email | Your allowance has reset | CTA **Book now** |
| P1 | Pay-per-visit receipt | Patient | On charge | Email | Payment receipt | Invoice & details |
| P2 | Refund/credit issued (when policy allows) | Patient | On issue | Email | Refund/credit issued | Amount & what next |

### E) Calendar & availability (doctor-side)

| ID | Trigger | Audience | Timing | Channel(s) | Subject/Title | Purpose / CTA |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | Availability edited (doctor) | Doctor | Immediately | In-app | Availability updated | Confirmation |
| C2 | Availability conflict detected | Doctor | Immediately | In-app + Email (optional) | Conflict in your schedule | CTA **Resolve** |
| C3 | External calendar connected | Patient/Doctor | Immediately | In-app + Email | Calendar connected | Confirmation |
| C4 | External calendar sync error | Patient/Doctor | On error | In-app + Email | Calendar sync issue | CTA **Reconnect** |
| C5 | Timezone change detected | Patient/Doctor | When changed | In-app | We updated your times | Explain impact |

### F) Doctor operations

| ID | Trigger | Audience | Timing | Channel(s) | Subject/Title | Purpose / CTA |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | New booking | Doctor | Immediately | Email + In-app | New consultation booked | CTA **View details** |
| D2 | Daily schedule digest | Doctor | 07:00 | Email (digest) | Today’s schedule | Appointments list |
| D3 | Patient uploaded new doc (not tied to appt) | Doctor | Immediately | In-app | New patient document | CTA **Open record** |
| D4 | Low utilization nudge (optional) | Doctor | Monthly | Email | Boost your availability | CTA **Edit calendar** |

### G) Admin & support

| ID | Trigger | Audience | Timing | Channel(s) | Subject/Title | Purpose / CTA |
| --- | --- | --- | --- | --- | --- | --- |
| X1 | Payment failure rate > threshold | Admin | Daily check | Email | Alert: high payment failures | CTA **View dashboard** |
| X2 | Doctor no-show rate > threshold | Admin | Weekly | Email | Alert: provider no-show rate | CTA **Investigate** |
| X3 | Conversion drop | Admin/CRO | Weekly | Email | Alert: conversion below target | CTA **Open analytics** |
| X4 | Dispute/chargeback | Admin | On event | Email | Chargeback opened | CTA **Open case** |
| X5 | Sensitive security event | Admin | Immediate | Email + In-app | Security alert | Compliance action |

### H) Growth / PLG flywheel

| ID | Trigger | Audience | Timing | Channel(s) | Subject/Title | Purpose / CTA |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | Onboarding nudge (D+1 unengaged) | Patient | Day 1 | Email + In-app | Get started with Doktu | CTA **Complete profile / Book** |
| G2 | Win-back (30 days inactive) | Patient | Day 30 | Email | We miss you | CTA **Book with 10% off** (if enabled) |
| G3 | Post-consultation survey | Patient | +1h after | Email + In-app | How was your consultation? | CTA **Give feedback** |
| G4 | Referral ask (happy path, CSAT ≥ 8) | Patient | After survey | Email + In-app | Invite a friend | CTA **Share link** |
| G5 | Membership upsell (2+ PPV in 30d) | Patient | Within 24h of 2nd | In-app + Email | Save with membership | CTA **Start membership** |
| G6 | Review request (doctor profile) | Patient | +24h | Email + In-app | Review your doctor | CTA **Leave a review** |

---

## 5) Banner priority (in-app)

1. **Payment incomplete (red)** — highest
2. **Live/starting ≤ 5 min**
3. **Suspended membership**
4. **Health profile incomplete**
5. **Low allowance / exhausted / reset**

Banners auto-dismiss when their condition no longer applies.

## 6) Template guidance (for your agent)

- Use **short subjects** (≤ 60 chars) and **one primary CTA** per message.
- Appointment emails **must include**: doctor name, date/time with timezone, **Join link**, cancel/reschedule link (if policy permits), and **.ics**.
- Membership emails **must include**: plan, price, start/renewal date, allowance rule, how to manage/cancel.
- Security emails **never include** sensitive links beyond the necessary action.

---

## 7) Gherkin user stories (key guarantees)

### Account & security

Feature: Security notifications

Scenario: Password changed confirmation

Given my account password is changed

Then I receive a "Your password was changed" email immediately

And the message contains a link to review active sessions

### Booking & reminders

Feature: Appointment confirmations and reminders

Scenario: Send confirmation with .ics

Given a consultation is confirmed

Then the patient and doctor receive a confirmation email

And the email contains an .ics calendar invite with local time

Scenario: Time-based reminders

Given a consultation is confirmed

Then a 24-hour reminder is sent

And a 1-hour reminder is sent

And a live/imminent banner appears within 5 minutes of start

### Payment hold & release

Feature: Payment hold notification

Scenario: 15-minute payment hold expires

Given I selected a time slot and did not complete payment

When 15 minutes elapse

Then the hold expires and the slot is released

And I receive a "booking not completed" message

### Membership lifecycle

Feature: Membership notifications

Scenario: Activation and allowance reset

Given I activate a monthly membership

Then I receive an activation email with plan and next reset date

And on each monthly reset I receive (optional) a reset message

Scenario: Dunning and suspension

Given my renewal payment fails

Then I receive a payment failure email immediately

And if payment is still not updated after 48 hours my membership becomes Suspended

And I receive a suspension notice with a "Fix payment" CTA

### Changes & cancellations

Feature: Changes and cancellations

Scenario: Reschedule success

Given an appointment is rescheduled

Then both parties receive a reschedule email with the updated .ics

Scenario: Late cancellation policy

Given a patient cancels less than 60 minutes before the start

Then the late-cancellation message is sent to both parties

And the patient is informed that membership credit is not restored (if applicable)

### Documents

Feature: Document sharing

Scenario: Patient uploads a document to an appointment

Given I upload a document for an upcoming consultation

Then the doctor receives a notification with a link to the patient record

### Growth / PLG

Feature: Lifecycle and growth nudges

Scenario: Post-consultation survey and referral

Given a consultation completes

Then the patient receives a survey email after one hour

And if the survey rating is 8 or above

Then the patient receives a referral invitation

### Suppression & quiet hours

Feature: Quiet hours and suppression

Scenario: Suppress non-critical push during quiet hours

Given local time is between 22:00 and 08:00

When a non-critical lifecycle push would fire

Then it is suppressed until quiet hours end

---

## 8) Acceptance criteria (summary)

- Every event in the catalog triggers **at most one** appropriate notification with **correct timing** and **preferred channel**.
- Appointment emails include **.ics** and correct local time.
- Payment hold expires at **15 min**, with slot release + message.
- Membership lifecycle messages fire on **activation, renewal, failure, suspension, cancellation, reset, usage thresholds**.
- Banners follow the **priority stack** and auto-dismiss correctly.
- Localization, quiet hours, deduplication, opt-outs, and audit logs work as specified.

---

## 9) Non-functional

- **Reliability:** Idempotent sending; retry on transient failures; no duplicate sends.
- **Privacy:** PHI never placed in subject lines; documents linked behind auth.
- **Performance:** Rendering under 150ms per notification payload.
- **Observability:** Metrics for send, open (if available), click (if available), bounce, complaint.

# Enhanced Doktu Notification Templates

## User Lifecycle Optimized Copy

> Copywriting Philosophy: Each template focuses on clear value prop, urgency where appropriate, emotional resonance, and friction-free CTAs. Templates leverage behavioral psychology triggers including loss aversion, social proof, and progression momentum.
> 

---

## A) Account & Security

### **A1 — Registration Success**

**📧 Email Template**

- **Subject:** You're in! Here's what happens next, [[FirstName]]
- **Preheader:** Your Doktu account is ready. Let's get you your first consultation in 2 minutes.
- **Headline:** Welcome to instant healthcare, [[FirstName]] 👋
- **Body:** Your account is live and ready. Join 50,000+ patients who book trusted doctors in under 60 seconds. No waiting rooms, no delays—just quality care when you need it.
- **CTA:** Complete my profile → `[[DashboardURL]]`
- **Social proof footer:** "Finally, a doctor when I need one" - Sarah M., verified patient
- **Footer:** Questions? We're here: `[[SupportEmail]]` | `[[SupportPhone]]`

**📱 In-App Banner**

- **Text:** *Your account is ready* — Complete your profile to unlock instant booking
- **CTA:** Finish setup
- **Style:** Success green, auto-dismiss after 10 seconds

**📥 In-App Inbox Card**

- **Title:** *Welcome to Doktu*
- **Body:** Next: Add your health basics (2 min) → Find your doctor → Book instantly
- **CTA:** Start profile
- **Visual:** Progress bar (Step 1 of 3)

---

### **A2 — Email Verification**

**📧 Email Template**

- **Subject:** [[FirstName]], one click to unlock booking
- **Preheader:** Verify now and book your first doctor in minutes
- **Headline:** Almost there! Verify your email
- **Body:** Hi [[FirstName]], you're one click away from booking trusted doctors instantly. Verify your email to unlock your account and start booking.
- **CTA:** Verify my email → `[[VerifyURL]]`
- **Urgency note:** This link expires in 24 hours for your security

**📱 In-App Banner**

- **Text:** *Please verify your email* — Booking is locked until verified
- **CTA:** Send verification
- **Style:** Warning yellow, persistent until resolved

---

### **A3 — Password Reset**

**📧 Email Template**

- **Subject:** Reset your Doktu password (expires soon)
- **Preheader:** Secure link inside - expires in 1 hour
- **Headline:** Let's get you back in
- **Body:** Someone requested a password reset for your Doktu account. If this was you, use the button below. If not, simply ignore this email - your account remains secure.
- **CTA:** Reset my password → `[[ResetURL]]`
- **Security note:** Link expires in 1 hour | Not you? Contact support: `[[SupportEmail]]`

**📱 In-App Banner**

- **Text:** *Password reset requested* — Wasn't you? Secure your account now
- **CTA:** Review sessions
- **Style:** Security blue, high priority

---

### **A4 — Password Changed**

**📧 Email Template**

- **Subject:** Your Doktu password was just changed
- **Preheader:** Secure action completed on [[DateLocal]]
- **Headline:** Password updated successfully
- **Body:** Your password was changed on [[DateLocal]] at [[TimeLocal]]. Your account remains secure. If this wasn't you, please review your active sessions immediately.
- **CTA:** Review active sessions → `[[SessionsURL]]`
- **Security footer:** Need help? Contact security: `[[SecurityEmail]]`

**📱 In-App Banner**

- **Text:** *Password changed* — Review sessions if this wasn't you
- **CTA:** Review sessions
- **Style:** Info blue, medium priority

---

### **A5 — New Device/Session**

**📧 Email Template**

- **Subject:** New sign-in detected on your Doktu account
- **Preheader:** [[Device]] from [[Location]] on [[DateLocal]]
- **Headline:** New login detected
- **Body:** Hi [[FirstName]], we noticed a new sign-in to your account:
**When:** [[DateLocal]] at [[TimeLocal]]
**Device:** [[Device]]
**Location:** [[Location]]
**IP:** [[IP]]
Was this you?
- **CTA:** Yes, that was me | Review all sessions → `[[SessionsURL]]`
- **Security note:** If this wasn't you, secure your account immediately

**📱 In-App Banner**

- **Text:** *New device login* — Review if you don't recognize this activity
- **CTA:** Review sessions
- **Style:** Security amber, high priority

---

### **A6 — MFA Updated**

**📧 Email Template**

- **Subject:** Two-factor authentication [[Action]]
- **Preheader:** Your security settings were updated on [[DateLocal]]
- **Headline:** Security settings updated
- **Body:** Your two-factor authentication was [[Action]] on [[DateLocal]]. Your account security level is now: [[SecurityLevel]].
- **CTA:** Review security settings → `[[SecurityURL]]`
- **Footer:** Keep your account safe with strong passwords and 2FA

**📱 In-App Banner**

- **Text:** *Security updated* — 2FA settings changed
- **CTA:** Review security
- **Style:** Info blue, medium priority

---

## B) Health Profile & Documents

### **H1 — Health Profile Incomplete**

**📧 Email Template** (Optional)

- **Subject:** [[FirstName]], 2 minutes to better consultations
- **Preheader:** Complete your health profile and get personalized care
- **Headline:** Help your doctors help you better
- **Body:** Hi [[FirstName]], doctors give better care when they know your health history. Add your key conditions, medications, and allergies once - then every consultation is personalized and efficient.
**Takes just 2 minutes:**
✓ Current medications
✓ Key conditions
✓ Allergies & reactions
✓ Previous surgeries
- **CTA:** Complete my profile → `[[HealthProfileURL]]`
- **Benefits note:** Doctors will be prepared before your call starts

**📱 In-App Banner**

- **Text:** *Complete your health profile* — 2-min setup for personalized care
- **CTA:** Add health info
- **Style:** Info blue, medium persistence

**📥 In-App Inbox Card**

- **Title:** *Better consultations start with your health profile*
- **Body:** Add medications, conditions, allergies. Doctors review before your call for more personalized care.
- **CTA:** Complete profile (2 min)
- **Visual:** Profile completion: 20% complete

---

### **H2 — Health Profile Completed**

**📱 In-App Banner**

- **Text:** *Health profile complete!* — Doctors can now prepare personalized consultations
- **CTA:** Book consultation
- **Style:** Success green, celebratory animation

**📥 In-App Inbox Card**

- **Title:** *Profile complete! 🎉*
- **Body:** Great job! Your doctors can now provide more personalized care. Upload any recent test results or documents before your next visit.
- **CTA:** Upload documents
- **Visual:** Checkmark animation

---

### **H3 — Patient Uploads Document (To Doctor)**

**📧 Email Template**

- **Subject:** New document: [[PatientFirstName]] [[PatientLastInitial]] - [[DateLocal]] consultation
- **Preheader:** Review patient document before your upcoming consultation
- **Headline:** Patient document ready for review
- **Body:** [[PatientFirstName]] [[PatientLastInitial]] uploaded a document for your consultation on [[DateLocal]] at [[TimeLocal]].
**Document:** [[DocumentType]]
**Upload time:** [[UploadTime]]
- **CTA:** Review patient record → `[[PatientRecordURL]]`
- **Efficiency note:** Review before the call for a more effective consultation

**📱 In-App Banner**

- **Text:** *New patient document* — [[PatientFirstName]] [[PatientLastInitial]] uploaded for [[DateLocal]]
- **CTA:** Review document
- **Style:** Info blue with document icon

---

### **H4 — Doctor Shares Document**

**📧 Email Template**

- **Subject:** Dr. [[DoctorLastName]] shared your consultation document
- **Preheader:** Securely available in your Doktu account anytime
- **Headline:** New document from Dr. [[DoctorLastName]]
- **Body:** Hi [[FirstName]], Dr. [[DoctorLastName]] shared a document from your consultation. It's securely stored in your account and available anytime.
**Document:** [[DocumentType]]
**Consultation:** [[DateLocal]]
- **CTA:** View my document → `[[DocumentURL]]`
- **Security note:** Your documents are HIPAA-compliant and secure

**📱 In-App Banner**

- **Text:** *New document shared* — Dr. [[DoctorLastName]] added to your records
- **CTA:** View document
- **Style:** Success green with document icon

---

### **H5 — Document Upload Failed**

**📧 Email Template**

- **Subject:** We couldn't upload your file - quick fix needed
- **Preheader:** [[Reason]] - try again with these tips
- **Headline:** Upload issue - easy fix
- **Body:** Hi [[FirstName]], we couldn't upload your file. Here's what happened and how to fix it:
**Issue:** [[Reason]]
**Supported formats:** PDF, JPG, PNG, DOC, DOCX
**Max size:** 25MB per file
- **CTA:** Try uploading again → `[[UploadURL]]`
- **Help note:** Still having trouble? Our support team can help: `[[SupportEmail]]`

**📱 In-App Banner**

- **Text:** *Upload failed* — [[Reason]]. Try again with supported format
- **CTA:** Retry upload
- **Style:** Warning orange with retry icon

---

## C) Booking & Appointment Lifecycle

### **B1 — Payment Pending (15-min Hold)**

**📱 In-App Banner** (RED - Highest Priority)

- **Text:** *Complete payment to secure your slot* — [[DoctorName]], [[DateLocal]] held for 15 minutes
- **Countdown timer:** 14:32 remaining
- **CTA:** Complete payment
- **Style:** Urgent red with pulsing animation

**📥 In-App Inbox Card**

- **Title:** *Finish booking with Dr. [[DoctorLastName]]*
- **Body:** Your slot expires in [[TimeRemaining]]. Complete payment to confirm your [[DateLocal]] consultation.
- **CTA:** Pay now
- **Visual:** Countdown timer and doctor photo

### **B2 — Hold Expired**

**📧 Email Template** (Optional)

- **Subject:** Your booking slot was released
- **Preheader:** No worries - Dr. [[DoctorLastName]] has more times available
- **Headline:** Booking expired (but no problem!)
- **Body:** Hi [[FirstName]], your slot with Dr. [[DoctorLastName]] was held for 15 minutes but payment wasn't completed, so we released it for other patients.
**Good news:** Dr. [[DoctorLastName]] has [[AvailableSlots]] more slots this week
- **CTA:** See available times → `[[DoctorProfileURL]]`
- **Reassurance:** Your payment method wasn't charged

**📱 In-App Banner**

- **Text:** *Slot released* — Dr. [[DoctorLastName]] has [[AvailableSlots]] more times available
- **CTA:** Find new time
- **Style:** Neutral blue with calendar icon

---

### **B3 — Booking Confirmed**

**📧 Email Template**

- **Subject:** ✓ Confirmed: Dr. [[DoctorLastName]] on [[DateLocal]]
- **Preheader:** Join link, prep tips, and calendar invite attached
- **Headline:** You're all set! Consultation confirmed
- **Body:** Hi [[FirstName]], your consultation is confirmed:
**Doctor:** Dr. [[DoctorFirstName]] [[DoctorLastName]]
**When:** [[DateLocal]] at [[TimeLocal]]
**Duration:** [[Duration]] minutes
**Type:** [[ConsultationType]]
**Before your consultation:**
✓ Test your camera/microphone
✓ Upload any relevant documents
✓ Review your health profile
**Join 5 minutes early for a smooth start.**
- **CTA:** View consultation details → `[[AppointmentURL]]`
- **Calendar:** .ics file attached with join link
- **Support:** Questions? Contact us: `[[SupportURL]]`

**📱 In-App Banner**

- **Text:** *Consultation confirmed!* — [[DateLocal]] with Dr. [[DoctorLastName]]
- **CTA:** View details
- **Style:** Success green with calendar check icon

**📥 In-App Inbox Card**

- **Title:** *Ready for your consultation*
- **Body:** [[DateLocal]] at [[TimeLocal]] with Dr. [[DoctorLastName]]. Join link and prep checklist ready.
- **CTA:** View details
- **Visual:** Doctor photo and consultation countdown

---

### **B4 — 24-Hour Reminder**

**📧 Email Template**

- **Subject:** Tomorrow: Dr. [[DoctorLastName]] at [[TimeLocal]]
- **Preheader:** Join link ready, prep checklist inside
- **Headline:** Your consultation is tomorrow
- **Body:** Hi [[FirstName]], you're meeting Dr. [[DoctorLastName]] tomorrow:
**Tomorrow:** [[DateLocal]] at [[TimeLocal]]
**Duration:** [[Duration]] minutes
**Quick prep checklist:**
✓ Test your tech (camera/mic)
✓ Find a quiet, well-lit space
✓ Have your health profile ready
✓ Upload any new documents
**Pro tip:** Join 5 minutes early to avoid any technical delays.
- **CTA:** Open prep checklist → `[[AppointmentURL]]`
- **Join note:** We'll send your join link 1 hour before start time

**📱 In-App Banner**

- **Text:** *Tomorrow's consultation* — Dr. [[DoctorLastName]] at [[TimeLocal]]
- **CTA:** Prep checklist
- **Style:** Info blue with clock icon

---

### **B5 — 1-Hour Reminder**

**📧 Email Template**

- **Subject:** Starting in 1 hour: Dr. [[DoctorLastName]]
- **Preheader:** Join link ready - start from any device
- **Headline:** Your consultation starts in 1 hour
- **Body:** Hi [[FirstName]], get ready! Your consultation with Dr. [[DoctorLastName]] starts at [[TimeLocal]].
**Quick tech check:**
✓ Camera working?
✓ Microphone clear?
✓ Strong internet?
✓ Quiet space ready?
**Join from your dashboard at start time.**
- **CTA:** Open my dashboard → `[[DashboardURL]]`
- **Join note:** We recommend joining 2-3 minutes early

**📱 In-App Banner**

- **Text:** *Starts in 1 hour* — Dr. [[DoctorLastName]] consultation
- **CTA:** Open dashboard
- **Style:** Attention amber with pulse animation

---

### **B6 — Live/Imminent (≤5 min)**

**📱 In-App Banner** (HIGHEST PRIORITY)

- **Text:** *JOIN NOW* — Dr. [[DoctorLastName]] is ready for you
- **CTA:** Join consultation
- **Style:** Urgent green with strong animation and sound
- **Timer:** [[TimeToStart]] (Live now/Starts in 3 min/etc.)

---

### **B7 — Rescheduled**

**📧 Email Template**

- **Subject:** Updated: Your consultation moved to [[NewDateLocal]]
- **Preheader:** New time confirmed, calendar updated automatically
- **Headline:** Consultation rescheduled
- **Body:** Hi [[FirstName]], your consultation with Dr. [[DoctorLastName]] has been moved:
**New time:** [[NewDateLocal]] at [[NewTimeLocal]]
**Previous time:** [[OldDateLocal]] at [[OldTimeLocal]]
**Reason:** [[RescheduleReason]]
Your calendar has been automatically updated.
- **CTA:** View new details → `[[AppointmentURL]]`
- **Calendar:** Updated .ics file attached
- **Apology:** Thanks for your flexibility!

**📱 In-App Banner**

- **Text:** *Consultation moved* — New time: [[NewDateLocal]] [[NewTimeLocal]]
- **CTA:** View details
- **Style:** Info blue with calendar icon

---

### **B8 — Cancelled by Patient (≥60 min)**

**📧 Email Template**

- **Subject:** Cancellation confirmed - Dr. [[DoctorLastName]]
- **Preheader:** [[CreditNote]] and rebooking options inside
- **Headline:** Cancellation confirmed
- **Body:** Hi [[FirstName]], we've cancelled your consultation with Dr. [[DoctorLastName]] on [[DateLocal]].
**Status:** Cancelled with full policy compliance
**Credit:** [[CreditDetails]]
**Dr. [[DoctorLastName]] has [[AvailableSlots]] more slots available this week.**
- **CTA:** Rebook with Dr. [[DoctorLastName]] → `[[DoctorProfileURL]]`
- **Alternative:** Browse other doctors → `[[DoctorSearchURL]]`

**📱 In-App Banner**

- **Text:** *Cancellation confirmed* — [[CreditNote]]
- **CTA:** Rebook
- **Style:** Neutral blue with calendar X icon

---

### **B9 — Late Cancellation (<60 min)**

**📧 Email Template**

- **Subject:** Late cancellation policy applied
- **Preheader:** [[PolicyNote]] - future bookings unaffected
- **Headline:** Cancellation received
- **Body:** Hi [[FirstName]], we received your cancellation for Dr. [[DoctorLastName]] on [[DateLocal]].
**Cancelled:** Less than 60 minutes before start
**Policy:** [[LatePolicy]]
**Next time:** Cancel 60+ minutes early to avoid this policy
**This doesn't affect future bookings.**
- **CTA:** Book your next consultation → `[[DoctorSearchURL]]`
- **Policy link:** Review our policies → `[[PoliciesURL]]`

**📱 In-App Banner**

- **Text:** *Late cancellation noted* — See policy for details
- **CTA:** View policy
- **Style:** Warning orange with info icon

---

### **B10 — Cancelled by Doctor**

**📧 Email Template**

- **Subject:** Dr. [[DoctorLastName]] had to cancel - credit restored
- **Preheader:** [[CreditNote]] - rebook with any doctor anytime
- **Headline:** We sincerely apologize
- **Body:** Hi [[FirstName]], Dr. [[DoctorLastName]] had to cancel your consultation on [[DateLocal]] due to [[Reason]].
**Your account:** [[CreditRestored]]
**Next steps:** Book with Dr. [[DoctorLastName]] or any other doctor
**We're sorry for the inconvenience and appreciate your understanding.**
- **CTA:** Find available doctors → `[[DoctorSearchURL]]`
- **Rebook same:** Rebook Dr. [[DoctorLastName]] → `[[DoctorProfileURL]]`

**📱 In-App Banner**

- **Text:** *Doctor cancelled* — Credit restored, rebook anytime
- **CTA:** Find doctors
- **Style:** Apologetic blue with credit icon

---

### **B11 — Doctor No-Show Flag (Patient & Admin)**

**📧 Email Template** (Admin)

- **Subject:** URGENT: Doctor no-show reported - [[DoctorName]]
- **Preheader:** Patient [[PatientName]] consultation [[DateLocal]]
- **Headline:** Doctor no-show investigation required
- **Body:** Patient [[PatientName]] reported that Dr. [[DoctorName]] failed to attend the consultation scheduled for [[DateLocal]] at [[TimeLocal]].
**Consultation ID:** [[ConsultationID]]
**Patient contact:** [[PatientContact]]
**Doctor contact:** [[DoctorContact]]
**Immediate action required for patient resolution.**
- **CTA:** Open investigation case → `[[AdminCaseURL]]`
- **Priority:** High priority support case opened

**📱 In-App Banner** (Patient)

- **Text:** *We're investigating your session* — Support has been notified immediately
- **CTA:** Contact support
- **Style:** Support purple with investigation icon

---

### **B12 — Patient No-Show Flag (Doctor & Admin)**

**📧 Email Template** (Admin)

- **Subject:** Patient no-show reported - policy application
- **Preheader:** Dr. [[DoctorName]] consultation [[DateLocal]]
- **Headline:** Patient no-show recorded
- **Body:** Dr. [[DoctorName]] reported that patient [[PatientName]] failed to attend the consultation scheduled for [[DateLocal]] at [[TimeLocal]].
**Consultation ID:** [[ConsultationID]]
**Policy application:** [[PolicyAction]]
**Doctor compensation:** [[CompensationNote]]
- **CTA:** Review case details → `[[AdminCaseURL]]`
- **Note:** No-show policy automatically applied

**📱 In-App Banner** (Doctor)

- **Text:** *Patient no-show recorded* — Case logged, compensation processed
- **CTA:** View details
- **Style:** Neutral gray with check icon

---

## D) Payments & Membership

### **M1 — Membership Activated**

**📧 Email Template**

- **Subject:** 🎉 Your Doktu membership is live!
- **Preheader:** 2 consultations every month + member perks unlocked
- **Headline:** Welcome to unlimited healthcare, [[FirstName]]!
- **Body:** Your [[PlanName]] membership is now active! Here's what you get every month:
**✓ 2 × 30-minute consultations✓ Priority booking slots✓ No booking fees✓ Member-only doctors✓ 24/7 access to your recordsYour cycle:** Resets [[ResetDate]] every month
**Next charge:** [[NextChargeDate]] for [[Amount]]
**Pro tip:** Book early in your cycle to get your preferred times!
- **CTA:** Book my first member consultation → `[[DashboardURL]]`
- **Member portal:** Manage your membership → `[[ManageMembershipURL]]`

**📱 In-App Banner**

- **Text:** *Membership active!* 🎉 — 2 visits/month, resets [[ResetDate]]
- **CTA:** Book now
- **Style:** Celebration gold with confetti animation

**📥 In-App Inbox Card**

- **Title:** *Your membership perks are live*
- **Body:** ✓ 2 monthly visits ✓ Priority booking ✓ Member doctors ✓ No fees. Resets [[ResetDate]].
- **CTA:** Book consultation
- **Visual:** Membership badge with benefits list

---

### **M2 — Membership Renewal Upcoming**

**📧 Email Template**

- **Subject:** Your membership renews in 3 days - [[Amount]]
- **Preheader:** Everything looks good, no action needed
- **Headline:** Renewal coming up
- **Body:** Hi [[FirstName]], your [[PlanName]] membership renews on [[RenewDate]] for [[Amount]].
**Payment method:** [[PaymentMethod]]
**Next cycle:** [[NewCycleStart]] - [[NewCycleEnd]]
**Usage this cycle:** [[UsageStats]]
**Everything looks good - no action needed!**
Want to make changes? Update anytime before [[RenewDate]].
- **CTA:** Manage my membership → `[[ManageMembershipURL]]`
- **Usage tip:** You have [[RemainingVisits]] visits left this cycle - use them before [[ResetDate]]!

**📱 In-App Banner**

- **Text:** *Renews in 3 days* — [[Amount]] on [[RenewDate]]. All set!
- **CTA:** Manage membership
- **Style:** Info blue with renewal icon

---

### **M3 — Membership Renewed (Success)**

**📧 Email Template**

- **Subject:** ✓ Membership renewed - 2 fresh visits ready!
- **Preheader:** New cycle started, your consultations reset
- **Headline:** Fresh month, fresh consultations!
- **Body:** Hi [[FirstName]], your membership renewed successfully:
**Renewed:** [[RenewDate]] for [[Amount]]
**New cycle:** [[CycleStart]] - [[CycleEnd]]**Fresh allowance:** 2 × 30-minute consultations
**Payment:** Charged to [[PaymentMethod]]
**Your invoice is attached.**
- **CTA:** Book my first consultation this month → `[[DoctorSearchURL]]`
- **Receipt:** View detailed invoice → `[[InvoiceURL]]`

**📱 In-App Banner**

- **Text:** *Renewal successful!* — 2 fresh visits ready for this month
- **CTA:** Book consultation
- **Style:** Success green with refresh icon

---

### **M4 — Membership Payment Failed (1st Attempt)**

**📧 Email Template**

- **Subject:** Payment issue - update to keep your membership active
- **Preheader:** Quick fix needed to avoid service interruption
- **Headline:** Payment couldn't be processed
- **Body:** Hi [[FirstName]], we couldn't process your membership renewal:
**Failed payment:** [[Amount]] on [[AttemptDate]]
**Payment method:** [[PaymentMethod]]
**Reason:** [[FailureReason]]
**What happens next:Most common fixes:**
✓ Expired card → update expiry date
✓ Insufficient funds → try different card
✓ Bank decline → contact your bank
    - Update payment method now → keeps membership active
    - Don't update → membership suspends in 48 hours
- **CTA:** Update payment method → `[[UpdatePaymentURL]]`
- **Help:** Need help? Contact support: `[[SupportURL]]`

**📱 In-App Banner**

- **Text:** *Payment failed* — Update payment to keep membership active
- **CTA:** Fix payment
- **Style:** Warning orange with credit card icon

### **M5 — Membership Suspended (2nd Failure)**

**📧 Email Template**

- **Subject:** Membership suspended - restore access anytime
- **Preheader:** Update payment to reactivate immediately
- **Headline:** Membership temporarily suspended
- **Body:** Hi [[FirstName]], your membership is suspended because payment couldn't be processed after multiple attempts.
**Status:** Suspended on [[SuspensionDate]]
**Reason:** Payment failure ([[FailureReason]])
**Coverage:** Paused until payment updated
**To reactivate:Your consultation history and health profile remain safe and secure.**
    1. Update your payment method
    2. Membership reactivates instantly
    3. Continue using your benefits
- **CTA:** Reactivate my membership → `[[UpdatePaymentURL]]`
- **Support:** Having trouble? We're here to help: `[[SupportURL]]`

**📱 In-App Banner** (Blocking)

- **Text:** *Membership suspended* — Update payment to restore instant access
- **CTA:** Reactivate now
- **Style:** Blocking red with lock icon

---

### **M6 — Membership Cancelled by User**

**📧 Email Template**

- **Subject:** Cancellation confirmed - you're covered until [[EndDate]]
- **Preheader:** No immediate changes, keep using benefits until [[EndDate]]
- **Headline:** Cancellation confirmed
- **Body:** Hi [[FirstName]], we've cancelled your membership as requested.
**Cancellation:** Effective [[CancellationDate]]
**Coverage continues:** Until [[EndDate]]
**Remaining visits:** [[RemainingVisits]] consultations
**Final charge:** [[FinalChargeDate]] (if applicable)
**Until [[EndDate]] you can:**
✓ Book consultations (you have [[RemainingVisits]] left)
✓ Access member doctors
✓ Use all member benefits
**We're sorry to see you go!** You can reactivate anytime.
- **CTA:** Use remaining visits → `[[DoctorSearchURL]]`
- **Reactivate:** Changed your mind? Reactivate → `[[ReactivateURL]]`

**📱 In-App Banner**

- **Text:** *Membership ends [[EndDate]]* — [[RemainingVisits]] visits remaining
- **CTA:** Book consultation
- **Style:** Neutral blue with calendar icon

---

### **M7 — Membership Reactivated**

**📧 Email Template**

- **Subject:** Welcome back! Your membership is active again
- **Preheader:** All benefits restored, book your consultation now
- **Headline:** You're back! Membership reactivated
- **Body:** Hi [[FirstName]], great to have you back! Your membership is active again:
**Reactivated:** [[ReactivationDate]]
**Current cycle:** [[CycleStart]] - [[CycleEnd]]
**Available visits:** [[AvailableVisits]] consultations
**Next renewal:** [[NextRenewal]]
**All your member benefits are restored:**
✓ Priority booking slots
✓ Member-only doctors
✓ No booking fees
✓ 24/7 record access
- **CTA:** Book my consultation → `[[DoctorSearchURL]]`
- **Welcome back:** Thanks for choosing Doktu again!

**📱 In-App Banner**

- **Text:** *Membership reactivated!* — Welcome back, all benefits restored
- **CTA:** Book consultation
- **Style:** Success green with welcome animation

---

### **M8 — Allowance: 1 Visit Left**

**📧 Email Template** (Optional)

- **Subject:** 1 consultation left this month - don't lose it!
- **Preheader:** Use it before [[ResetDate]] or it expires
- **Headline:** Use it or lose it, [[FirstName]]
- **Body:** Hi [[FirstName]], you have 1 consultation remaining in your monthly allowance:
**Remaining:** 1 × 30-minute consultation
**Expires:** [[ResetDate]] (resets to 2 visits)
**Used this month:** [[UsedVisits]] consultations
**Book now to:**
✓ Get maximum value from your membership
✓ Stay on top of your health
✓ Beat the reset date
**Popular this time of month:**
    - Quick check-ups
    - Prescription renewals
    - Health maintenance visits
- **CTA:** Book my final visit → `[[DoctorSearchURL]]`
- **Reset reminder:** New visits available [[ResetDate]]

**📱 In-App Banner**

- **Text:** *1 visit left this month* — Use before [[ResetDate]] or it expires
- **CTA:** Book now
- **Style:** Attention amber with countdown

---

### **M9 — Allowance Exhausted**

**📧 Email Template** (Optional)

- **Subject:** All visits used - pay-per-visit or wait for reset
- **Preheader:** Reset on [[ResetDate]] with 2 fresh visits
- **Headline:** Month well-used, [[FirstName]]!
- **Body:** Hi [[FirstName]], you've used both monthly consultations - great job staying on top of your health!
**This month:** 2/2 consultations used
**Resets:** [[ResetDate]] with 2 fresh visits
**Need care before then?Pay-per-visit benefits:**
✓ Same trusted doctors
✓ Instant booking
✓ Same quality care
    - Book pay-per-visit consultation (same great doctors)
    - Emergency? Get instant access
    - Or wait [[DaysToReset]] days for reset
- **CTA:** Book pay-per-visit → `[[PPVBookingURL]]`
- **Reset reminder:** [[DaysToReset]] days until reset

**📱 In-App Banner**

- **Text:** *All visits used this month* — Pay-per-visit available or wait [[DaysToReset]] days
- **CTA:** Book pay-per-visit
- **Style:** Info blue with calendar progress

---

### **M10 — Monthly Reset**

**📧 Email Template** (Optional)

- **Subject:** 🎉 Fresh month = 2 new consultations ready!
- **Preheader:** Your allowance just reset - book your favorites early
- **Headline:** New month, fresh consultations!
- **Body:** Hi [[FirstName]], your monthly allowance just reset:
**Available now:** 2 × 30-minute consultations**This cycle:** [[CycleStart]] - [[CycleEnd]]
**Last month:** [[PreviousMonthUsage]]
**Pro member tip:** Book early in your cycle to secure your preferred doctors and times!
**Popular this month:**
    - Health check-ups
    - Specialist consultations
    - Follow-up appointments
    - Prescription reviews
- **CTA:** Book my first consultation → `[[DoctorSearchURL]]`
- **Track usage:** View consultation history → `[[UsageHistoryURL]]`

**📱 In-App Banner**

- **Text:** *Allowance reset!* 🎉 — 2 fresh visits available this month
- **CTA:** Book consultation
- **Style:** Celebration green with reset animation

---

### **P1 — Pay-Per-Visit Receipt**

**📧 Email Template**

- **Subject:** Receipt: [[Amount]] - Dr. [[DoctorLastName]] consultation
- **Preheader:** Payment successful, invoice attached
- **Headline:** Payment confirmation
- **Body:** Hi [[FirstName]], thanks for your payment:
**Consultation:** Dr. [[DoctorFirstName]] [[DoctorLastName]]
**Date:** [[ConsultationDate]]
**Amount:** [[Amount]]
**Payment method:** [[PaymentMethod]]
**Transaction ID:** [[TransactionID]]
**Your invoice is attached for your records.Rate your experience:** Help other patients by rating Dr. [[DoctorLastName]] after your consultation.
- **CTA:** View consultation details → `[[ConsultationURL]]`
- **Invoice:** Download detailed receipt → `[[InvoiceURL]]`

**📱 In-App Banner**

- **Text:** *Payment successful* — [[Amount]] for Dr. [[DoctorLastName]]
- **CTA:** View receipt
- **Style:** Success green with check icon

---

### **P2 — Refund/Credit Issued**

**📧 Email Template**

- **Subject:** [[RefundOrCredit]] issued: [[Amount]]
- **Preheader:** Processed to your account - details inside
- **Headline:** [[RefundOrCredit]] processed
- **Body:** Hi [[FirstName]], we've issued your [[RefundOrCredit]]:
**Amount:** [[Amount]]
**Reason:** [[RefundReason]]**Method:** [[RefundMethod]]
**Timeline:** [[ProcessingTime]]
**Reference:** [[RefundReference]]
**What happens next:**
[[RefundMethod]] will show the credit within [[ProcessingTime]]. Contact your bank if you don't see it after that time.
- **CTA:** View billing history → `[[BillingHistoryURL]]`
- **Support:** Questions about your refund? Contact us: `[[SupportURL]]`

**📱 In-App Banner**

- **Text:** *[[RefundOrCredit]] processed* — [[Amount]] returning to [[RefundMethod]]
- **CTA:** View details
- **Style:** Success green with money icon

---

## E) Calendar & Availability (Doctor)

### **C1 — Availability Edited**

**📱 In-App Banner**

- **Text:** *Availability updated* — [[ChangesSummary]] saved successfully
- **CTA:** View calendar
- **Style:** Success green with calendar icon

**📥 In-App Inbox Card**

- **Title:** *Schedule changes saved*
- **Body:** Your availability updates are live. Patients can now book your new slots.
- **CTA:** View bookings
- **Visual:** Calendar with update indicator

---

### **C2 — Availability Conflict Detected**

**📧 Email Template** (Optional)

- **Subject:** Schedule conflict needs attention
- **Preheader:** Resolve now to prevent double-booking
- **Headline:** Availability conflict detected
- **Body:** Hi Dr. [[DoctorLastName]], we found overlapping availability in your schedule:
**Conflict date:** [[ConflictDate]]
**Conflict time:** [[ConflictTime]]**Overlapping slots:** [[ConflictDetails]]
**To prevent double-booking, please resolve this conflict immediately.**
- **CTA:** Fix conflict now → `[[CalendarConflictsURL]]`
- **Auto-resolve:** Or let us automatically space your slots → `[[AutoResolveURL]]`

**📱 In-App Banner**

- **Text:** *Schedule conflict detected* — Resolve to prevent double-booking
- **CTA:** Fix now
- **Style:** Warning orange with conflict icon

---

### **C3 — External Calendar Connected**

**📧 Email Template**

- **Subject:** [[ProviderName]] calendar connected successfully
- **Preheader:** Your events will now sync automatically
- **Headline:** Calendar sync is live!
- **Body:** Hi Dr. [[DoctorLastName]], great news! Your [[ProviderName]] calendar is now connected to Doktu:
**Connected:** [[ConnectionDate]]
**Sync status:** Active and real-time
**Events synced:** [[SyncedEvents]] events imported
**What this means:**
✓ Your Doktu bookings appear in [[ProviderName]]
✓ Personal events block booking slots
✓ Real-time conflict prevention
✓ Automatic schedule updates
- **CTA:** View calendar settings → `[[CalendarSettingsURL]]`
- **Tip:** Test the sync by booking a test slot

**📱 In-App Banner**

- **Text:** *[[ProviderName]] calendar connected* — Sync is active and real-time
- **CTA:** View settings
- **Style:** Success green with sync icon

---

### **C4 — External Calendar Sync Error**

**📧 Email Template**

- **Subject:** Calendar sync paused - reconnection needed
- **Preheader:** Quick fix to resume automatic syncing
- **Headline:** Sync temporarily paused
- **Body:** Hi Dr. [[DoctorLastName]], we're having trouble syncing with your [[ProviderName]] calendar:
**Issue:** [[SyncError]]
**Since:** [[ErrorDate]]
**Impact:** New bookings won't appear in [[ProviderName]]
**Common fixes:**
✓ Reconnect calendar permissions
✓ Check [[ProviderName]] account access
✓ Update password if changed
**This usually takes 30 seconds to fix.**
- **CTA:** Reconnect calendar → `[[CalendarReconnectURL]]`
- **Support:** Still having issues? Contact tech support: `[[TechSupportURL]]`

**📱 In-App Banner**

- **Text:** *Calendar sync paused* — Reconnect [[ProviderName]] to resume
- **CTA:** Fix sync
- **Style:** Warning orange with sync error icon

---

### **C5 — Timezone Change Detected**

**📱 In-App Banner**

- **Text:** *Timezone updated to [[NewTZ]]* — All appointment times adjusted automatically
- **CTA:** Review schedule
- **Style:** Info blue with timezone icon

**📥 In-App Inbox Card**

- **Title:** *Timezone automatically updated*
- **Body:** We detected you're now in [[NewTZ]]. All your appointment times have been adjusted. Review your upcoming consultations to confirm.
- **CTA:** Check appointments
- **Visual:** Clock with timezone indicator

---

## F) Doctor Operations

### **D1 — New Booking (Doctor)**

**📧 Email Template**

- **Subject:** New booking: [[PatientFirstName]] [[PatientLastInitial]] - [[DateLocal]]
- **Preheader:** [[Duration]]-minute [[ConsultationType]] consultation
- **Headline:** New patient consultation booked
- **Body:** Hi Dr. [[DoctorLastName]], you have a new booking:
**Patient:** [[PatientFirstName]] [[PatientLastInitial]]
**When:** [[DateLocal]] at [[TimeLocal]]
**Duration:** [[Duration]] minutes
**Type:** [[ConsultationType]]
**Chief complaint:** [[ChiefComplaint]]
**Patient preparation:**
✓ Health profile: [[ProfileStatus]]
✓ Previous consultations: [[PreviousCount]]
✓ Documents uploaded: [[DocumentCount]]
**Review patient record before the consultation for optimal care.**
- **CTA:** Review patient record → `[[PatientRecordURL]]`
- **Calendar:** Add to external calendar → `[[AddToCalendarURL]]`

**📱 In-App Banner**

- **Text:** *New booking* — [[PatientFirstName]] [[PatientLastInitial]], [[DateLocal]] [[TimeLocal]]
- **CTA:** View details
- **Style:** Info blue with patient icon

---

### **D2 — Daily Schedule Digest (Doctor)**

**📧 Email Template** (Digest)

- **Subject:** Today's schedule - [[TotalAppointments]] consultations
- **Preheader:** [[FirstAppointmentTime]] - [[LastAppointmentTime]]
- **Headline:** Today on Doktu - [[DateLocal]]
- **Body:** Hi Dr. [[DoctorLastName]], here's your schedule for today:
**[[TotalAppointments]] consultations scheduledFirst appointment:** [[FirstAppointmentTime]]
**Last appointment:** [[LastAppointmentTime]]
**Estimated earnings:** [[DailyEarnings]]
**Today's patients:**
[[TimeSlot1]] - [[PatientInitials1]] ([[Duration1]]min) - [[ChiefComplaint1]]
[[TimeSlot2]] - [[PatientInitials2]] ([[Duration2]]min) - [[ChiefComplaint2]]
[[TimeSlot3]] - [[PatientInitials3]] ([[Duration3]]min) - [[ChiefComplaint3]]
**Preparation notes:**
✓ [[PrepNotes]]
✓ Test your tech 15 minutes before first appointment
✓ Review patient records for personalized care
- **CTA:** Open today's calendar → `[[DoctorCalendarURL]]`
- **Quick prep:** Bulk review patient records → `[[BulkReviewURL]]`

---

### **D3 — Patient Uploaded New Document (Not Appointment-Specific)**

**📱 In-App Banner**

- **Text:** *New patient document* — [[PatientFirstName]] [[PatientLastInitial]] added to records
- **CTA:** Review document
- **Style:** Info blue with document icon

**📥 In-App Inbox Card**

- **Title:** *Patient document added*
- **Body:** [[PatientFirstName]] [[PatientLastInitial]] uploaded [[DocumentType]]. Review when convenient for next consultation.
- **CTA:** Open patient record
- **Visual:** Document icon with patient initial

---

### **D4 — Low Utilization Nudge (Optional)**

**📧 Email Template**

- **Subject:** Increase bookings with more availability
- **Preheader:** Add slots during peak demand times
- **Headline:** Boost your weekly bookings
- **Body:** Hi Dr. [[DoctorLastName]], you could increase your bookings this week:
**Current utilization:** [[UtilizationRate]]%
**Available to add:** [[AvailableSlots]] more slots
**Peak demand times:** [[PeakTimes]]
**Average booking rate:** [[BookingRate]] per week
**High-demand slots this week:Adding availability during these times typically increases bookings by [[IncreaseEstimate]]%.**
    - [[PeakTime1]]: [[DemandLevel1]] patient searches
    - [[PeakTime2]]: [[DemandLevel2]] patient searches
    - [[PeakTime3]]: [[DemandLevel3]] patient searches
- **CTA:** Add availability → `[[DoctorCalendarURL]]`
- **Analytics:** View your booking trends → `[[DoctorAnalyticsURL]]`

---

## G) Admin & Support

### **X1 — High Payment Failure Rate**

**📧 Email Template**

- **Subject:** ALERT: Payment failures at [[FailureRate]]% - action needed
- **Preheader:** Above [[Threshold]]% threshold requires investigation
- **Headline:** Payment failure rate alert
- **Body:** Payment failures have exceeded the [[Threshold]]% threshold:
**Current rate:** [[FailureRate]]%
**Period:** [[AlertPeriod]]
**Total failed:** [[FailedCount]] of [[TotalAttempts]] attempts
**Revenue impact:** [[RevenueImpact]]
**Top failure reasons:Immediate investigation recommended.**
    1. [[FailureReason1]]: [[Reason1Count]] failures
    2. [[FailureReason2]]: [[Reason2Count]] failures
    3. [[FailureReason3]]: [[Reason3Count]] failures
- **CTA:** Open billing dashboard → `[[AdminBillingURL]]`
- **Drill down:** View failure details → `[[FailureAnalyticsURL]]`

---

### **X2 — Doctor No-Show Rate High**

**📧 Email Template**

- **Subject:** ALERT: Provider no-show rate at [[NoShowRate]]%
- **Preheader:** Quality threshold exceeded - provider management needed
- **Headline:** Provider no-show rate elevated
- **Body:** Provider no-show rate has exceeded acceptable thresholds:
**Current rate:** [[NoShowRate]]%
**Threshold:** [[Threshold]]%
**Period:** [[AlertPeriod]]
**Affected consultations:** [[AffectedCount]]
**Patient impact:** [[PatientImpactScore]]
**Top contributing providers:Provider intervention and patient retention actions required.**
    1. Dr. [[Doctor1]]: [[Doctor1Rate]]% ([[Doctor1Count]] no-shows)
    2. Dr. [[Doctor2]]: [[Doctor2Rate]]% ([[Doctor2Count]] no-shows)
    3. Dr. [[Doctor3]]: [[Doctor3Rate]]% ([[Doctor3Count]] no-shows)
- **CTA:** Investigation dashboard → `[[AdminQualityURL]]`
- **Provider actions:** Manage provider performance → `[[ProviderManagementURL]]`

---

### **X3 — Conversion Drop**

**📧 Email Template**

- **Subject:** ALERT: Booking conversion dropped to [[ConversionRate]]%
- **Preheader:** Below [[Threshold]]% target - funnel optimization needed
- **Headline:** Conversion rate below target
- **Body:** Booking conversion has fallen below acceptable levels:
**Current rate:** [[ConversionRate]]%
**Target:** [[Threshold]]%
**Period:** [[AlertPeriod]]
**Visitors affected:** [[VisitorCount]]
**Revenue impact:** [[RevenueImpact]]
**Conversion funnel breakdown:Biggest drop-off:** [[BiggestDropOff]]
    - Landing → Doctor search: [[LandingToSearchRate]]%
    - Search → Doctor profile: [[SearchToProfileRate]]%
    - Profile → Booking intent: [[ProfileToIntentRate]]%
    - Intent → Payment: [[IntentToPaymentRate]]%
- **CTA:** Open conversion analytics → `[[AdminAnalyticsURL]]`
- **A/B tests:** Launch funnel optimization → `[[OptimizationURL]]`

---

### **X4 — Dispute/Chargeback**

**📧 Email Template**

- **Subject:** URGENT: Chargeback opened - [[Amount]] - respond by [[Deadline]]
- **Preheader:** Patient [[PatientName]] - immediate response required
- **Headline:** Chargeback requires immediate response
- **Body:** A chargeback has been opened and requires immediate attention:
**Amount:** [[Amount]]
**Patient:** [[PatientName]]
**Consultation:** [[ConsultationDate]] with Dr. [[DoctorName]]
**Reason:** [[ChargebackReason]]
**Deadline:** [[ResponseDeadline]]
**Case ID:** [[ChargebackID]]
**Available evidence:**
✓ Consultation records: [[ConsultationEvidence]]
✓ Patient communications: [[CommunicationEvidence]]
✓ Service delivery proof: [[DeliveryEvidence]]
**Response must be submitted by [[ResponseDeadline]] to contest.**
- **CTA:** Open chargeback case → `[[AdminChargebackURL]]`
- **Evidence:** Compile response evidence → `[[EvidenceURL]]`

---

### **X5 — Sensitive Security Event**

**📧 Email Template**

- **Subject:** SECURITY ALERT: [[EventType]] - immediate action required
- **Preheader:** Compliance and security team response needed now
- **Headline:** Critical security event detected
- **Body:** A sensitive security event requires immediate attention:
**Event type:** [[EventType]]
**Severity:** [[SeverityLevel]]
**Detection time:** [[DetectionTime]]
**Affected systems:** [[AffectedSystems]]
**Potential impact:** [[ImpactAssessment]]
**Immediate actions taken:**
✓ [[AutomaticResponse1]]
✓ [[AutomaticResponse2]]
✓ [[AutomaticResponse3]]
**Manual intervention required for full resolution.**
- **CTA:** Open security dashboard → `[[AdminSecurityURL]]`
- **Escalate:** Contact security team → `[[SecurityEscalationURL]]`

## H) Growth / PLG Flywheel

### **G1 — Onboarding Nudge (D+1 Unengaged)**

**📧 Email Template**

- **Subject:** [[FirstName]], complete setup in 60 seconds
- **Preheader:** Profile + first booking = instant access to quality doctors
- **Headline:** Your healthcare setup is almost complete
- **Body:** Hi [[FirstName]], you're so close to having instant access to trusted doctors!
**Just 60 seconds to finish:**
✓ Add basic health info (medications, allergies)
✓ Browse our vetted doctors
✓ Book your first consultation
**Why patients love completing setup:Over 10,000 consultations completed this month.**
    - "Found a great doctor in 5 minutes" - Sarah M.
    - "No waiting rooms, no delays" - Michael R.
    - "Doctor knew my history before we started" - Lisa K.
- **CTA:** Complete my setup → `[[HealthProfileURL]]`
- **Browse first:** See our doctors → `[[DoctorBrowseURL]]`

**📱 In-App Banner**

- **Text:** *Complete setup* — 60 seconds to unlock instant doctor bookings
- **CTA:** Finish profile
- **Style:** Onboarding blue with progress indicator

---

### **G2 — Win-Back (30 Days Inactive)**

**📧 Email Template**

- **Subject:** We miss you, [[FirstName]] - quick health check?
- **Preheader:** Your health profile is saved and ready for instant booking
- **Headline:** How are you feeling lately?
- **Body:** Hi [[FirstName]], it's been a while since your last consultation. We hope you're doing well!
**Your account is ready whenever you need it:**
✓ Health profile saved and secure
✓ Trusted doctors available 7 days/week
✓ Book and meet within hours (not days)
**Popular reasons to check in:Book now and connect with a doctor today.**
    - Seasonal health optimization
    - Prescription renewals
    - Quick symptom questions
    - General wellness planning
- **CTA:** Book a quick consultation → `[[DoctorSearchURL]]`
- **Browse:** See available doctors → `[[DoctorBrowseURL]]`

**📱 In-App Banner**

- **Text:** *Welcome back!* — Your health profile is ready for instant booking
- **CTA:** Book consultation
- **Style:** Welcome blue with return icon

---

### **G3 — Post-Consultation Survey**

**📧 Email Template**

- **Subject:** How was your consultation with Dr. [[DoctorLastName]]?
- **Preheader:** 2-click feedback helps us improve your care
- **Headline:** Rate your consultation experience
- **Body:** Hi [[FirstName]], thanks for using Doktu! How was your consultation with Dr. [[DoctorLastName]]?
**Quick 2-click survey:**
Rate your experience and help other patients find great doctors.
**Your feedback helps:**
✓ Other patients choose the right doctor
✓ Doctors improve their care
✓ Doktu maintain high quality standards
**Takes 30 seconds, makes a big difference.**
- **CTA:** Rate my consultation → `[[SurveyURL]]`
- **Alternative:** Leave detailed review → `[[DetailedReviewURL]]`

**📱 In-App Banner**

- **Text:** *Rate your consultation* — Help other patients with 2-click feedback
- **CTA:** Quick survey
- **Style:** Feedback blue with star rating

---

### **G4 — Referral Ask (CSAT ≥ 8)**

**📧 Email Template**

- **Subject:** Love Doktu? Your friends will too 🎁
- **Preheader:** Share your link and you both get [[ReferralReward]]
- **Headline:** Thanks for the amazing rating!
- **Body:** Hi [[FirstName]], we're thrilled you had a great experience with Dr. [[DoctorLastName]]!
**Help your friends discover quality healthcare:**
Share your personal referral link and you both get [[ReferralReward]] off your next consultation.
**Why friends love Doktu:**
✓ Book trusted doctors in minutes (not weeks)
✓ No waiting rooms or travel time
✓ Same great doctors you're already seeing
✓ Secure, private, convenient
**Your referral link:** `[[ReferralURL]]`**Share via text, email, or social - your link tracks automatically.**
- **CTA:** Copy my referral link → `[[ReferralURL]]`
- **Social share:** Share on social media → `[[SocialShareURL]]`

**📱 In-App Banner**

- **Text:** *Share with friends* — You both get [[ReferralReward]] off next visit
- **CTA:** Copy link
- **Style:** Referral purple with share icon

---

### **G5 — Membership Upsell (2+ PPV in 30d)**

**📧 Email Template**

- **Subject:** Save money with membership - you've spent [[PPVTotal]] this month
- **Preheader:** 2+ consultations = membership saves you [[Savings]]
- **Headline:** You might benefit from membership
- **Body:** Hi [[FirstName]], we noticed you've had [[PPVCount]] consultations this month:
**Your spending:** [[PPVTotal]]
**With membership:** [[MembershipPrice]]/month
**Your savings:** [[Savings]]/month
**Membership includes:**
✓ 2 × 30-minute consultations every month
✓ Priority booking slots (book sooner)
✓ Access to member-only doctors
✓ No booking fees (save [[BookingFeesSaved]]/month)
✓ 24/7 access to consultation history
**Based on your usage, membership saves you [[AnnualSavings]]/year.**
- **CTA:** Start membership → `[[MembershipStartURL]]`
- **Compare:** See membership benefits → `[[MembershipCompareURL]]`

**📱 In-App Banner**

- **Text:** *Consider membership* — Save [[Savings]]/month with your usage pattern
- **CTA:** Learn more
- **Style:** Savings green with calculator icon

---

### **G6 — Review Request (Doctor Profile)**

**📧 Email Template**

- **Subject:** Help others find Dr. [[DoctorLastName]] - leave a review
- **Preheader:** Your experience helps other patients make confident choices
- **Headline:** Share your experience with Dr. [[DoctorLastName]]
- **Body:** Hi [[FirstName]], your consultation with Dr. [[DoctorLastName]] was [[ConsultationDate]].
**Help other patients:**
Share a few words about your experience to help others choose confidently.
**Reviews help patients understand:**
✓ Communication style
✓ Expertise level
✓ Consultation experience
✓ Whether they'd recommend
**Your review is anonymous and helps build a trusted community.Takes 2 minutes, helps thousands of patients.**
- **CTA:** Review Dr. [[DoctorLastName]] → `[[ReviewURL]]`
- **Alternative:** Quick star rating only → `[[QuickRatingURL]]`

**📱 In-App Banner**

- **Text:** *Review Dr. [[DoctorLastName]]* — Help other patients in 2 minutes
- **CTA:** Leave review
- **Style:** Community blue with review star

---

## Implementation Notes

### **Design System Guidelines:**

- **Colors**: Success green (`#22C55E`), Warning amber (`#F59E0B`), Error red (`#EF4444`), Info blue (`#3B82F6`), Neutral gray (`#6B7280`)
- **Animations**: Subtle, purposeful, max 300ms duration
- **Typography**: Clear hierarchy, readable at all sizes
- **CTAs**: High contrast, action-oriented language, single primary action
- **Accessibility**: WCAG AA compliant, screen reader friendly

### **Personalization Tokens:**

- `[[FirstName]]`, `[[LastName]]`, `[[DoctorFirstName]]`, `[[DoctorLastName]]`
- `[[DateLocal]]`, `[[TimeLocal]]`, `[[DateTimeLocal]]` (with timezone)
- `[[PlanName]]`, `[[Amount]]`, `[[CycleStart]]`, `[[CycleEnd]]`
- `[[RemainingVisits]]`, `[[UsedVisits]]`, `[[ResetDate]]`
- `[[ConsultationType]]`, `[[Duration]]`, `[[ChiefComplaint]]`

### **A/B Testing Opportunities:**

- Subject line urgency vs. benefit-focused
- CTA button text variations
- Social proof placement and type
- Email length (concise vs. detailed)
- Banner persistence timing
- Frequency of optional notifications

### **Conversion Psychology Applied:**

- **Loss aversion**: "Don't lose your visit" (M8), "Slot expires in..." (B1)
- **Social proof**: Patient testimonials, usage stats, reviews
- **Urgency**: Countdown timers, expiration dates, limited availability
- **Progress**: Setup completion, profile progress, membership cycle
- **Authority**: Doctor credentials, platform trust signals
- **Reciprocity**: Free value before asks, helpful content