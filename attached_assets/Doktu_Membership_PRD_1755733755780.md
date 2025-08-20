# Doktu — PRD: Membership Plan (v1)

## 0. Purpose

Introduce a **Membership** option for patients that offers a predictable, subscription-based way to access video consultations. The plan includes **2 × 30-minute consultations per monthly cycle** (anchored to activation date), with **auto-renewal**, **no rollovers**, and **no refunds for the current period** on cancellation. This PRD consolidates all decisions, UI copy changes, booking rules, lifecycle logic, notifications, and the **conceptual data model impact** (no variable/ID names), **focusing only on what the membership changes affect**.

---

## 1. Scope

### In scope
- Public pricing & copy updates on **Home**, **Doctor cards**, **Doctor profile**, **Booking summary**, **Patient dashboard**.
- Booking logic to **cover** 30-minute visits using membership **allowance**.
- Allowance life-cycle: **grant**, **consume**, **restore** (on early cancel or doctor cancel), **reset** monthly, **no rollover**.
- Interaction with **reschedule/cancel** rules.
- Billing life-cycle: **activation**, **renewal**, **dunning/suspension**, **cancellation**.
- **Notifications** & calendar invites reflecting the above.
- Conceptual **data model** additions/changes.
- Basic **admin overrides** for allowance.

### Out of scope
- Family/corporate plans, pro-rated billing, yearly plan.
- Clinical deliverables such as **digital prescription** or **medical report** (explicitly removed).
- Assigning a dedicated doctor to the member (removed).

---

## 2. Membership Product

- **Name:** Membership
- **Pricing:**  
  - **Monthly:** €45 / month  
  - **6-Month:** €219 total (≈ €37 / month), renews every 6 months
- **Entitlement:** **2 × 30-minute video consultations** per monthly cycle
- **Coverage:** Applies **only** to 30-minute sessions
- **Cycle anchor:** Starts at **activation**, resets every **month** (for 6-Month plan: resets monthly within the 6-month coverage window)
- **Rollover:** **No** rollover of unused visits
- **Auto-renew:** Yes, until canceled
- **Cancellation:** Anytime; **no refund** for current period; access remains until end of period
- **When allowance = 0:** user can **wait until reset** or **book pay-per-visit (€35)**

**Pay-per-visit (unchanged):** €35 per 30-minute consultation.

---

## 3. UX & Copy Changes

> Remove **“Digital prescription”** and **“Medical report”** from all surfaces.

### 3.1 Home — Pricing section
- **Pay-per-visit**  
  - Price: **€35**  
  - Bullets:  
    - ✅ 30-minute video consultation  
    - ✅ Book certified doctors  
    - ✅ Secure, private call
- **Membership**  
  - Price: **€45 / month** or **€219 / 6 months** (≈ €37 / month)  
  - Sub-copy: **2 × 30-minute video consultations each month**  
  - Bullets:  
    - ✅ Book any eligible doctor  
    - ✅ Upload & share health data (labs, notes)  
    - ✅ No per-visit fee while allowance remains  
  - Micro-copy: *Covers 30-minute video sessions · 2 visits/month · Auto-renews · Cancel any time (no refund for current period).*

### 3.2 Doctor list & Doctor profile
- Show **€35** pay-per-visit.
- If user has active membership: **“Covered by membership (2 visits/month)”** with **Remaining visits: X/2**.

### 3.3 Booking summary
- If covered: Badge **“Covered by membership”**; total **€0** (for that visit).
- If not covered (Allowance = 0): show **€35** with an upsell *“Wait until reset on [date] or book now (€35)”*.

### 3.4 Patient dashboard
- Membership card: **state** (Active / Suspended / Ends on), **usage meter (X/2)**, **next reset date**.
- Appointments cards reflect **Covered by membership** when applicable.

---

## 4. Core Functional Requirements

### 4.1 Eligibility & Coverage Check
- Membership covers **one 30-minute consultation per credit**.
- **60-minute** or other durations are **not covered**; prompt to switch to **30 minutes** or **pay-per-visit**.
- Coverage decision occurs during booking; if **Allowance > 0** → **covered**; otherwise pay-per-visit flow.

### 4.2 Allowance Life-cycle
- On activation or monthly reset: **Allowance = 2**.
- On covered booking confirmation: **Allowance −= 1**.
- On **early cancellation** by patient (≥ 60 min before start): **Allowance += 1**.
- On **late cancellation** (< 60 min) by patient: **no return**.
- On **doctor cancellation**: **Allowance += 1**.
- **Reschedule** (respecting platform reschedule policy): **does not change** allowance (still consumed).

