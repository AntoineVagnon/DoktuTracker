# Doktu — Direct Membership Checkout Flow (from Home Page)

## Goal

When a visitor clicks **“Choose Monthly”** or **“Choose 6-Month”** on the **Home page**, they should **start the membership flow immediately**—not land on the intermediate membership plans page.

The flow must mirror the existing “unlogged booking” pattern (Ask: “Do you already have an account?” → Login or Create Account) and then proceed straight to **payment to activate the membership**.

---

## Scope

### In-scope
- Home page pricing cards → deep-link directly into **membership checkout**.
- Reuse the existing **login / signup** step used in booking for non-logged users.
- Payment step is **“Activate membership”** (plan preselected based on card clicked).
- Success → membership is active; redirect to **Patient Dashboard** with confirmation toast and banner.
- Edge cases for users with an existing membership, failed payments, abandoned flows.

### Out-of-scope
- Changing membership pricing, benefits, or the membership management UI.
- Updating cancellation or renewal policies (already defined in Membership PRD).
- Backend data model changes beyond storing the selected plan and activation outcome.

---

## UX & Flow

### Entry points (Home page)
- **Monthly card CTA**: `Choose Monthly` → `/<membership-start>?plan=monthly`
- **6-month card CTA**: `Choose 6-Month` → `/<membership-start>?plan=semiannual`

> The route name is illustrative; Replit can pick final routing. The key is passing the **preselected plan** in the URL so the flow knows what to activate.

### Unified flow (logged-in vs logged-out)

1) **User clicks CTA on Home**  
   → route: `/<membership-start>?plan=monthly|semiannual`

2) **Auth checkpoint**  
   - If **logged-in**: skip to **Review & Pay**.  
   - If **not logged**: show existing booking-style step:
     - “Do you already have an account?”  
       - **Yes** → Login → then **Review & Pay**  
       - **No** → Sign up → then **Review & Pay**  
   - Preserve the selected plan during auth (do not lose context).

3) **Review & Pay (“Activate membership”)**  
   - Header: **Activate your membership**  
   - Summary card (read-only):
     - Plan: **Monthly (€45 / month)** or **6-Month (€219 / 6 months)**  
     - Allowance: “2 × 30-min consultations per month” (Monthly) or “12 consultations over 6 months” (6-Month)  
     - Renewal: “Auto-renews monthly” or “Auto-renews every 6 months”  
     - **Link: “Change plan”** → returns user to membership plans page (optional)  
   - Payment form (consistent with current checkout UX):  
     - Button: **Activate Membership**  
     - Loader state; prevent double-submits.
   - Legal footers: Terms, Privacy, Refund policy link.

4) **Success / Failure**
   - **Success**  
     - Show confirmation screen (title: “Membership active 🎉”).  
     - CTA: **Go to Dashboard**.  
     - Redirects to **Patient Dashboard** with:
       - Success toast (“Your membership is active”)  
       - Membership badge in account header (if present)  
       - (Optional) Quick link: “Book a consultation now”
     - Trigger emails: **Payment receipt & Membership activated**.
   - **Failure**  
     - Inline error near the payment button.  
     - If 3D Secure/authentication fails → show retry with guidance.  
     - Track as `membership_payment_failed`.

---

## UI Notes

- **Home cards**: Keep the short, 4-point benefit lists (as in your latest PRD).  
- **Review & Pay**:  
  - Keep it visually consistent with appointment checkout.  
  - The plan name, price, allowance, renewal period are **non-editable** here.  
  - Provide **“Change plan”** as a secondary link (not a primary action).
- **Logged-out auth**: Exactly the same patterns/styles as the existing unlogged booking flow.

---

## States & Rules

- If user **already has an active membership**:
  - Clicking a home CTA shows a guard screen:
    - “You already have an active membership (renews on [date]).”
    - Buttons: **Go to Dashboard** or **Manage Membership**.
- If user has a **paused/expired** membership:
  - Allow immediate **reactivation** using the same flow; preselect the clicked plan.
- **Abandonment**:
  - If user leaves during signup or payment, preserve the chosen plan so on return the flow resumes at the correct step.
- **Currency/Region** (if applicable later): keep the flow plan-aware; defaults to current locale.
- **Rate limits / retries**:
  - Debounce Activate button; show spinner; ensure idempotent processing.

