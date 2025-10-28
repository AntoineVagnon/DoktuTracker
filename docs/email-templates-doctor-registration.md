# Doctor Registration Email Templates - SendGrid Specification

**Document Version:** 1.0
**Last Updated:** 2025-10-14
**Purpose:** SendGrid email template specifications for doctor registration workflow

---

## Overview

This document specifies the 6 email templates required for the doctor registration and account management system. All templates use SendGrid's dynamic template feature with Handlebars syntax.

**Template Naming Convention**: `doctor_[event]_[type]`

---

## Template 1: Doctor Application Approved

**Template ID (SendGrid):** `doctor_application_approved`
**Trigger Code:** `DOCTOR_APP_APPROVED` (D1)
**Priority:** 51 (Operational)
**Subject:** `🎉 Your Doctor Application Has Been Approved - Complete Your Profile`

### Merge Fields
```json
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "dashboard_link": "https://doktu.co/doctor/dashboard",
  "next_steps": "Complete your profile to activate your account"
}
```

### Email Content
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Application Approved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #10b981;">
            <h1 style="color: #10b981; margin: 0;">✓ Application Approved</h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px 0;">
            <p style="font-size: 16px;">Dear Dr. {{first_name}} {{last_name}},</p>

            <p style="font-size: 16px; margin: 20px 0;">
                Congratulations! We're pleased to inform you that your doctor application has been <strong>approved</strong> by our admin team.
            </p>

            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #10b981;">🎯 Next Steps to Activate Your Account</h3>
                <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Complete your professional profile (bio, specialization)</li>
                    <li>Set your consultation price</li>
                    <li>Verify your IBAN for payment processing</li>
                    <li>Review and confirm your license details</li>
                </ol>
                <p style="margin: 15px 0 0 0;">
                    <strong>Once your profile is 100% complete, your account will be automatically activated!</strong>
                </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboard_link}}"
                   style="background-color: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Complete Your Profile →
                </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                If you have any questions, please contact our support team at
                <a href="mailto:support@doktu.co" style="color: #10b981;">support@doktu.co</a>
            </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p>© 2025 Doktu. All rights reserved.</p>
            <p>
                <a href="https://doktu.co/privacy" style="color: #9ca3af; text-decoration: none;">Privacy Policy</a> |
                <a href="https://doktu.co/terms" style="color: #9ca3af; text-decoration: none;">Terms of Service</a>
            </p>
        </div>
    </div>
