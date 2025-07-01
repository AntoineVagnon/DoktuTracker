# Replit OAuth Configuration Instructions

## Critical: Add This Redirect URI to Your Replit OAuth Settings

Go to your Replit project settings and add this **exact** redirect URI:

```
https://0e26a2af-25b7-4712-bcf1-e62087ea5bb2-00-1aao71fpe1wyj.kirk.replit.dev/api/callback
```

## Steps to Configure OAuth:

1. Open your Replit project
2. Go to the "Secrets" tab in your project
3. Find the OAuth/Authentication section
4. Add the redirect URI above to the "Allowed Redirect URIs" list
5. Make sure to save the changes

## How This Fixes the Issue:

- Currently, Replit shows the "incognito/preview" screen because the redirect URI isn't whitelisted
- Once you add the correct redirect URI, OAuth will redirect directly to `/api/callback`
- The server will then redirect users to the appropriate dashboard or payment page
- No more intermediate preview screens

## Expected Flow After Configuration:

### Header Authentication:
1. User clicks "Sign In" or "Sign Up Free" → `/api/login`
2. Replit OAuth (no preview screen) → `/api/callback`
3. Server redirects to `/dashboard`

### Booking Authentication:
1. User selects slot → `/auth-choice?params`
2. Clicks "New Patient" or "Returning Patient" → `/api/login?params`
3. Replit OAuth (no preview screen) → `/api/callback`
4. Server redirects to `/payment?params`
5. After payment → `/dashboard`

The server code is already configured to handle these redirects properly once the OAuth redirect URI is whitelisted.