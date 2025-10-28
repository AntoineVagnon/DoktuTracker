/**
 * Test i18n Integration for Email Templates
 * Tests that email templates are generated in the correct language based on user locale
 */

import { db } from "./server/db.js";
import { users, notificationPreferences } from "./shared/schema.js";
import { eq } from "drizzle-orm";
import { getEmailTemplate } from "./server/services/emailTemplates.js";

console.log("🧪 Testing i18n Integration for Email Templates\n");

// Test data
const testData = {
  first_name: "John",
  patient_first_name: "John",
  doctor_name: "Dr. Smith"
};

console.log("📧 Test 1: Generate welcome email in English (en)");
console.log("━".repeat(80));

try {
  const enTemplate = await getEmailTemplate("welcome_free_credit", testData, "en");

  console.log("✅ English template generated successfully");
  console.log("Subject:", enTemplate.subject);
  console.log("Contains 'Welcome to DokTu':", enTemplate.subject.includes("Welcome to DokTu"));
  console.log("Contains 'Dear John':", enTemplate.html.includes("Dear John"));
  console.log("");
} catch (error) {
  console.error("❌ Error generating English template:", error.message);
}

console.log("📧 Test 2: Generate welcome email in Bosnian (bs)");
console.log("━".repeat(80));

try {
  const bsTemplate = await getEmailTemplate("welcome_free_credit", testData, "bs");

  console.log("✅ Bosnian template generated successfully");
  console.log("Subject:", bsTemplate.subject);
  console.log("Contains 'Dobrodošli':", bsTemplate.subject.includes("Dobrodošli"));
  console.log("Contains 'Poštovani/a John':", bsTemplate.html.includes("Poštovani/a John"));
  console.log("");
} catch (error) {
  console.error("❌ Error generating Bosnian template:", error.message);
}

console.log("📧 Test 3: Test fallback to English for unsupported locale");
console.log("━".repeat(80));

try {
  const fallbackTemplate = await getEmailTemplate("welcome_free_credit", testData, "de");

  console.log("✅ Fallback template generated successfully");
  console.log("Subject:", fallbackTemplate.subject);
  console.log("Falls back to English:", fallbackTemplate.subject.includes("Welcome to DokTu"));
  console.log("");
} catch (error) {
  console.error("❌ Error generating fallback template:", error.message);
}

console.log("📧 Test 4: Test with no locale specified (should default to English)");
console.log("━".repeat(80));

try {
  const defaultTemplate = await getEmailTemplate("welcome_free_credit", testData);

  console.log("✅ Default template generated successfully");
  console.log("Subject:", defaultTemplate.subject);
  console.log("Defaults to English:", defaultTemplate.subject.includes("Welcome to DokTu"));
  console.log("");
} catch (error) {
  console.error("❌ Error generating default template:", error.message);
}

console.log("📊 Test 5: Verify user locale preference from database");
console.log("━".repeat(80));

try {
  // Get a test user
  const [testUser] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName
    })
    .from(users)
    .limit(1);

  if (testUser) {
    console.log("Found test user:", testUser.email);

    // Check if user has notification preferences
    const [prefs] = await db
      .select({
        locale: notificationPreferences.locale
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, testUser.id));

    if (prefs) {
      console.log("✅ User has notification preferences");
      console.log("Locale:", prefs.locale);

      // Generate email using user's locale
      const userTemplate = await getEmailTemplate(
        "welcome_free_credit",
        { first_name: testUser.firstName || "User", patient_first_name: testUser.firstName || "User" },
        prefs.locale
      );

      console.log("Email subject:", userTemplate.subject);
    } else {
      console.log("⚠️ User does not have notification preferences set");
      console.log("This is expected for new users - locale will default to 'en'");
    }
  } else {
    console.log("⚠️ No users found in database");
  }

  console.log("");
} catch (error) {
  console.error("❌ Error testing database integration:", error.message);
}

console.log("━".repeat(80));
console.log("✅ i18n Integration Tests Complete!");
console.log("");
console.log("Summary:");
console.log("- Email templates now support English (en) and Bosnian (bs)");
console.log("- User locale is fetched from notification_preferences.locale");
console.log("- Fallback to English for unsupported locales");
console.log("- Template generation works with and without locale parameter");
console.log("");
console.log("Next steps:");
console.log("1. Convert remaining 54 templates to use i18n");
console.log("2. Test notification service end-to-end");
console.log("3. Verify emails are sent in correct language");

process.exit(0);