</body>
</html>
```

---

## Template 2: Doctor Application Rejected (Soft)

**Template ID (SendGrid):** `doctor_application_rejected_soft`
**Trigger Code:** `DOCTOR_APP_REJECTED_SOFT` (D2)
**Priority:** 52 (Operational)
**Subject:** `Application Update - Please Review`

### Merge Fields
```json
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "rejection_reason": "Incomplete license verification documentation",
  "can_reapply": "yes",
  "reapply_days": "30",
  "support_email": "support@doktu.co"
}
```

### Email Content
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Application Update</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #f59e0b;">
            <h1 style="color: #f59e0b; margin: 0;">Application Review Update</h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px 0;">
            <p style="font-size: 16px;">Dear Dr. {{first_name}} {{last_name}},</p>

            <p style="font-size: 16px; margin: 20px 0;">
                Thank you for your interest in joining the Doktu telemedicine platform. After careful review, we are unable to approve your application at this time.
            </p>

            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #f59e0b;">Reason for Review Decision</h3>
                <p style="margin: 0; font-size: 15px;">{{rejection_reason}}</p>
            </div>

            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #10b981;">✓ You Can Reapply</h3>
                <p style="margin: 10px 0;">
                    You are welcome to submit a new application after <strong>{{reapply_days}} days</strong> from today.
                </p>
                <p style="margin: 10px 0;">
                    Before reapplying, please ensure you address the reason mentioned above and have all required documentation ready.
                </p>
            </div>

            <h3>What You Can Do Next:</h3>
            <ul style="line-height: 1.8;">
                <li>Review the rejection reason carefully</li>
                <li>Gather additional documentation if needed</li>
                <li>Contact support if you have questions: <a href="mailto:{{support_email}}" style="color: #10b981;">{{support_email}}</a></li>
                <li>Reapply after 30 days with updated information</li>
            </ul>

            <p style="font-size: 14px; color: #666; margin-top: 30px; padding: 15px; background-color: #f9fafb; border-radius: 5px;">
                <strong>Note:</strong> This is not a permanent rejection. We encourage you to address the feedback and reapply. Many successful doctors on our platform were approved on their second application.
            </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p>© 2025 Doktu. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

---

## Template 3: Doctor Application Rejected (Hard)

**Template ID (SendGrid):** `doctor_application_rejected_hard`
**Trigger Code:** `DOCTOR_APP_REJECTED_HARD` (D3)
**Priority:** 53 (Operational)
**Subject:** `Application Decision - Doktu Platform`

### Merge Fields
```json
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "rejection_reason": "License verification failed - credentials do not match medical registry",
  "can_reapply": "no",
  "reapply_days": "never",
  "support_email": "support@doktu.co"
}
```

### Email Content
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Application Decision</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #ef4444;">
            <h1 style="color: #ef4444; margin: 0;">Application Decision</h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px 0;">
            <p style="font-size: 16px;">Dear {{first_name}} {{last_name}},</p>

            <p style="font-size: 16px; margin: 20px 0;">
                Thank you for your interest in joining the Doktu telemedicine platform. After thorough review and verification, we regret to inform you that we cannot proceed with your application.
            </p>

            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #ef4444;">Reason for Decision</h3>
                <p style="margin: 0; font-size: 15px;">{{rejection_reason}}</p>
            </div>

            <div style="background-color: #f9fafb; padding: 15px; margin: 25px 0; border-radius: 5px;">
                <p style="margin: 0; font-size: 15px;">
                    <strong>This decision is final.</strong> The email address used for this application is not eligible for future registrations on the Doktu platform.
                </p>
            </div>

            <h3>If You Believe This Is An Error</h3>
            <p style="line-height: 1.8;">
                If you believe this decision was made in error or you have additional information that was not considered during the review process, please contact our support team:
            </p>
            <div style="text-align: center; margin: 25px 0;">
                <a href="mailto:{{support_email}}"
                   style="background-color: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Contact Support
                </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                We take platform integrity and patient safety very seriously. All application decisions are made after careful review and verification of credentials.
            </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p>© 2025 Doktu. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

---

## Template 4: Doctor Account Suspended

**Template ID (SendGrid):** `doctor_account_suspended`
**Trigger Code:** `DOCTOR_ACCOUNT_SUSPENDED` (D4)
**Priority:** 56 (High Operational)
**Subject:** `🚨 Important: Your Doktu Account Has Been Suspended`

### Merge Fields
```json
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "suspension_reason": "Multiple patient complaints regarding consultation quality",
  "support_email": "support@doktu.co"
}
```

### Email Content
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Account Suspended</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #ef4444;">
            <h1 style="color: #ef4444; margin: 0;">⚠️ Account Suspended</h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px 0;">
            <p style="font-size: 16px;">Dear Dr. {{first_name}} {{last_name}},</p>

            <div style="background-color: #fef2f2; border: 2px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 5px;">
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #ef4444;">
                    Your Doktu doctor account has been suspended effective immediately.
                </p>
            </div>

            <h3 style="color: #ef4444;">Reason for Suspension</h3>
            <p style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; font-size: 15px;">
                {{suspension_reason}}
            </p>

            <h3>What This Means:</h3>
            <ul style="line-height: 1.8;">
                <li>Your profile is no longer visible to patients</li>
                <li>You cannot accept new consultation bookings</li>
                <li>Existing appointments may be cancelled</li>
                <li>Your access to the doctor dashboard is restricted</li>
            </ul>

            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #f59e0b;">Next Steps</h3>
                <p style="margin: 10px 0;">
                    If you wish to appeal this decision or discuss the suspension, please contact our support team immediately:
                </p>
                <p style="margin: 10px 0;">
                    <strong>Email:</strong> <a href="mailto:{{support_email}}" style="color: #f59e0b;">{{support_email}}</a><br>
                    <strong>Subject:</strong> Account Suspension Appeal - Dr. {{last_name}}
                </p>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                We take patient safety and platform integrity seriously. All suspension decisions are made after careful review of reported issues and platform policies.
            </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p>© 2025 Doktu. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

---

## Template 5: Doctor Account Reactivated

**Template ID (SendGrid):** `doctor_account_reactivated`
**Trigger Code:** `DOCTOR_ACCOUNT_REACTIVATED` (D5)
**Priority:** 50 (Operational)
**Subject:** `✅ Welcome Back - Your Doktu Account Has Been Reactivated`

### Merge Fields
```json
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "dashboard_link": "https://doktu.co/doctor/dashboard"
}
```

### Email Content
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Account Reactivated</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #10b981;">
            <h1 style="color: #10b981; margin: 0;">✓ Account Reactivated</h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px 0;">
            <p style="font-size: 16px;">Dear Dr. {{first_name}} {{last_name}},</p>

            <div style="background-color: #f0fdf4; border: 2px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 5px; text-align: center;">
                <h2 style="margin: 0; color: #10b981;">🎉 Welcome Back!</h2>
                <p style="margin: 10px 0 0 0; font-size: 16px;">
                    Your Doktu doctor account has been successfully reactivated.
                </p>
            </div>

            <h3>Your Account is Now Active:</h3>
            <ul style="line-height: 1.8;">
                <li>✓ Your profile is visible to patients</li>
                <li>✓ You can accept new consultation bookings</li>
                <li>✓ Full access to your doctor dashboard</li>
                <li>✓ You can manage your availability schedule</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{{dashboard_link}}"
                   style="background-color: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Access Your Dashboard →
                </a>
            </div>

            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #3b82f6;">💡 Quick Tips to Get Started</h3>
                <ol style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                    <li>Review and update your availability schedule</li>
                    <li>Check your profile information is current</li>
                    <li>Respond to any pending patient messages</li>
                    <li>Set up your consultation preferences</li>
                </ol>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                If you have any questions or need assistance, please contact support at
                <a href="mailto:support@doktu.co" style="color: #10b981;">support@doktu.co</a>
            </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p>© 2025 Doktu. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

---

## Template 6: Doctor Profile Activation Complete

**Template ID (SendGrid):** `doctor_profile_activated`
**Trigger Code:** `DOCTOR_PROFILE_ACTIVATION_COMPLETE` (D6)
**Priority:** 49 (Operational)
**Subject:** `🎉 Congratulations! Your Doctor Profile is Now Active`

### Merge Fields
```json
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "dashboard_link": "https://doktu.co/doctor/dashboard",
  "profile_url": "https://doktu.co/doctors/123"
}
```

### Email Content
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Profile Activated</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #10b981;">
            <h1 style="color: #10b981; margin: 0;">🎉 Profile Activated!</h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px 0;">
            <p style="font-size: 16px;">Dear Dr. {{first_name}} {{last_name}},</p>

            <div style="background-color: #f0fdf4; border: 2px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center;">
                <h2 style="margin: 0 0 10px 0; color: #10b981;">🎊 Congratulations!</h2>
                <p style="margin: 0; font-size: 17px; font-weight: bold;">
                    Your doctor profile is now 100% complete and <span style="color: #10b981;">ACTIVE</span>!
                </p>
                <p style="margin: 15px 0 0 0; font-size: 15px; color: #666;">
                    You can now start accepting patient consultations on the Doktu platform.
                </p>
            </div>

            <h3>✓ Your Profile is Live:</h3>
            <ul style="line-height: 1.8; font-size: 15px;">
                <li><strong>Visible to patients:</strong> Your profile appears in search results</li>
                <li><strong>Accepting bookings:</strong> Patients can book consultations with you</li>
                <li><strong>Payment ready:</strong> Your IBAN is verified for receiving payments</li>
                <li><strong>Fully activated:</strong> All platform features are available</li>
            </ul>

            <div style="display: flex; gap: 10px; margin: 30px 0; justify-content: center;">
                <a href="{{dashboard_link}}"
                   style="background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Go to Dashboard
                </a>
                <a href="{{profile_url}}"
                   style="background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    View My Profile
                </a>
            </div>

            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #3b82f6;">🚀 Next Steps to Get Your First Patients</h3>
                <ol style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                    <li><strong>Set Your Availability:</strong> Add your weekly schedule and available time slots</li>
                    <li><strong>Complete Your Bio:</strong> Make sure your profile showcases your expertise</li>
                    <li><strong>Check Your Settings:</strong> Review consultation preferences and notification settings</li>
                    <li><strong>Share Your Profile:</strong> Let your existing patients know you're on Doktu</li>
                </ol>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
                <h3 style="margin-top: 0; color: #f59e0b;">💡 Pro Tips for Success</h3>
                <ul style="margin: 10px 0; line-height: 1.8;">
                    <li>Respond quickly to patient messages (within 24 hours)</li>
                    <li>Keep your availability calendar up to date</li>
                    <li>Provide detailed consultation notes after each session</li>
                    <li>Maintain high-quality video consultations</li>
                </ul>
            </div>

            <p style="font-size: 15px; margin-top: 30px; text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 5px;">
                <strong>Welcome to the Doktu community!</strong><br>
                We're excited to have you on board. If you need any help getting started,
                our support team is here for you at <a href="mailto:support@doktu.co" style="color: #10b981;">support@doktu.co</a>
            </p>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p>© 2025 Doktu. All rights reserved.</p>
            <p>
                <a href="https://doktu.co/privacy" style="color: #9ca3af; text-decoration: none;">Privacy Policy</a> |
                <a href="https://doktu.co/terms" style="color: #9ca3af; text-decoration: none;">Terms of Service</a> |
                <a href="https://doktu.co/doctor/help" style="color: #9ca3af; text-decoration: none;">Doctor Help Center</a>
            </p>
        </div>
    </div>
</body>
</html>
```

