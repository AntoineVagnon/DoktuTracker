# Doktu — Pricing Cards Cleanup & Membership Plans UI (v1.1)

## 0) Goal
Make the home-page pricing section simpler, consistent, and conversion‑focused by:
- Limiting **each card to max 4 benefits**.
- Using **uniform bullet/icons** across all cards.
- Removing redundant points already implied by lower tiers.
- Keeping the CTA and prices crystal clear.

This spec only covers the **pricing cards** (Pay‑per‑visit, Monthly Membership, 6‑Month Membership) and their immediate UI/UX behavior.

---

## 1) Cards — Final Copy (EN)

### A) Pay‑per‑visit
- **Price:** **€35** per consultation  
- **Benefits (max 4):**
  1. 30‑minute video consultation
  2. Book certified doctors
  3. Secure, private call
  4. No subscription required
- **CTA:** `Book Consultation`

### B) Monthly Membership
- **Price:** **€45** per month
- **Benefits (max 4):**
  1. 2 × 30‑minute consultations per month
  2. Book any eligible doctor
  3. Upload & share health data
  4. All Basic plan benefits included
- **CTA:** `Choose Monthly`

### C) 6‑Month Membership
- **Price:** **€219** per 6 months
- **Benefits (max 4):**
  1. 12 consultations (2 per month)
  2. 23% savings vs monthly
  3. Book any eligible doctor
  4. All Basic plan benefits included
- **CTA:** `Choose 6‑Month`

> **Note:** “All Basic plan benefits included” inherits from Pay‑per‑visit and should **not** repeat bullets like *Book certified doctors* or *Secure, private call* on higher tiers.

---

## 2) Visual & Interaction Requirements

### 2.1 Bullet / Icon consistency
- All benefit bullets use the same icon style and size.
- **CSS token:** `--pricing-bullet-size: 18px;`
- **CSS example:**
  ```css
  .pricing-card li::before {
    content: '';
    width: var(--pricing-bullet-size);
    height: var(--pricing-bullet-size);
    min-width: var(--pricing-bullet-size);
    background: url('/icons/check.svg') no-repeat center/contain;
    display: inline-block;
    margin-right: 10px;
  }
  .pricing-card li { display: flex; align-items: center; }
  ```

### 2.2 Layout & typography
- Card title ≥ 22–24px, price dominant, cadence (per month/per 6 months/per consultation) in subdued color.
- Benefits set in 16px–18px with 1.4–1.6 line-height.
- Max 4 list items; if translation exceeds one line, **wrap to two lines** and truncate with ellipsis on the third line (desktop) to avoid height blowout.
- Highlight the primary plan (Monthly or 6‑Month) with a subtle badge `Most popular` or `Best value` (one badge max).

### 2.3 Buttons
- Primary CTA uses the brand primary color.
- Button sizes consistent across cards: height 44–48px, full width within card body on mobile, fixed width (min 220px) on desktop.
- Disabled state only if checkout is not possible; otherwise always enabled.

### 2.4 Accessibility
- All CTAs have descriptive `aria-label` (e.g., “Choose Monthly Membership – €45 per month”).
- Icons are decorative `aria-hidden="true"`.
- Card sections are landmarks/regions for keyboard navigation.
- Ensure WCAG AA contrast for text & buttons.

### 2.5 Responsiveness
- **Mobile (≤ 480px):** One card per row, vertical stacking, CTA full‑width.
- **Tablet (481–1024px):** Two cards per row; the third drops below.
- **Desktop (≥ 1025px):** Three cards in a single row with equal height.

---

## 3) Behavior

- Selecting a Membership CTA leads to the membership checkout flow (Monthly or 6‑Month).
- Selecting Pay‑per‑visit goes to single‑consultation booking.
- Prices must be pulled from the canonical pricing source used across the app (no hard‑coded duplicates).
- If prices are temporarily unavailable, display a skeleton state and disable CTAs.

---

## 4) Analytics (events & props)

Fire the following when the user interacts with the cards:

- `pricing_card_impression`  
  - props: `{ card: 'pay_per_visit' | 'monthly' | 'six_month', position: 1/2/3 }`

- `pricing_card_cta_click`  
  - props: `{ card: 'pay_per_visit' | 'monthly' | 'six_month', price_eur: number }`

- `pricing_compare_toggle` (if the page includes any compare UI)  
  - props: `{ state: 'open' | 'closed' }`

---

## 5) Edge cases & i18n

- **Long translations:** keep max 4 bullets; allow wrapping; prefer shorter localized strings.
- **RTL:** flip layout; keep icon left of text (mirrored) or place it right consistently across all cards for RTL.
- **A/B tests:** if a test is running, the 4‑benefit rule still applies per variant.
- **Unavailable plan:** if a plan is not available in a region, hide the card and center the remaining ones.

---

## 6) Acceptance Criteria (Gherkin)

```gherkin
Feature: Pricing cards show max 4 benefits with consistent bullets

  Background:
    Given I am on the Doktu home page
    And the pricing section is visible

  Scenario: Each card shows no more than 4 benefits
    Then the Pay-per-visit card lists exactly 4 bullet items
    And the Monthly Membership card lists exactly 4 bullet items
    And the 6-Month Membership card lists exactly 4 bullet items

  Scenario: Bullet icons have a consistent size
    When I inspect the bullet icons
    Then each bullet icon width equals the CSS token --pricing-bullet-size
    And each bullet icon height equals the CSS token --pricing-bullet-size

  Scenario: Monthly membership CTA routes to membership checkout
    When I click "Choose Monthly"
    Then I am taken to the membership checkout flow for the monthly plan

  Scenario: 6-Month membership CTA routes to membership checkout
    When I click "Choose 6-Month"
    Then I am taken to the membership checkout flow for the 6-month plan

  Scenario: Pay-per-visit CTA routes to single-booking
    When I click "Book Consultation"
    Then I am taken to the single consultation booking flow

  Scenario: Prices are consistent with platform pricing
    Then the displayed prices match the canonical pricing source

  Scenario: Accessibility conformance
    Then all CTAs include descriptive aria-labels
    And bullet icons are marked as decorative
    And text and buttons satisfy WCAG AA contrast
```

---

## 7) Copy Blocks (ready to paste)

**Pay‑per‑visit**  
- 30‑minute video consultation  
- Book certified doctors  
- Secure, private call  
- No subscription required  
CTA: **Book Consultation**

**Monthly Membership**  
- 2 × 30‑minute consultations per month  
- Book any eligible doctor  
- Upload & share health data  
- All Basic plan benefits included  
CTA: **Choose Monthly**

**6‑Month Membership**  
- 12 consultations (2 per month)  
- 23% savings vs monthly  
- Book any eligible doctor  
- All Basic plan benefits included  
CTA: **Choose 6‑Month**

---

## 8) Out of Scope
- Checkout/membership billing logic, pricing APIs, and entitlements (handled in separate specs).
- Doctor search, profile pages, and availability logic.

---

## 9) Definition of Done
- Cards render with exactly 4 bullets each on all breakpoints.
- Bullet icon sizes are visually identical and match the CSS token.
- Copy matches the text in Section 7.
- CTAs navigate to the correct flows.
- Events in Section 4 fire as specified.
- All ACs in Section 6 pass in staging and production.