### 4.3 Billing Life-cycle
- **Activate:** On successful first charge (monthly or 6-month).
- **Renew:** Monthly or semi-annual; membership remains **Active** if paid.
- **Dunning/Suspension:** If payment fails; membership becomes **Suspended** (no coverage). Member can still pay-per-visit.
- **Cancel:** User cancels; membership remains usable until **period end**; then **Ended**.

### 4.4 Booking Flow Variants
- **Covered path** (Allowance > 0): no per-visit charge; normal confirmation; **.ics** invite with correct timezone.
- **Not covered path** (Allowance = 0): show **€35** pay-per-visit checkout; keep **.ics** invite behavior.

### 4.5 Rescheduling & Cancellation (interaction recap)
- **Reschedule**: allowed per platform rules (e.g., ≥ 60 min). **No change** to allowance.
- **Cancel ≥ 60 min**: allowance **restored**.
- **Cancel < 60 min**: allowance **not restored**.
- **Doctor cancel**: allowance **restored**.

### 4.6 Admin tools
- Override allowance for a period (**add/restore one credit**) to resolve service issues.
- View member state (Active/Suspended/Ends on), allowance usage, next reset date.

---

## 5. Notifications (membership-related)

> Email + in-app; SMS for time-critical cases (optional). Keep .ics invites aligned with local timezone.

- **Membership activated** → plan, start date, **0/2 used**, next reset; CTA **Go to dashboard**.
- **Upcoming renewal (T-3 days)** → renew date; CTA **Manage membership**.
- **Payment success** → renewal confirmed (monthly/semi-annual).
- **Payment failed (dunning 1)** → fix payment; CTA **Update payment**.
- **Suspended (dunning 2)** → coverage blocked until payment fixed.
- **Cancelled** → effective end date; remains usable until then; CTA **Re-activate**.
- **Cycle reset** → allowance reset to **2**; CTA **Book visit**.
- **Allowance 1 left** → CTA **Book second visit**.
- **Allowance exhausted** → show **Next reset date** + **Book pay-per-visit (€35)**.
- **Covered booking confirmation** → date/time, doctor, **join link**, upload docs; .ics attached.
- **Early cancel (credit restored)** → allowance adjusted; CTA **Rebook**.
- **Late cancel (no restore)** → policy reminder; CTA **Book pay-per-visit**.
- **Doctor cancelled** → credit restored; CTA **Rebook**.
- **Reminders (24h / 1h)** → join link; checklist.

*Post-consultation survey & referral nudges remain as defined in the notification system, unchanged by membership other than labeling the visit as covered when applicable.*

---

## 6. Conceptual Data Model Impact (no IDs/field names)

### New/Updated Concepts
- **Membership Plan**  
  Describes public plan attributes (price points, cycle rules, allowance per cycle, coverage rules).

- **Membership Subscription**  
  Links a **patient** to a **plan** with state (**Active/Suspended/Ended/Pending cancel**), activation/renewal dates, cancellation date.

- **Billing Agreement & Payment Attempts**  
  Store payment method linkage and attempts (success/failure, reason). Drives dunning state → **Suspended**.

- **Cycle & Allowance**  
  For each subscription cycle, record **granted allowance (2)**, **used**, **remaining**, **reset date**. Represent **restore** events (early cancel/doctor cancel) and **consume** events (covered booking confirmation).

- **Booking Coverage**  
  Marks each appointment as **Covered by membership** (with reference to the cycle/allowance event) *or* **Pay-per-visit**.

- **Member Ledger / Audit Events**  
  Immutable log of allowance changes: grant (cycle start), consume (booking), restore (early/doctor cancel), forensics.

- **Dunning State**  
  Associates subscriptions with current payment health (ok / retrying / suspended) to drive UI and booking guardrails.

> No requirement to expose or rename underlying DB columns here; implementers should map these concepts to existing tables/models with minimal disruption.

---

## 7. Acceptance Criteria (Summary)

1. **Pricing & copy updated** everywhere; no mention of **digital prescription** or **medical report**.
2. **Coverage gate** enforces **30-minute only**; 60-minute prompts to switch or pay-per-visit.
3. **Allowance**: grant 2 at activation and each monthly reset; consume on covered confirmation; restore on early or doctor cancel; no restore on late cancel; no rollover.
4. **Booking UI** shows **Covered** badge and **€0** when applicable; otherwise **€35** with upsell options.
5. **Billing life-cycle**: Activation, renewal, dunning → suspension, cancellation with end-of-period access; states visible in dashboard and enforced in booking rules.
6. **Notifications** fire as specified; calendar invites reflect correct local time.
7. **Admin override** can add a credit for current cycle.
8. **Analytics** (see §10) report accurate counts for Active members, allowance utilization, coverage rate, MRR, churn.