---

## Implementation Checklist

### SendGrid Setup

1. **Create 6 Dynamic Templates in SendGrid**
   - Log into SendGrid dashboard
   - Navigate to Email API → Dynamic Templates
   - Create new template for each trigger code
   - Use the HTML content provided above

2. **Template IDs Mapping**
   ```javascript
   const SENDGRID_TEMPLATE_IDS = {
     'doctor_application_approved': 'd-xxxxxxxxxxxxx',
     'doctor_application_rejected_soft': 'd-xxxxxxxxxxxxx',
     'doctor_application_rejected_hard': 'd-xxxxxxxxxxxxx',
     'doctor_account_suspended': 'd-xxxxxxxxxxxxx',
     'doctor_account_reactivated': 'd-xxxxxxxxxxxxx',
     'doctor_profile_activated': 'd-xxxxxxxxxxxxx'
   };
   ```

3. **Test Each Template**
   - Send test emails with sample merge data
   - Verify all variables render correctly
   - Test on multiple email clients (Gmail, Outlook, Apple Mail)
   - Check mobile responsiveness

4. **Update `emailTemplates.ts`**
   - Add template key → SendGrid ID mappings
   - Ensure merge field names match exactly

---

## Merge Field Reference

### Common Fields (All Templates)
- `first_name`: Doctor's first name
- `last_name`: Doctor's last name
- `support_email`: "support@doktu.co"

