import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8">Privacy Policy - Doktu Telemedicine Platform</h1>
          
          <div className="text-sm text-gray-600 mb-6">
            <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Version:</strong> 1.0</p>
          </div>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Controller Information</h2>
              <div className="space-y-2">
                <p><strong>Data Controller:</strong> Doktu SAS</p>
                <p><strong>Address:</strong> 123 Rue de la Santé, 75014 Paris, France</p>
                <p><strong>Email:</strong> privacy@doktu.co</p>
                <p><strong>Phone:</strong> +33 1 23 45 67 89</p>
                <p><strong>Data Protection Officer:</strong> dpo@doktu.co</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Legal Basis for Processing Health Data</h2>
              <p className="mb-4">
                Under the General Data Protection Regulation (GDPR) Article 9, we process your health data based on the following legal grounds:
              </p>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Primary Legal Basis: Article 9(2)(h) - Healthcare Provision</h3>
                  <p className="mb-2">We process your health data as it is necessary for:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Medical diagnosis and assessment</li>
                    <li>Provision of healthcare and medical treatment</li>
                    <li>Management of healthcare services</li>
                    <li>Communication with healthcare professionals</li>
                  </ul>
                  <p className="mt-2 text-sm">
                    This processing is conducted under contract with licensed healthcare professionals who are subject to professional secrecy obligations under EU and Member State law.
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Secondary Legal Basis: Article 9(2)(a) - Explicit Consent</h3>
                  <p className="mb-2">Where required, we obtain your explicit consent for processing health data for specific purposes including:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Storing consultation history for continuity of care</li>
                    <li>Sharing data with specialists for referrals</li>
                    <li>Using anonymized data for service improvement</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Data We Collect</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">3.1 Health Data (Special Category Data)</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Medical history and symptoms</li>
                    <li>Consultation notes and diagnoses</li>
                    <li>Prescription information</li>
                    <li>Treatment recommendations</li>
                    <li>Vital signs and measurements</li>
                    <li>Medical images or documents you provide</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">3.2 Personal Data</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Name, date of birth, gender</li>
                    <li>Contact information (email, phone, address)</li>
                    <li>Payment information</li>
                    <li>Account credentials</li>
                    <li>Communication records</li>
                    <li>Technical data (IP address, browser information)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">3.3 Video Consultation Data</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Video and audio recordings (if consented)</li>
                    <li>Chat messages during consultations</li>
                    <li>Screen sharing content</li>
                    <li>Technical metadata from Zoom integration</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. How We Use Your Data</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">4.1 Healthcare Purposes (Article 9(2)(h))</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Facilitating video consultations with doctors</li>
                    <li>Maintaining medical records for continuity of care</li>
                    <li>Enabling prescription management</li>
                    <li>Supporting follow-up care</li>
                    <li>Emergency medical situations</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">4.2 Service Management (Article 6(1)(b))</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Account management and authentication</li>
                    <li>Payment processing</li>
                    <li>Customer support</li>
                    <li>Service improvement and optimization</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">4.3 Legal Compliance (Article 6(1)(c))</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Regulatory reporting requirements</li>
                    <li>Professional licensing compliance</li>
                    <li>Tax and accounting obligations</li>
                    <li>Law enforcement requests</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data Sharing and Recipients</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">5.1 Healthcare Professionals</h3>
                  <p className="mb-2">Your health data is shared with:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>The doctor(s) you consult with</li>
                    <li>Specialist doctors for referrals (with your consent)</li>
                    <li>Emergency services (in life-threatening situations)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">5.2 Service Providers</h3>
                  <p className="mb-2">We share limited data with:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Supabase:</strong> Database hosting and management (EU-based servers)</li>
                    <li><strong>Zoom:</strong> Video consultation services (GDPR-compliant configuration)</li>
                    <li><strong>Stripe:</strong> Payment processing (PCI DSS compliant)</li>
                    <li><strong>Cloud storage providers:</strong> For secure data backup (EU-based)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">5.3 Legal Requirements</h3>
                  <p className="mb-2">We may disclose data when required by:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Court orders or legal proceedings</li>
                    <li>Regulatory authorities</li>
                    <li>Law enforcement agencies</li>
                    <li>Public health authorities</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. International Data Transfers</h2>
              <p className="mb-4">
                All health data is processed and stored within the European Union. Any transfers outside the EU are conducted under appropriate safeguards:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Adequacy decisions by the European Commission</li>
                <li>Standard Contractual Clauses (SCCs)</li>
                <li>Binding Corporate Rules (BCRs)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">7.1 Health Data</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Active medical records:</strong> Retained for 10 years after last consultation</li>
                    <li><strong>Consultation recordings:</strong> Deleted after 30 days unless consent given for longer retention</li>
                    <li><strong>Prescription data:</strong> Retained as required by national pharmacy regulations</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">7.2 Personal Data</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Account data:</strong> Retained while account is active plus 3 years</li>
                    <li><strong>Payment data:</strong> Retained for 7 years for tax compliance</li>
                    <li><strong>Marketing data:</strong> Retained until consent is withdrawn</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Your Rights Under GDPR</h2>
              
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">8.1 Access Rights (Article 15)</h3>
                  <p>You have the right to obtain confirmation of data processing and access to your personal data.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">8.2 Rectification Rights (Article 16)</h3>
                  <p>You can request correction of inaccurate or incomplete personal data.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">8.3 Erasure Rights (Article 17)</h3>
                  <p>You can request deletion of your data, subject to legal retention requirements.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">8.4 Restriction Rights (Article 18)</h3>
                  <p>You can request restriction of processing in certain circumstances.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">8.5 Portability Rights (Article 20)</h3>
                  <p>You can request transfer of your data to another healthcare provider.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">8.6 Objection Rights (Article 21)</h3>
                  <p>You can object to processing based on legitimate interests.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">8.7 Consent Withdrawal</h3>
                  <p>You can withdraw consent at any time for processing based on consent.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Security Measures</h2>
              <p className="mb-4">We implement appropriate technical and organizational measures:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>End-to-end encryption for video consultations</li>
                <li>AES-256 encryption for data at rest</li>
                <li>Multi-factor authentication for healthcare professionals</li>
                <li>Regular security audits and penetration testing</li>
                <li>Staff training on data protection</li>
                <li>Incident response procedures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Data Breach Notification</h2>
              <p className="mb-4">In case of a data breach affecting your rights and freedoms:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>We will notify the supervisory authority within 72 hours</li>
                <li>We will inform you without undue delay if high risk is involved</li>
                <li>We will document all breaches and remedial actions taken</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Supervisory Authority</h2>
              <p className="mb-4">You have the right to lodge a complaint with your national data protection authority:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>France:</strong> Commission Nationale de l'Informatique et des Libertés (CNIL)</li>
                <li><strong>Germany:</strong> Federal Commissioner for Data Protection and Freedom of Information</li>
                <li><strong>Other EU countries:</strong> Your national data protection authority</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
              <p className="mb-4">For any privacy-related questions or to exercise your rights:</p>
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p><strong>Email:</strong> privacy@doktu.co</p>
                <p><strong>Data Protection Officer:</strong> dpo@doktu.co</p>
                <p><strong>Address:</strong> 123 Rue de la Santé, 75014 Paris, France</p>
                <p><strong>Phone:</strong> +33 1 23 45 67 89</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Changes to This Policy</h2>
              <p className="mb-4">We may update this privacy policy to reflect changes in our practices or legal requirements. We will:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Notify you of material changes via email</li>
                <li>Post updates on our website</li>
                <li>Maintain previous versions for reference</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
            <p className="italic">
              This privacy policy complies with GDPR, ePrivacy Directive, and applicable national healthcare data protection laws.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}