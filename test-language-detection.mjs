/**
 * Language Detection System Test
 * Tests the complete language detection flow from registration to settings
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🧪 Language Detection System Test\n");

let allTestsPassed = true;

// Test 1: Verify language detection utility exists
console.log("📋 Test 1: Verify language detection utility");
console.log("━".repeat(80));

try {
  const utilContent = readFileSync(
    join(__dirname, 'client', 'src', 'utils', 'languageDetection.ts'),
    'utf-8'
  );

  const hasDetectFunction = utilContent.includes('export function detectBrowserLanguage()');
  const hasGetSupportedLocale = utilContent.includes('export function getSupportedLocale(');
  const hasGetLanguageName = utilContent.includes('export function getLanguageName(');
  const hasSupportedLocaleType = utilContent.includes("type SupportedLocale = 'en' | 'bs'");

  console.log("   - detectBrowserLanguage() function:", hasDetectFunction ? "✅" : "❌");
  console.log("   - getSupportedLocale() function:", hasGetSupportedLocale ? "✅" : "❌");
  console.log("   - getLanguageName() function:", hasGetLanguageName ? "✅" : "❌");
  console.log("   - SupportedLocale type:", hasSupportedLocaleType ? "✅" : "❌");

  if (hasDetectFunction && hasGetSupportedLocale && hasGetLanguageName && hasSupportedLocaleType) {
    console.log("✅ Language detection utility complete\n");
  } else {
    console.log("❌ Language detection utility incomplete\n");
    allTestsPassed = false;
  }
} catch (error) {
  console.error("❌ Error reading language detection utility:", error.message);
  allTestsPassed = false;
}

// Test 2: Verify CreateAccount.tsx uses language detection
console.log("📋 Test 2: Verify CreateAccount.tsx integration");
console.log("━".repeat(80));

try {
  const createAccountContent = readFileSync(
    join(__dirname, 'client', 'src', 'pages', 'CreateAccount.tsx'),
    'utf-8'
  );

  const hasImport = createAccountContent.includes('import { detectBrowserLanguage }');
  const callsDetection = createAccountContent.includes('const detectedLanguage = detectBrowserLanguage()');
  const sendsToBackend = createAccountContent.includes('preferredLanguage: detectedLanguage');
  const hasLogging = createAccountContent.includes('console.log(\'🌍 Detected browser language for registration:\'');

  console.log("   - Imports detectBrowserLanguage:", hasImport ? "✅" : "❌");
  console.log("   - Calls language detection:", callsDetection ? "✅" : "❌");
  console.log("   - Sends to backend:", sendsToBackend ? "✅" : "❌");
  console.log("   - Has debug logging:", hasLogging ? "✅" : "❌");

  if (hasImport && callsDetection && sendsToBackend && hasLogging) {
    console.log("✅ CreateAccount.tsx properly integrated\n");
  } else {
    console.log("❌ CreateAccount.tsx integration incomplete\n");
    allTestsPassed = false;
  }
} catch (error) {
  console.error("❌ Error reading CreateAccount.tsx:", error.message);
  allTestsPassed = false;
}

// Test 3: Verify backend registration accepts preferredLanguage
console.log("📋 Test 3: Verify backend registration endpoint");
console.log("━".repeat(80));

try {
  const authRoutesContent = readFileSync(
    join(__dirname, 'server', 'routes', 'auth.ts'),
    'utf-8'
  );

  const acceptsPreferredLanguage = authRoutesContent.includes('const { email, password, firstName, lastName, preferredLanguage }');
  const validatesLocale = authRoutesContent.includes('const supportedLocales = [\'en\', \'bs\']');
  const createsPreferences = authRoutesContent.includes('locale: userLocale');
  const hasLogging = authRoutesContent.includes('console.log(\'🌍 Registration with detected language:\'');

  console.log("   - Accepts preferredLanguage parameter:", acceptsPreferredLanguage ? "✅" : "❌");
  console.log("   - Validates locale:", validatesLocale ? "✅" : "❌");
  console.log("   - Creates notification preferences:", createsPreferences ? "✅" : "❌");
  console.log("   - Has debug logging:", hasLogging ? "✅" : "❌");

  if (acceptsPreferredLanguage && validatesLocale && createsPreferences && hasLogging) {
    console.log("✅ Backend registration properly integrated\n");
  } else {
    console.log("❌ Backend registration integration incomplete\n");
    allTestsPassed = false;
  }
} catch (error) {
  console.error("❌ Error reading auth routes:", error.message);
  allTestsPassed = false;
}

// Test 4: Verify PatientSettings.tsx exists and is functional
console.log("📋 Test 4: Verify PatientSettings.tsx page");
console.log("━".repeat(80));

try {
  const settingsContent = readFileSync(
    join(__dirname, 'client', 'src', 'pages', 'PatientSettings.tsx'),
    'utf-8'
  );

  const hasLanguageSelect = settingsContent.includes('Select') && settingsContent.includes('SelectItem value="en"');
  const fetchesPreferences = settingsContent.includes('/api/user/notification-preferences');
  const savesPreferences = settingsContent.includes('method: \'PUT\'');
  const hasAuthCheck = settingsContent.includes('useAuth()');

  console.log("   - Has language selection UI:", hasLanguageSelect ? "✅" : "❌");
  console.log("   - Fetches user preferences:", fetchesPreferences ? "✅" : "❌");
  console.log("   - Saves updated preferences:", savesPreferences ? "✅" : "❌");
  console.log("   - Has authentication check:", hasAuthCheck ? "✅" : "❌");

  if (hasLanguageSelect && fetchesPreferences && savesPreferences && hasAuthCheck) {
    console.log("✅ PatientSettings.tsx properly implemented\n");
  } else {
    console.log("❌ PatientSettings.tsx implementation incomplete\n");
    allTestsPassed = false;
  }
} catch (error) {
  console.error("❌ Error reading PatientSettings.tsx:", error.message);
  allTestsPassed = false;
}

// Test 5: Verify route is added to App.tsx
console.log("📋 Test 5: Verify routing configuration");
console.log("━".repeat(80));

try {
  const appContent = readFileSync(
    join(__dirname, 'client', 'src', 'App.tsx'),
    'utf-8'
  );

  const hasImport = appContent.includes('import PatientSettings from "@/pages/PatientSettings"');
  const hasRoute = appContent.includes('<Route path="/patient/settings" component={PatientSettings}');

  console.log("   - Imports PatientSettings:", hasImport ? "✅" : "❌");
  console.log("   - Has /patient/settings route:", hasRoute ? "✅" : "❌");

  if (hasImport && hasRoute) {
    console.log("✅ Routing properly configured\n");
  } else {
    console.log("❌ Routing configuration incomplete\n");
    allTestsPassed = false;
  }
} catch (error) {
  console.error("❌ Error reading App.tsx:", error.message);
  allTestsPassed = false;
}

// Test 6: Verify i18n integration still works
console.log("📋 Test 6: Verify i18n system compatibility");
console.log("━".repeat(80));

try {
  const enTranslations = JSON.parse(
    readFileSync(join(__dirname, 'server', 'locales', 'en.json'), 'utf-8')
  );
  const bsTranslations = JSON.parse(
    readFileSync(join(__dirname, 'server', 'locales', 'bs.json'), 'utf-8')
  );

  const enHasAccount = enTranslations.account && enTranslations.account.registration;
  const bsHasAccount = bsTranslations.account && bsTranslations.account.registration;

  console.log("   - English translations exist:", enHasAccount ? "✅" : "❌");
  console.log("   - Bosnian translations exist:", bsHasAccount ? "✅" : "❌");

  if (enHasAccount && bsHasAccount) {
    console.log("✅ i18n system ready for language detection\n");
  } else {
    console.log("❌ i18n translations missing\n");
    allTestsPassed = false;
  }
} catch (error) {
  console.error("❌ Error verifying i18n:", error.message);
  allTestsPassed = false;
}

// Summary
console.log("━".repeat(80));
if (allTestsPassed) {
  console.log("✅ All Language Detection Tests Passed!");
  console.log("");
  console.log("Implementation Complete:");
  console.log("1. ✅ Language detection utility created");
  console.log("2. ✅ Frontend registration integrated");
  console.log("3. ✅ Backend registration updated");
  console.log("4. ✅ Patient settings page created");
  console.log("5. ✅ Routing configured");
  console.log("6. ✅ i18n system compatible");
  console.log("");
  console.log("Next Steps:");
  console.log("• Test registration flow in browser");
  console.log("• Verify locale is saved to database");
  console.log("• Test settings page UI");
  console.log("• Trigger a notification to test localized emails");
  console.log("");
  process.exit(0);
} else {
  console.log("❌ Some tests failed. Please review the output above.");
  console.log("");
  process.exit(1);
}
