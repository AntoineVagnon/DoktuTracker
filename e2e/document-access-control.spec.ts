import { test, expect, Page } from '@playwright/test';

/**
 * End-to-End Testing Protocol: Document Access Control
 *
 * Security Requirements:
 * 1. Patients can only access their own documents
 * 2. Doctors can only access documents attached to their appointments
 * 3. Doctors cannot access documents from other doctors' appointments
 * 4. Documents in patient library are only visible to the patient
 * 5. No patient can access another patient's documents
 *
 * GDPR Compliance:
 * - All document access must be authenticated
 * - Audit logs should record access attempts
 * - Unauthorized access should return 403 Forbidden
 */

// Test Users Configuration
const TEST_USERS = {
  patient1: {
    email: 'patient1-test@doktu.co',
    password: 'TestPatient1!',
    firstName: 'Alice',
    lastName: 'Johnson'
  },
  patient2: {
    email: 'patient2-test@doktu.co',
    password: 'TestPatient2!',
    firstName: 'Bob',
    lastName: 'Smith'
  },
  doctor1: {
    email: 'doctor1-test@doktu.co',
    password: 'TestDoctor1!',
    firstName: 'Dr. Emily',
    lastName: 'Rodriguez'
  },
  doctor2: {
    email: 'doctor2-test@doktu.co',
    password: 'TestDoctor2!',
    firstName: 'Dr. Michael',
    lastName: 'Chen'
  }
};

// Helper Functions
async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.click('text=Sign In');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('/dashboard');
}

async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await page.waitForURL('/');
}

async function uploadDocument(page: Page, filePath: string, appointmentId?: number) {
  if (appointmentId) {
    // Upload to specific appointment
    await page.goto(`/dashboard?appointment=${appointmentId}`);
    await page.click('text=Upload Docs');
  } else {
    // Upload to library
    await page.click('[data-testid="document-library"]');
  }

  await page.setInputFiles('input[type="file"]', filePath);
  await expect(page.locator('text=Document uploaded')).toBeVisible({ timeout: 10000 });
}

async function createAppointment(page: Page, doctorName: string): Promise<number> {
  await page.goto('/dashboard');
  await page.click('text=Book Appointment');
  await page.click(`text=${doctorName}`);

  // Select next available slot
  const dateSlot = page.locator('[data-testid="available-slot"]').first();
  await dateSlot.click();

  await page.click('button:has-text("Confirm Booking")');
  await expect(page.locator('text=Appointment booked')).toBeVisible();

  // Extract appointment ID from URL or response
  const appointmentId = await page.evaluate(() => {
    const match = window.location.href.match(/appointment=(\d+)/);
    return match ? parseInt(match[1]) : null;
  });

  return appointmentId!;
}