---

## Analytics (events to instrument)

- `membership_cta_clicked`  
  - props: `{ plan: 'monthly'|'semiannual', source: 'home_pricing' }`
- `membership_flow_step_viewed`  
  - props: `{ step: 'auth'|'review_pay'|'success'|'failure', plan }`
- `membership_payment_success` / `membership_payment_failed`  
  - props: `{ plan, amount, reason? }`
- `membership_guard_shown` (user already active)  
  - props: `{ plan_clicked }`

---

## Notifications (reuse existing system)

- **Membership Activated** (email): plan, amount, start date, renewal date, allowance.  
- **Payment Receipt** (email): for the transaction.  
- **Payment Failed** (email): with instructions to retry/update payment method.

(You already have global notification templates; just add these two triggers if not present.)

---

## Error Handling & Edge Cases

- **Plan mismatch**: If URL param is invalid, default to **Monthly** and show a subtle note.
- **Session expired during payment**: Return to the Review & Pay step with a message.
- **Double click / duplicate requests**: Only one charge; show success if payment already captured.
- **Returning users via back button**: Preserve selected plan throughout.

---

## Acceptance Criteria (Gherkin)

### Feature: Start membership directly from Home

```gherkin
Scenario: Logged-in user starts Monthly membership from Home
  Given I am logged in as a patient without an active membership
  And I am on the Home page
  When I click "Choose Monthly"
  Then I am taken directly to the "Activate Membership" Review & Pay step
  And the plan shown is "Monthly (€45 / month)"
  When I complete payment successfully
  Then I see a confirmation screen
  And I am redirected to my dashboard with a success toast
  And I receive a membership activation email and receipt
```

```gherkin
Scenario: Unlogged user starts 6-Month membership and signs up
  Given I am not logged in
  When I click "Choose 6-Month" on the Home page
  Then I see the "Do you already have an account?" step
  When I choose "No" and create an account
  Then I am taken to the "Activate Membership" Review & Pay step
  And the plan shown is "6-Month (€219 / 6 months)"
  When I complete payment successfully
  Then my membership is active and I am redirected to my dashboard
```

```gherkin
Scenario: Logged-in user with active membership clicks a pricing CTA
  Given I am logged in and already have an active membership
  When I click "Choose Monthly" on the Home page
  Then I see a notice that my membership is already active
  And I can choose "Go to Dashboard" or "Manage Membership"
```

```gherkin
Scenario: Payment fails during activation
  Given I reached the "Activate Membership" Review & Pay step
  And I entered my payment details
  When the payment is declined
  Then I see an inline error and the "Activate Membership" button is enabled again
  And a failure event is tracked
```

```gherkin
Scenario: Plan context is preserved through login
  Given I clicked "Choose 6-Month" while not logged in
  And I proceed to the login step and authenticate
  Then I arrive at the "Activate Membership" Review & Pay step
  And the plan is still "6-Month"
```

```gherkin
Scenario: User changes plan at payment screen
  Given I am at the "Activate Membership" Review & Pay step with "Monthly" selected
  When I click "Change plan"
  Then I can select "6-Month" instead
  And I am returned to the Review & Pay step with the updated plan summary
```
---

## QA Checklist

- [ ] Home CTAs deep-link into membership start with correct `plan` param.  
- [ ] Logged-in users skip auth; logged-out see auth step identical to booking flow.  
- [ ] Payment screen shows correct plan, price, allowance, renewal info.  
- [ ] Success redirects to dashboard with toast; failure shows inline error.  
- [ ] Existing active membership shows guard screen.  
- [ ] Analytics events fire with correct props.  
- [ ] Emails triggered on success/failure.  
- [ ] Mobile and desktop flows behave consistently; no layout jumps.

---

## Content & Labels

- **Home CTA (Monthly):** “Choose Monthly”  
- **Home CTA (6-Month):** “Choose 6-Month”  
- **Payment button:** “Activate Membership”  
- **Guard copy (already active):** “You already have an active membership (renews on [date]).”  
- **Confirmation headline:** “Membership active 🎉”

---

If you want, I can also add a short copy block for the “Change plan” page and the guard screen, but the above is sufficient for Replit to implement the end-to-end behavior.