---

## 8. Key Edge Cases

- Activation succeeds but **user already scheduled** a pay-per-visit visit → remains pay-per-visit; not auto-converted.
- **Time-zone**: All invites, reminders, and on-screen times use the **patient’s local time** (with timezone indicator).
- **Overlap**: User tries to exceed allowance by creating multiple bookings concurrently → second one defaults to pay-per-visit.
- **Suspended** member tries to book covered → block, prompt to **Fix payment** or pay-per-visit.
- **Reschedule to within 60 minutes** of original start: counts as **late** only if user cancels; reschedule itself keeps the credit consumed.
- **Doctor cancel** after slot start time (rare) → treat as service failure; credit restored; optional goodwill credit via admin.

---

## 9. Gherkin (high-value scenarios)

```gherkin
Feature: Membership coverage for 30-minute consultations

Scenario: Book a covered visit
  Given I have an Active membership with 2 remaining visits
  And I choose a 30-minute slot
  When I confirm the booking
  Then the appointment is covered by membership
  And my remaining visits become 1
  And I receive a covered confirmation with a calendar invite

Scenario: Attempt to book when allowance is zero
  Given I have an Active membership with 0 remaining visits
  When I try to book
  Then I am offered "Book now (€35 pay-per-visit)" or "Schedule after reset"
  And choosing pay-per-visit charges €35

Scenario: Select a 60-minute slot
  Given I have an Active membership with remaining visits
  When I select a 60-minute slot
  Then I am informed membership covers only 30 minutes
  And I must change duration or proceed as pay-per-visit

Scenario: Early cancellation restores credit
  Given I have a covered appointment more than 60 minutes away
  When I cancel it
  Then my remaining visits increase by 1
  And I receive a "credit restored" message

Scenario: Late cancellation does not restore credit
  Given I have a covered appointment in less than 60 minutes
  When I cancel it
  Then my remaining visits do not change
  And I receive a late-cancellation notice

Scenario: Doctor cancels a covered appointment
  Given I have a covered appointment
  When the doctor cancels it
  Then my remaining visits increase by 1
  And I am prompted to rebook

Scenario: Monthly reset restores allowance
  Given my membership is Active
  And it is my cycle reset date
  When the new cycle starts
  Then my remaining visits are set to 2
  And I am notified

Scenario: Dunning & suspension
  Given my renewal payment fails
  When dunning completes unsuccessfully
  Then my membership becomes Suspended
  And covered booking is blocked
  And I am prompted to update payment
```
---

## 10. Analytics & Success Metrics (impacted)

- **Active members** (monthly / 6-month)
- **MRR** and **renewals** (by plan)
- **Churn** (cancellations, downgrades)
- **Allowance utilization** (avg visits used per cycle)
- **Coverage rate** (% of visits covered vs pay-per-visit)
- **Dunning rate** and **suspension days**
- **Refunds** (should be zero for current period by policy)

---

## 11. Release & Migration Notes

- Update **pricing and copy** across all affected surfaces.
- Backfill existing “pricing” displays to **€35** where needed.
- Add membership **state banners** and **usage meter** to patient dashboard.
- Ensure **booking** performs coverage gate and writes ledger events.
- Activate **notification triggers** tied to membership events (activation, renewal, reset, usage).
- QA with test cards: activation → book twice → exhaust → reset → cancel edge cases → dunning → suspension → reactivation.

---

## 12. Non-functional

- **GDPR**: membership/billing data and health uploads must remain compliant; surface clear consent and retention notices where applicable.
- **Reliability**: coverage/allowance updates are atomic; ledger is immutable; idempotency on webhook/event handling.
- **Accessibility**: updated UI must remain keyboard navigable & screen-reader friendly.

---

### One-page TL;DR for Implementers

- Membership = **€45/mo** (or **€219/6-mo**), **2 × 30-min visits/month**, **no rollovers**, **auto-renew**, **cancel anytime** (no refund current period).  
- Booking **30-min** => **Covered** if **Allowance > 0**, else **€35** pay-per-visit.  
- **Early cancel** restores credit; **late** does not; **doctor cancel** restores.  
- **Remove** “digital prescription” & “medical report” everywhere.  
- Add **dashboard meter** & **state banners**; add **notifications** as listed; keep **.ics** local-time invites.  
- Data model: add **Plan**, **Subscription**, **Cycle/Allowance**, **Coverage flag**, **Ledger**, **Dunning state** (conceptual).