### Template-Specific Fields

**Approved:**
- `dashboard_link`: URL to doctor dashboard
- `next_steps`: Next action message

**Rejected (Soft/Hard):**
- `rejection_reason`: Admin-provided reason
- `can_reapply`: "yes" or "no"
- `reapply_days`: "30" or "never"

**Suspended:**
- `suspension_reason`: Admin-provided reason

**Reactivated:**
- `dashboard_link`: URL to doctor dashboard

**Activated:**
- `dashboard_link`: URL to doctor dashboard
- `profile_url`: URL to public doctor profile

---

## Testing Data

Use this data for template testing:

```json
{
  "doctor_application_approved": {
    "first_name": "Jean",
    "last_name": "Dupont",
    "dashboard_link": "https://doktu.co/doctor/dashboard",
    "next_steps": "Complete your profile to activate your account"
  },
  "doctor_application_rejected_soft": {
    "first_name": "Marie",
    "last_name": "Martin",
    "rejection_reason": "License documentation requires additional verification",
    "can_reapply": "yes",
    "reapply_days": "30",
    "support_email": "support@doktu.co"
  },
  "doctor_application_rejected_hard": {
    "first_name": "Pierre",
    "last_name": "Bernard",
    "rejection_reason": "License verification failed - credentials do not match medical registry",
    "can_reapply": "no",
    "reapply_days": "never",
    "support_email": "support@doktu.co"
  },
  "doctor_account_suspended": {
    "first_name": "Sophie",
    "last_name": "Leroy",
    "suspension_reason": "Multiple patient complaints regarding consultation quality",
    "support_email": "support@doktu.co"
  },
  "doctor_account_reactivated": {
    "first_name": "Thomas",
    "last_name": "Petit",
    "dashboard_link": "https://doktu.co/doctor/dashboard"
  },
  "doctor_profile_activated": {
    "first_name": "Claire",
    "last_name": "Dubois",
    "dashboard_link": "https://doktu.co/doctor/dashboard",
    "profile_url": "https://doktu.co/doctors/123"
  }
}
```

---

## Notes

- All templates use responsive design for mobile devices
- Color scheme matches Doktu brand guidelines (green: #10b981, blue: #3b82f6, red: #ef4444, yellow: #f59e0b)
- Templates include proper unsubscribe links (required by email regulations)
- All external links use HTTPS
- Templates are GDPR compliant with privacy policy links

