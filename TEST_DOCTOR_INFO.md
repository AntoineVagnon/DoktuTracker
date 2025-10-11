# Test Doctor Profile

This document contains information about the test doctor account created for automated testing and manual QA.

---

## 🏥 Doctor Profile

**Created:** 2025-10-11
**Status:** Active
**Purpose:** Testing and QA

### Identifiers
- **Doctor ID:** 5
- **User ID:** 275
- **Email:** test.doctor.1760200122865@doktu.co
- **Password:** SecurePassword123!

### Profile Details
- **Name:** API Test (Dr.)
- **Specialty:** Cardiology
- **License Number:** LIC-TEST-001
- **Years of Experience:** 5
- **Consultation Fee:** €50.00
- **Languages:** English, French
- **Bio:** Test doctor created via API test
- **Rating:** 5.00
- **Review Count:** 0

---

## 🔐 Authentication

### For Automated Tests (Playwright)

```bash
# Run doctor authentication setup
npx playwright test tests/auth-doctor.setup.ts --project=setup

# Run tests as doctor
npx playwright test tests/e2e/doctor-dashboard-smoke.spec.ts --project=doctor
```

### Manual Login

1. Navigate to: https://doktu-tracker.vercel.app/login
2. Email: `test.doctor.1760200122865@doktu.co`
3. Password: `SecurePassword123!`

---

## 📋 Test Scenarios

### What Can Be Tested

✅ **Doctor Dashboard Access**
- Login functionality
- Dashboard navigation
- Profile management

✅ **Appointment Management**
- View appointments
- Update appointment status
- Reschedule appointments

✅ **Availability/Schedule**
- Create time slots
- Edit availability
- Delete time slots

✅ **Doctor Profile**
- Update bio
- Change consultation fee
- Update languages

✅ **Patient Interactions**
- View patient list
- Access patient health profiles
- View appointment history

---

## 🧪 Testing Commands

### Authentication Setup
```bash
# Create doctor session file
npx playwright test tests/auth-doctor.setup.ts --project=setup
```

### Smoke Tests
```bash
# Test doctor dashboard access
npx playwright test tests/e2e/doctor-dashboard-smoke.spec.ts --project=doctor
```

### API Tests
```bash
# Verify doctor appears in API
curl https://web-production-b2ce.up.railway.app/api/doctors | grep "test.doctor"
```

---

## 📝 Notes

### Current Status
- ✅ Doctor profile created successfully
- ✅ Authentication working via test endpoint
- ✅ Appears in doctors list API
- ⚠️ No availability slots (availableSlots: 0)
- ⚠️ Title field is null (should be "Dr.")

### Known Issues
1. **Title Field:** The `title` field in the users table is `null`. This was not set during creation because the `users` table doesn't receive the title field from the doctor creation API.

2. **No Availabilities:** The doctor has no time slots created yet. To make the doctor bookable:
   - Log in as the test doctor
   - Navigate to availability management
   - Create some time slots

3. **Specialty vs Specialization:** The database uses `specialty` but the frontend form uses `specialization`. This is handled correctly in the backend.

---

## 🔄 Recreating the Test Doctor

If the test doctor needs to be recreated:

```bash
# Run the API test which creates a new doctor
npx playwright test tests/api/doctor-creation-api.spec.ts --project=chromium
```

Or use the admin dashboard:
1. Log in as admin (antoine.vagnon@gmail.com)
2. Go to Doctors tab
3. Click "Create New Doctor"
4. Fill in the form with test data

---

## 🚀 Future Enhancements

### Recommended Test Additions
1. **Availability Management Tests**
   - Create time slots
   - Bulk schedule creation
   - Delete/modify slots

2. **Appointment Workflow Tests**
   - Accept appointments
   - Complete appointments
   - Handle cancellations

3. **Profile Update Tests**
   - Update consultation fee
   - Change specialty
   - Update bio and languages

4. **Integration Tests**
   - Full booking flow (patient → doctor)
   - Email notifications
   - Calendar sync

---

## 📊 Database Records

### Users Table
```sql
SELECT * FROM users WHERE id = 275;
-- Result: email, firstName: API, lastName: Test, role: doctor
```

### Doctors Table
```sql
SELECT * FROM doctors WHERE id = 5;
-- Result: userId: 275, specialty: Cardiology, consultationPrice: 50.00
```

### Current API Response
```json
{
  "id": 5,
  "specialty": "Cardiology",
  "rating": "5.00",
  "reviewCount": 0,
  "consultationPrice": "50.00",
  "availableSlots": 0,
  "user": {
    "title": null,
    "firstName": "API",
    "lastName": "Test",
    "profileImageUrl": null
  }
}
```

---

**Last Updated:** 2025-10-11
**Maintained By:** Claude Code AI
