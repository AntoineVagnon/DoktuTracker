# Supabase Email Confirmation Setup

## Problem
The email confirmation link from Supabase is redirecting to an error page instead of properly confirming the email and logging the user in.

## Solution

### 1. Update Supabase Auth Settings

In your Supabase dashboard:

1. Go to **Authentication > URL Configuration**
2. Set the **Site URL** to: `https://doktu-tracker.replit.app`
3. Add **Redirect URLs**:
   - `https://doktu-tracker.replit.app/auth/callback`
   - `https://doktu-tracker.replit.app/dashboard`
   - `https://doktu-tracker.replit.app/test-login`

### 2. Update Email Templates (Optional)

Go to **Authentication > Email Templates** and customize the confirmation email template to redirect to:
```
{{ .SiteURL }}/auth/callback?access_token={{ .Token }}&refresh_token={{ .RefreshToken }}&type=signup
```

### 3. Current Flow

1. User registers at `/create-account` ✅ (Working)
2. User receives Supabase confirmation email ✅ (Working)  
3. User clicks email link → Should go to `/auth/callback` ❌ (Needs Supabase config)
4. App processes confirmation and redirects to login ✅ (Ready)
5. User logs in successfully ✅ (Ready)

## Temporary Workaround

For testing, we can also create a manual email confirmation bypass:

1. User registers
2. User gets "Check email" message
3. User can click "Already confirmed? Try logging in" link
4. System attempts login and shows appropriate error/success

## Next Steps

1. Update Supabase redirect URLs as shown above
2. Test the email confirmation flow
3. If still having issues, we can implement the temporary workaround