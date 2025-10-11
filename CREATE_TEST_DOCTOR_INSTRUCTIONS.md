# How to Create Test Doctor Account

## Quick Method (Recommended)

### Step 1: Create Auth User in Supabase
1. Go to: https://supabase.com/dashboard/project/hzmrkvooqjbxptqjqxii/auth/users
2. Click **"Add user"** button
3. Fill in:
   - **Email**: `test.doctor@doktu.co`
   - **Password**: `TestDoctor123!`
   - **Auto Confirm Email**: ✅ YES (check this box)
4. Click **"Create user"**
5. **Copy the UUID** that appears (you'll need it in Step 2)

### Step 2: Add User to Database
1. Go to: https://supabase.com/dashboard/project/hzmrkvooqjbxptqjqxii/editor
2. Click **"SQL Editor"**
3. Click **"New query"**
4. Paste and run this SQL (replace `YOUR_UUID_HERE` with the UUID from Step 1):

```sql
-- Insert into users table
INSERT INTO users (email, "firstName", "lastName", role, "phoneNumber", "createdAt")
VALUES (
  'test.doctor@doktu.co',
  'Test',
  'Doctor',
  'doctor',
  '+33612345678',
  NOW()
);

-- Insert into doctors table (replace YOUR_UUID_HERE with actual UUID)
INSERT INTO doctors (
  "userId",
  "firstName",
  "lastName",
  email,
  specialization,
  title,
  bio,
  "licenseNumber",
  "yearsOfExperience",
  "consultationFee",
  languages,
  rating,
  "reviewCount",
  verified,
  "acceptingNewPatients",
  "createdAt"
)
VALUES (
  'YOUR_UUID_HERE',  -- ⚠️ REPLACE THIS!
  'Test',
  'Doctor',
  'test.doctor@doktu.co',
  'General Medicine',
  'Dr.',
  'Test doctor account for automated testing and QA purposes.',
  'TEST-12345',
  10,
  35.00,
  ARRAY['English', 'French'],
  5.0,
  0,
  true,
  true,
  NOW()
);
```

5. Click **"Run"**

### Step 3: Verify Doctor Created
Run this query to verify:

```sql
SELECT
  d.id as doctor_id,
  d."firstName",
  d."lastName",
  d.email,
  d.specialization,
  d."userId" as auth_user_id
FROM doctors d
WHERE d.email = 'test.doctor@doktu.co';
```

You should see one row with the doctor's details.

---

## Test Credentials

Once created, you can use these credentials for testing:

```
📧 Email: test.doctor@doktu.co
🔑 Password: TestDoctor123!
🌐 Login URL: https://doktu-tracker.vercel.app
```

---

## Alternative: Use Existing Doctor

If you prefer, you can continue using the existing doctor account:

```
📧 Email: james.rodriguez@doktu.co
🔑 Password: password123
```

---

## Verification

After creation, test the login:

1. Go to https://doktu-tracker.vercel.app
2. Click **"Sign In"**
3. Enter email and password
4. You should be redirected to doctor dashboard

---

## For Automated Testing

Update the test file to use the new doctor:

```typescript
const DOCTOR_EMAIL = 'test.doctor@doktu.co';
const DOCTOR_PASSWORD = 'TestDoctor123!';
```

---

## Troubleshooting

### "User already exists" error
- The email is already registered
- You can either:
  1. Use a different email (e.g., `test.doctor2@doktu.co`)
  2. Delete the existing user and recreate
  3. Reset the password for the existing account

### "Doctor profile not found" when logging in
- Make sure you ran BOTH SQL inserts (users and doctors table)
- Verify the UUID matches between auth.users and doctors table

### Cannot login
- Make sure "Auto Confirm Email" was checked when creating the user
- Try resetting the password in Supabase Auth UI

---

## Cleanup (Optional)

To delete the test doctor later:

```sql
-- Delete from doctors table
DELETE FROM doctors WHERE email = 'test.doctor@doktu.co';

-- Delete from users table
DELETE FROM users WHERE email = 'test.doctor@doktu.co';

-- Delete from auth (do this in Supabase Auth UI)
```

---

**Created**: 2025-10-11
**Purpose**: Testing document access control
**Status**: Ready to create
