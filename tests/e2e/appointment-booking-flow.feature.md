# Appointment Booking Flow - System Test Suite (Gherkin BDD)

**Feature:** Appointment Booking from Home Page as Logged-In Patient
**Test Date:** 2025-10-11
**Tester:** QA Architect (Claude Code AI)
**Risk Assessment:** HIGH (P0/P1) - Core revenue-generating functionality

---

## Risk Analysis & Component Impact Mapping

| Component | Impact Level | Risk Score | Regression Tests Required |
|-----------|--------------|------------|---------------------------|
| Authentication | High | P0 | Login session, User authentication |
| Doctor Discovery | High | P1 | Doctor list load, Doctor card display |
| Doctor Profile | High | P0 | Profile load, Availability display |
| Slot Selection | Critical | P0 | Time slot rendering, Slot booking, Slot locking |
| Payment Processing | Critical | P0 | Stripe integration, Transaction handling |
| Appointment Creation | Critical | P0 | Database write, Email notifications |
| Health Profile | Medium | P1 | Profile data access, Privacy controls |

---

## Feature: Appointment Booking End-to-End Flow

```gherkin
Feature: Appointment Booking from Home Page as Logged-In Patient
  As a logged-in patient user
  I want to book an appointment with a doctor from the home page
  So that I can receive medical consultation

  Background:
    Given I am logged in as a patient with verified email
    And I am on the home page at "/"
    And the patient has completed their health profile
    And there are doctors with available time slots
    And the Stripe payment system is operational

  # ========================================
  # P0 CRITICAL: Happy Path Tests
  # ========================================

  Scenario: P0 - Successfully book appointment with available doctor (Complete Happy Path)
    Given I see the "Find Doctors" section on the home page
    And I can see a list of doctors with their specialties
    When I click on a doctor card for "Dr. Sarah Johnson" (General Medicine)
    Then I should be redirected to the doctor profile page "/doctor/8"
    And I should see the doctor's name "Dr. Sarah Johnson"
    And I should see the specialty "General Medicine"
    And I should see the rating "4.80" and review count "156"
    And I should see the consultation fee "35.00 EUR"

    When I view the availability calendar
    Then I should see available time slots for future dates
    And time slots in the past should not be displayed
    And time slots within the next 60 minutes should not be available

    When I select a date "2025-10-15" from the calendar
    Then I should see available time slots for that date
    And each slot should show the time range (e.g., "10:00 - 10:30")

    When I click on a time slot "10:00 - 10:30"
    Then the slot should be visually highlighted as selected
    And a "Continue to Payment" button should become enabled

    When I click "Continue to Payment"
    Then I should be redirected to the payment page "/payment"
    And I should see a summary of my appointment:
      | Field | Value |
      | Doctor | Dr. Sarah Johnson |
      | Specialty | General Medicine |
      | Date | October 15, 2025 |
      | Time | 10:00 - 10:30 |
      | Consultation Fee | 35.00 EUR |

    When I enter valid payment details:
      | Field | Value |
      | Card Number | 4242 4242 4242 4242 |
      | Expiry | 12/25 |
      | CVC | 123 |
      | Postal Code | 12345 |
    And I click "Pay and Confirm Appointment"
    Then I should see a payment processing indicator
    And the payment should be processed successfully via Stripe
    And I should be redirected to a success page "/booking-success" or "/dashboard"
    And I should see a success message "Appointment booked successfully!"

    And the appointment should be created in the database with:
      | Field | Value |
      | Patient ID | [Current User ID] |
      | Doctor ID | 8 |
      | Status | confirmed |
      | Payment Status | paid |

    And a confirmation email should be sent to the patient
    And a notification email should be sent to the doctor
    And the time slot should be marked as booked and unavailable
    And analytics should track "appointment_booked" event

  # ========================================
  # P0 CRITICAL: Slot Locking & Concurrency
  # ========================================

  Scenario: P0 - Slot is locked when selected by user (Race Condition Prevention)
    Given I am on doctor profile page for "Dr. Sarah Johnson"
    And I see an available time slot "10:00 - 10:30" on "2025-10-15"
    When I click on the time slot "10:00 - 10:30"
    Then the slot should be temporarily locked for my session
    And the lock duration should be 5 minutes
    And other users should not see this slot as available

    When another user (User B) views the same doctor profile
    Then User B should NOT see the "10:00 - 10:30" slot as available
    And User B should see remaining available slots

    When 5 minutes pass without me completing the booking
    Then the slot should be automatically released
    And the slot should become available to other users again
    And I should see a notification "Your slot selection has expired"

  Scenario: P0 - Concurrent booking attempt on same slot is rejected
    Given User A has selected slot "10:00 - 10:30" on "2025-10-15"
    And User A is on the payment page
    And User B attempts to select the same slot "10:00 - 10:30"
    Then User B should see an error "This slot is no longer available"
    And User B should be prompted to select another slot
    And the slot should remain locked for User A

    When User A completes the payment successfully
    Then the slot should be permanently marked as booked
    And User B should see the slot removed from available options

  # ========================================
  # P1 HIGH: Error Handling & Edge Cases
  # ========================================

  Scenario: P1 - Doctor with no available slots shows appropriate message
    Given I click on a doctor card for "Dr. Lisa Martinez"
    And Dr. Lisa Martinez has 0 available slots
    Then I should see the doctor profile page
    And I should see a message "No available slots at this time"
    And the calendar should show dates without available times
    And there should be no bookable slots displayed

  Scenario: P1 - Payment failure rolls back appointment creation
    Given I have selected a time slot "10:00 - 10:30" on "2025-10-15"
    And I am on the payment page
    When I enter invalid payment details:
      | Card Number | 4000 0000 0000 0002 |
    And I click "Pay and Confirm Appointment"
    Then I should see a payment error "Your card was declined"
    And NO appointment should be created in the database
    And the time slot should be released and become available again
    And I should be able to select the same slot again
    And analytics should track "payment_failed" event

  Scenario: P1 - Session expires during booking process
    Given I have selected a time slot "10:00 - 10:30"
    And my session expires before I reach the payment page
    When I attempt to continue to payment
    Then I should be redirected to the login page
    And I should see a message "Session expired. Please log in again."
    And after re-login, I should be redirected back to the doctor profile
    And my previously selected slot should be released

  Scenario: P1 - Network timeout during slot selection
    Given I am viewing available time slots
    When the network connection is interrupted
    And I attempt to select a time slot
    Then I should see an error "Connection error. Please try again."
    And the UI should remain responsive
    And I should be able to retry the selection after network recovery

  # ========================================
  # P1 HIGH: Unauthenticated User Flow
  # ========================================

  Scenario: P1 - Unauthenticated user is prompted to log in before booking
    Given I am NOT logged in
    And I am on the home page "/"
    When I click on a doctor card for "Dr. Sarah Johnson"
    Then I should be redirected to the doctor profile page
    And I should see the doctor's information
    And I should see available time slots

    When I attempt to select a time slot "10:00 - 10:30"
    Then I should see a login/signup modal
    And the modal should say "Please log in to book an appointment"
    And I should have options to "Log In" or "Sign Up"

    When I log in with valid credentials
    Then the modal should close
    And the time slot should remain selected
    And I should be able to proceed to payment

  # ========================================
  # P2 MEDIUM: User Experience & Validation
  # ========================================

  Scenario: P2 - Doctor profile displays correct information
    Given I click on a doctor card for "Dr. Sarah Johnson"
    Then I should see the doctor profile with:
      | Field | Value |
      | Name | Dr. Sarah Johnson |
      | Specialty | General Medicine |
      | Rating | 4.80 |
      | Review Count | 156 reviews |
      | Consultation Fee | 35.00 EUR |
      | Bio | [Doctor's biography text] |
    And I should see a back button to return to home page

  Scenario: P2 - Calendar navigation works correctly
    Given I am on a doctor profile page
    And I see the weekly calendar view
    When I click the "Next Week" button
    Then the calendar should advance by 7 days
    And I should see time slots for the new week

    When I click the "Previous Week" button
    Then the calendar should go back by 7 days
    But I should not be able to view weeks in the past
    And past dates should be disabled/grayed out

  Scenario Outline: P2 - BVA test for slot selection timing (60-minute lead time)
    Given the current time is <current_time>
    And there is a slot at <slot_time> on today's date
    Then the slot should be <availability_status>

    Examples:
      | current_time | slot_time | availability_status |
      | 09:00        | 09:59     | unavailable (less than 60 min) |
      | 09:00        | 10:00     | unavailable (exactly 60 min) |
      | 09:00        | 10:01     | available (more than 60 min) |
      | 09:00        | 11:00     | available (more than 60 min) |

  # ========================================
  # P1 HIGH: Health Profile Integration
  # ========================================

  Scenario: P1 - Health profile is submitted with appointment booking
    Given I have a completed health profile with:
      | Field | Value |
      | Blood Type | A+ |
      | Allergies | Penicillin |
      | Current Medications | Aspirin |
    When I complete an appointment booking
    Then the appointment record should include my health profile ID
    And the doctor should have access to my health profile
    And the health profile should be marked as "shared with doctor"

  Scenario: P1 - User with incomplete health profile is prompted to complete it
    Given I am logged in as a patient
    And my health profile is incomplete (missing required fields)
    When I select a time slot and proceed to payment
    Then I should see a prompt "Complete your health profile"
    And I should be redirected to the health profile form
    And after completing the profile, I should return to the booking flow
    And my selected slot should still be locked

  # ========================================
  # P0 CRITICAL: Payment Edge Cases
  # ========================================

  Scenario: P0 - 3D Secure authentication flow for high-value transactions
    Given I have selected a time slot with consultation fee > 50 EUR
    When I enter payment details requiring 3D Secure
    And I submit the payment
    Then I should be redirected to 3D Secure authentication page
    When I complete 3D Secure authentication successfully
    Then I should be redirected back to DoktuTracker
    And the appointment should be confirmed
    And the payment status should be "paid"

  Scenario: P0 - Payment webhook failure does not leave appointment in limbo
    Given I have completed payment with Stripe successfully
    And the Stripe webhook fails to reach our server
    Then the system should poll Stripe for payment status
    And within 60 seconds, the appointment status should be updated
    And the patient should receive a confirmation email
    Or the system should mark the appointment as "pending_verification"
    And an alert should be sent to administrators

  # ========================================
  # P1 HIGH: Analytics & Tracking
  # ========================================

  Scenario: P1 - Booking funnel analytics are tracked correctly
    Given I am on the home page
    When I view the doctors section
    Then analytics should track "doctors_section_viewed"

    When I click on a doctor card
    Then analytics should track "doctor_card_clicked" with doctor ID

    When I view the doctor profile
    Then analytics should track "doctor_profile_viewed" with doctor ID

    When I select a time slot
    Then analytics should track "slot_selected" with slot details

    When I reach the payment page
    Then analytics should track "payment_page_reached"

    When I complete the booking
    Then analytics should track "appointment_booked" with:
      | Property | Example Value |
      | doctor_id | 8 |
      | specialty | General Medicine |
      | consultation_fee | 35.00 |
      | booking_source | home_page_doctor_card |
```

---

## Test Execution Priority

### P0 (Critical) - Must Pass Before Deployment
1. Successfully book appointment (complete happy path)
2. Slot locking and concurrency control
3. Payment failure rollback
4. Payment webhook handling

### P1 (High) - Fix Before Next Sprint
5. Unauthenticated user flow
6. Health profile integration
7. Network error handling
8. Session expiry handling

### P2 (Medium) - Include in Backlog
9. Calendar navigation
10. Slot timing BVA tests
11. Doctor profile display

---

## Expected Test Coverage
- **Total Scenarios:** 18
- **P0 Critical:** 5 scenarios
- **P1 High:** 8 scenarios
- **P2 Medium:** 5 scenarios

**Est. Execution Time:** 45-60 minutes (full suite)