// Test Suite
test.describe('Document Access Control - Security & GDPR Compliance', () => {

  test.describe('Patient 1 - Document Upload and Library', () => {

    test('Patient 1 can upload document to library', async ({ page }) => {
      await login(page, TEST_USERS.patient1.email, TEST_USERS.patient1.password);

      // Upload test document
      await uploadDocument(page, './test-fixtures/test-medical-report.pdf');

      // Verify document appears in library
      await page.click('[data-testid="document-library"]');
      await expect(page.locator('text=test-medical-report.pdf')).toBeVisible();

      await logout(page);
    });

    test('Patient 1 can download their own library document', async ({ page }) => {
      await login(page, TEST_USERS.patient1.email, TEST_USERS.patient1.password);

      await page.click('[data-testid="document-library"]');

      // Initiate download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-document"]:first-of-type');
      const download = await downloadPromise;

      // Verify download succeeded
      expect(download.suggestedFilename()).toContain('.pdf');

      await logout(page);
    });

    test('Patient 1 can delete their own document', async ({ page }) => {
      await login(page, TEST_USERS.patient1.email, TEST_USERS.patient1.password);

      await page.click('[data-testid="document-library"]');
      await page.click('[title="Delete forever"]:first-of-type');

      // Confirm deletion in custom dialog
      await expect(page.locator('text=Delete Document')).toBeVisible();
      await page.click('button:has-text("Delete")');

      // Verify document was deleted
      await expect(page.locator('text=Document deleted')).toBeVisible();

      await logout(page);
    });
  });

  test.describe('Patient 1 - Appointment with Doctor 1', () => {
    let appointmentId: number;

    test('Patient 1 books appointment with Doctor 1', async ({ page }) => {
      await login(page, TEST_USERS.patient1.email, TEST_USERS.patient1.password);

      appointmentId = await createAppointment(page, TEST_USERS.doctor1.firstName);
      expect(appointmentId).toBeGreaterThan(0);

      await logout(page);
    });

    test('Patient 1 uploads document to appointment with Doctor 1', async ({ page }) => {
      await login(page, TEST_USERS.patient1.email, TEST_USERS.patient1.password);

      // Navigate to appointment
      await page.goto(`/dashboard`);
      await page.click(`[data-appointment-id="${appointmentId}"]`);

      // Open document panel
      await page.click('text=Upload Docs');

      // Upload file
      await page.setInputFiles('input[id="appointment-file-input"]', './test-fixtures/patient1-xray.pdf');
      await expect(page.locator('text=Document uploaded')).toBeVisible({ timeout: 10000 });

      // Verify document appears in appointment files
      await expect(page.locator('text=patient1-xray.pdf')).toBeVisible();

      await logout(page);
    });

    test('Doctor 1 can access documents attached to their appointment', async ({ page }) => {
      await login(page, TEST_USERS.doctor1.email, TEST_USERS.doctor1.password);

      // Navigate to appointment
      await page.goto('/doctor/appointments');
      await page.click(`[data-appointment-id="${appointmentId}"]`);

      // Open documents panel
      await page.click('[data-testid="document-library"]');

      // Verify document is visible
      await expect(page.locator('text=patient1-xray.pdf')).toBeVisible();

      // Verify Doctor 1 can download the document
      const downloadPromise = page.waitForEvent('download');
      await page.click('[title="Download"]:has-text("patient1-xray.pdf")');
      const download = await downloadPromise;
      expect(download).toBeTruthy();

      await logout(page);
    });

    test('Doctor 2 CANNOT access documents from Doctor 1 appointment', async ({ page }) => {
      await login(page, TEST_USERS.doctor2.email, TEST_USERS.doctor2.password);

      // Try to navigate directly to appointment
      await page.goto(`/doctor/appointments/${appointmentId}`);

      // Should either redirect or show access denied
      await expect(page.locator('text=Access denied')).toBeVisible();

      // Try direct API access to document
      const response = await page.request.get(`/api/documents/${appointmentId}`);
      expect(response.status()).toBe(403);

      await logout(page);
    });

    test('Doctor 1 CANNOT access Patient 1 library documents', async ({ page }) => {
      await login(page, TEST_USERS.doctor1.email, TEST_USERS.doctor1.password);

      // Doctors should not see patient library documents even for their patients
      await page.goto('/doctor/appointments');
      await page.click(`[data-appointment-id="${appointmentId}"]`);

      // Open documents - should only show appointment documents, not library
      await page.click('[data-testid="document-library"]');

      // Count documents - should only be appointment documents
      const docCount = await page.locator('[data-testid="document-item"]').count();

      // Should only see documents explicitly attached to appointment
      expect(docCount).toBeLessThanOrEqual(1); // Only the xray we uploaded

      await logout(page);
    });
  });

  test.describe('Patient 2 - Cannot Access Patient 1 Documents', () => {

    test('Patient 2 cannot access Patient 1 library documents', async ({ page }) => {
      await login(page, TEST_USERS.patient2.email, TEST_USERS.patient2.password);

      await page.click('[data-testid="document-library"]');

      // Verify Patient 2 library is empty or has different documents
      const hasPatient1Docs = await page.locator('text=patient1-xray.pdf').isVisible();
      expect(hasPatient1Docs).toBe(false);

      await logout(page);
    });

    test('Patient 2 cannot access Patient 1 documents via direct API call', async ({ page }) => {
      await login(page, TEST_USERS.patient2.email, TEST_USERS.patient2.password);

      // Get Patient 1's document ID (from previous test)
      // Try to access it directly
      const response = await page.request.get('/api/documents/download/patient1-document-id');

      // Should return 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(response.status());

      await logout(page);
    });

    test('Patient 2 cannot access Patient 1 appointment documents', async ({ page }) => {
      await login(page, TEST_USERS.patient2.email, TEST_USERS.patient2.password);

      // Try to directly access Patient 1's appointment
      const appointmentId = 1; // Patient 1's appointment ID
      await page.goto(`/dashboard?appointment=${appointmentId}`);

      // Should not be able to see or access documents
      await expect(page.locator('text=Access denied')).toBeVisible();

      await logout(page);
    });
  });

  test.describe('Patient 2 - Appointment with Doctor 2', () => {
    let appointmentId: number;

    test('Patient 2 books appointment with Doctor 2', async ({ page }) => {
      await login(page, TEST_USERS.patient2.email, TEST_USERS.patient2.password);

      appointmentId = await createAppointment(page, TEST_USERS.doctor2.firstName);
      expect(appointmentId).toBeGreaterThan(0);

      await logout(page);
    });

    test('Patient 2 uploads document to appointment with Doctor 2', async ({ page }) => {
      await login(page, TEST_USERS.patient2.email, TEST_USERS.patient2.password);

      await page.goto(`/dashboard`);
      await page.click(`[data-appointment-id="${appointmentId}"]`);
      await page.click('text=Upload Docs');

      await page.setInputFiles('input[id="appointment-file-input"]', './test-fixtures/patient2-bloodwork.pdf');
      await expect(page.locator('text=Document uploaded')).toBeVisible({ timeout: 10000 });

      await logout(page);
    });

    test('Doctor 2 can access their appointment documents only', async ({ page }) => {
      await login(page, TEST_USERS.doctor2.email, TEST_USERS.doctor2.password);

      await page.goto('/doctor/appointments');
      await page.click(`[data-appointment-id="${appointmentId}"]`);
      await page.click('[data-testid="document-library"]');

      // Should see Patient 2's document
      await expect(page.locator('text=patient2-bloodwork.pdf')).toBeVisible();

      // Should NOT see Patient 1's documents
      const hasPatient1Docs = await page.locator('text=patient1-xray.pdf').isVisible();
      expect(hasPatient1Docs).toBe(false);

      await logout(page);
    });

    test('Doctor 1 CANNOT access Doctor 2 appointment documents', async ({ page }) => {
      await login(page, TEST_USERS.doctor1.email, TEST_USERS.doctor1.password);

      // Try to access Doctor 2's appointment
      await page.goto(`/doctor/appointments/${appointmentId}`);
      await expect(page.locator('text=Access denied')).toBeVisible();

      // Try direct API call
      const response = await page.request.get(`/api/documents/${appointmentId}`);
      expect(response.status()).toBe(403);

      await logout(page);
    });
  });

  test.describe('Cross-Document Access Prevention', () => {

    test('Patient 1 attaches library document to Doctor 1 appointment', async ({ page }) => {
      await login(page, TEST_USERS.patient1.email, TEST_USERS.patient1.password);

      // Upload to library first
      await page.click('[data-testid="document-library"]');
      await page.setInputFiles('input[id="library-file-input"]', './test-fixtures/patient1-insurance.pdf');
      await expect(page.locator('text=Document uploaded')).toBeVisible();

      // Navigate to appointment
      await page.goto('/dashboard');
      await page.click('[data-appointment-id="1"]'); // Doctor 1 appointment
      await page.click('[data-testid="document-library"]');

      // Attach library document to appointment
      await page.click('[title="Attach to appointment"]:has-text("patient1-insurance.pdf")');
      await expect(page.locator('text=Document attached')).toBeVisible();

      // Verify it now appears in appointment files
      const appointmentSection = page.locator('[data-testid="appointment-documents"]');
      await expect(appointmentSection.locator('text=patient1-insurance.pdf')).toBeVisible();

      await logout(page);
    });

    test('Doctor 1 can access attached library document', async ({ page }) => {
      await login(page, TEST_USERS.doctor1.email, TEST_USERS.doctor1.password);

      await page.goto('/doctor/appointments/1');
      await page.click('[data-testid="document-library"]');

      // Should now see the attached insurance document
      await expect(page.locator('text=patient1-insurance.pdf')).toBeVisible();

      // Can download it
      const downloadPromise = page.waitForEvent('download');
      await page.click('[title="Download"]:has-text("patient1-insurance.pdf")');
      const download = await downloadPromise;
      expect(download).toBeTruthy();

      await logout(page);
    });

    test('Patient 1 imports appointment document to library', async ({ page }) => {
      await login(page, TEST_USERS.patient1.email, TEST_USERS.patient1.password);

      await page.goto('/dashboard');
      await page.click('[data-appointment-id="1"]');
      await page.click('[data-testid="document-library"]');

      // Import appointment document to library
      const appointmentDoc = page.locator('[data-testid="appointment-documents"]').locator('text=patient1-xray.pdf');
      await appointmentDoc.locator('[title="Import to library for reuse"]').click();
      await expect(page.locator('text=Document imported')).toBeVisible();

      // Navigate to library and verify it's there
      await page.click('[data-testid="attach-from-library"]');
      await expect(page.locator('text=patient1-xray.pdf')).toBeVisible();

      await logout(page);
    });
  });

  test.describe('API Security - Direct Access Tests', () => {

    test('Unauthenticated user cannot access any documents', async ({ request }) => {
      const responses = await Promise.all([
        request.get('/api/documents'),
        request.get('/api/documents/1'),
        request.get('/api/download/any-doc-id'),
      ]);

      responses.forEach(response => {
        expect(response.status()).toBe(401);
      });
    });

    test('Patient cannot access other patient documents via API', async ({ page }) => {
      await login(page, TEST_USERS.patient2.email, TEST_USERS.patient2.password);

      // Get Patient 1's document ID from database
      const patient1DocId = 'ced9012f-7b5f-46d9-8959-fc7634a410a7'; // Example ID

      // Try to download Patient 1's document
      const response = await page.request.get(`/api/download/${patient1DocId}`);
      expect([403, 404]).toContain(response.status());

      await logout(page);
    });

    test('Doctor cannot access documents from non-assigned appointments', async ({ page }) => {
      await login(page, TEST_USERS.doctor2.email, TEST_USERS.doctor2.password);

      // Try to access Doctor 1's appointment documents
      const doctor1AppointmentId = 1;
      const response = await page.request.get(`/api/documents/${doctor1AppointmentId}`);
      expect(response.status()).toBe(403);

      await logout(page);
    });
  });

  test.describe('GDPR Compliance - Data Deletion', () => {

    test('Patient can permanently delete appointment document', async ({ page }) => {
      await login(page, TEST_USERS.patient1.email, TEST_USERS.patient1.password);

      await page.goto('/dashboard');
      await page.click('[data-appointment-id="1"]');
      await page.click('[data-testid="document-library"]');

      // Delete document
      await page.click('[title="Delete permanently"]:first-of-type');
      await page.click('button:has-text("Delete")');
      await expect(page.locator('text=Document deleted')).toBeVisible();

      await logout(page);
    });

    test('Deleted document is no longer accessible by doctor', async ({ page }) => {
      await login(page, TEST_USERS.doctor1.email, TEST_USERS.doctor1.password);

      await page.goto('/doctor/appointments/1');
      await page.click('[data-testid="document-library"]');

      // Previously visible document should be gone
      const deletedDoc = await page.locator('text=patient1-xray.pdf').isVisible();
      expect(deletedDoc).toBe(false);

      await logout(page);
    });

    test('Deleted document returns 404 on direct access', async ({ page }) => {
      await login(page, TEST_USERS.patient1.email, TEST_USERS.patient1.password);

      const deletedDocId = 'deleted-doc-id';
      const response = await page.request.get(`/api/download/${deletedDocId}`);
      expect(response.status()).toBe(404);

      await logout(page);
    });
  });
});

