# Test Data Reference - Email Notification System Tests

**Test Date:** October 25, 2025
**Environment:** Production (https://doktu-tracker.vercel.app)

---

## Test User Created

```
User ID: 309
Email: qa.test.2025.10.25.001@doktu.co
Password: TestPassword123!
First Name: QA
Last Name: TestUser
Created: 2025-10-24 23:00:41 GMT+0200
```

---

## Test Appointment Created

```
Appointment ID: 191
Patient ID: 309 (QA TestUser)
Doctor ID: 9 (Dr. James Rodriguez)
Specialty: Pediatric
Appointment Date: 2025-10-27 08:30:00 GMT+0100 (Monday, October 27, 2025 at 09:30 CET)
Status: pending (payment not completed)
Price: €35.00
Created: 2025-10-24 23:05:02 GMT+0200
```

---

## Email Notifications Created

### 1. Registration Success (A1)

```
Notification ID: 8da19603-d5c1-41ea-85db-d6a3d7479a74
Trigger Code: A1
User ID: 309
Appointment ID: NULL
Status: sent
Sent At: 2025-10-24 23:00:41 GMT+0200
Created: 2025-10-24 23:00:41 GMT+0200
Error Message: None
```

**Verification Results:**
- ✅ Only 1 notification (no duplicates)
- ✅ Successfully sent
- ✅ No errors

### 2. Booking Confirmed (B3)

```
Notification ID: e85ddce3-96f0-44f5-9e39-e99d1363120d
Trigger Code: B3
User ID: 309
Appointment ID: 191
Status: pending (waiting for payment completion)
Sent At: NULL (pending)
Created: 2025-10-24 23:05:02 GMT+0200
Error Message: None
```

**Verification Results:**
- ✅ Only 1 notification (no duplicates)
- ✅ No ICS attachment errors
- ✅ Unique constraint enforced
- ⏳ Pending payment to transition to "sent"

---

## Database Queries for Verification

### Check User Registration Notification

```javascript
// Run this script to verify A1 notification
node test-evidence/check-registration-notification.mjs
```

**Expected Output:**
```
✅ Connected to database

📧 Test User Found:
   User ID: 309
   Email: qa.test.2025.10.25.001@doktu.co
   Name: QA TestUser

📬 Registration Notifications (A1):
   Total Count: 1

✅ SINGLE NOTIFICATION FOUND (No Duplicates)
   Status: sent

🔍 Duplicate Check:
   ✅ No duplicate notifications found
```

### Check Booking Notification

```javascript
// Run this script to verify B3 notification
node test-evidence/check-booking-notification.mjs
```

**Expected Output:**
```
✅ Connected to database

📅 Appointment Details:
   Appointment ID: 191
   Patient: QA TestUser
   Status: pending

📬 Booking Notifications:
   Total Count: 1

   B3: 1 notification(s)
   ✅ No duplicates for B3
     Status: pending

🔍 Duplicate Check:
   ✅ No duplicate notifications found

📎 ICS Attachment Check:
   ✅ No ICS attachment errors detected
```

---

## SQL Queries for Manual Verification

### Check Specific User Notifications

```sql
SELECT
  id,
  trigger_code,
  status,
  error_message,
  sent_at,
  created_at
FROM email_notifications
WHERE user_id = 309
ORDER BY created_at DESC;
```

### Check Specific Appointment Notifications

```sql
SELECT
  id,
  trigger_code,
  user_id,
  status,
  error_message,
  sent_at,
  created_at
FROM email_notifications
WHERE appointment_id = 191
ORDER BY created_at ASC;
```

### Check for Duplicates

```sql
SELECT
  appointment_id,
  trigger_code,
  user_id,
  COUNT(*) as count
FROM email_notifications
WHERE user_id = 309
GROUP BY appointment_id, trigger_code, user_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)
```

### Check for ICS Errors

```sql
SELECT
  id,
  trigger_code,
  error_message,
  created_at
FROM email_notifications
WHERE trigger_code = 'B3'
  AND error_message LIKE '%Cannot convert%'
  AND created_at > '2025-10-24 22:00:00'
ORDER BY created_at DESC;

-- Expected: 0 rows (no ICS errors)
```

---

## Test Evidence Files

### Screenshots

All screenshots saved to:
`C:\Users\mings\.playwright-mcp\test-evidence\screenshots\`

| File | Description |
|------|-------------|
| `01-landing-page-loaded.png` | Landing page in Bosnian |
| `02-registration-modal-opened.png` | Registration form modal |
| `03-registration-form-filled.png` | Form filled with test data |
| `04-registration-successful-dashboard.png` | User dashboard after registration |
| `05-doctors-list-page.png` | Doctors listing page |
| `06-doctor-profile-with-slots.png` | Dr. Rodriguez profile with time slots |
| `07-checkout-page-with-stripe.png` | Stripe checkout page |

### Database Scripts

All scripts saved to:
`C:\Users\mings\.apps\DoktuTracker\test-evidence\`

| File | Purpose |
|------|---------|
| `check-registration-notification.mjs` | Verify A1 notifications, check duplicates |
| `check-booking-notification.mjs` | Verify B3 notifications, check ICS errors |

---

## Cleanup Instructions (Optional)

If you want to clean up test data after verification:

```sql
-- Delete test notifications
DELETE FROM email_notifications WHERE user_id = 309;

-- Delete test appointment
DELETE FROM appointments WHERE id = 191;

-- Delete test user
DELETE FROM users WHERE id = 309;
```

**⚠️ WARNING:** Only delete test data after all stakeholders have reviewed the test results.

---

## Future Test Runs

To run similar tests in the future:

1. **Create New Test User:**
   - Email pattern: `qa.test.YYYY.MM.DD.NNN@doktu.co`
   - Example: `qa.test.2025.10.26.001@doktu.co`

2. **Book Appointment:**
   - Use any available doctor
   - Select any available time slot
   - Note the appointment ID from console logs

3. **Verify Notifications:**
   - Update user email in verification scripts
   - Update appointment ID in verification scripts
   - Run scripts to check for duplicates and errors

---

**End of Test Data Reference**