// Manual Testing Checklist
test.describe('Manual Testing Protocol', () => {
  test.skip('Manual Test Checklist', async () => {
    console.log(`
    ========================================
    MANUAL TESTING PROTOCOL
    ========================================

    SETUP:
    □ Create 2 patient accounts
    □ Create 2 doctor accounts
    □ Prepare test documents (PDF, images)

    PATIENT 1 TESTS:
    □ Login as Patient 1
    □ Upload document to library
    □ Verify document appears in library
    □ Download document from library
    □ Book appointment with Doctor 1
    □ Upload document to Doctor 1 appointment
    □ Attach library document to Doctor 1 appointment
    □ Verify both documents appear in appointment
    □ Logout

    DOCTOR 1 TESTS:
    □ Login as Doctor 1
    □ Navigate to Patient 1 appointment
    □ Verify you can see appointment documents
    □ Download appointment documents
    □ Verify you CANNOT see Patient 1's library documents
    □ Logout

    PATIENT 2 TESTS:
    □ Login as Patient 2
    □ Verify you CANNOT see Patient 1's library
    □ Try to access Patient 1's appointment URL directly
    □ Verify access is denied
    □ Book appointment with Doctor 2
    □ Upload document to Doctor 2 appointment
    □ Logout

    DOCTOR 2 TESTS:
    □ Login as Doctor 2
    □ Navigate to Patient 2 appointment
    □ Verify you can see Patient 2's documents
    □ Try to access Patient 1/Doctor 1 appointment
    □ Verify access is denied
    □ Logout

    CROSS-ACCESS TESTS:
    □ Login as Doctor 1
    □ Try to access Doctor 2's appointment URL
    □ Verify 403 Forbidden
    □ Try direct API call to Doctor 2's documents
    □ Verify 403 Forbidden
    □ Logout

    DELETION TESTS:
    □ Login as Patient 1
    □ Delete a library document
    □ Verify it's removed from library
    □ Delete an appointment document
    □ Logout
    □ Login as Doctor 1
    □ Verify deleted document is not accessible
    □ Logout

    SECURITY TESTS:
    □ Open browser DevTools Network tab
    □ Try to copy document download URL
    □ Open in incognito/private window
    □ Verify unauthorized access fails
    □ Try to manipulate document IDs in URL
    □ Verify all attempts return 401/403

    GDPR COMPLIANCE:
    □ Check Railway logs for access audit trail
    □ Verify all document requests are logged
    □ Verify unauthorized attempts are logged
    □ Confirm Supabase Storage bucket is private
    □ Confirm documents are stored in user folders

    ========================================
    `);
  });
});
