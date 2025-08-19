import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold mb-8">Terms of Service - Doktu Telemedicine Platform</h1>
          
          <div className="text-sm text-gray-600 mb-6">
            <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Version:</strong> 1.0</p>
          </div>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Service Provider Information</h2>
              <div className="space-y-2">
                <p><strong>Company:</strong> Doktu SAS</p>
                <p><strong>Registration:</strong> RCS Paris B 123 456 789</p>
                <p><strong>Address:</strong> 123 Rue de la Santé, 75014 Paris, France</p>
                <p><strong>Email:</strong> legal@doktu.co</p>
                <p><strong>Phone:</strong> +33 1 23 45 67 89</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
              <p className="mb-4">
                Doktu provides a telemedicine platform connecting patients with licensed healthcare professionals 
                for remote medical consultations via secure video conferencing technology.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">2.1 Services Included</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Video consultations with verified healthcare professionals</li>
                    <li>Secure messaging with healthcare providers</li>
                    <li>Digital prescription services (where legally permitted)</li>
                    <li>Medical record storage and management</li>
                    <li>Appointment scheduling and management</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">2.2 Services Not Included</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Emergency medical services</li>
                    <li>In-person medical examinations</li>
                    <li>Surgical procedures</li>
                    <li>Prescription of controlled substances (where prohibited)</li>
                    <li>Mental health crisis intervention</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Eligibility and Registration</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">3.1 Patient Eligibility</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Must be 18 years or older (or have parental consent)</li>
                    <li>Must be located in a jurisdiction where telemedicine is legally permitted</li>
                    <li>Must provide accurate and complete registration information</li>
                    <li>Must have stable internet connection for video consultations</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">3.2 Healthcare Professional Requirements</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Must hold valid medical license in EU Member State</li>
                    <li>Must maintain professional indemnity insurance</li>
                    <li>Must comply with professional medical standards</li>
                    <li>Must complete platform training and certification</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-red-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <AlertTriangle className="h-6 w-6 mr-2 text-red-600" />
                4. Medical Disclaimer and Limitations
              </h2>
              
              <div className="space-y-4">
                <div className="bg-red-100 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 text-red-800">4.1 Not Emergency Services</h3>
                  <p className="text-red-700 font-semibold">
                    This platform is NOT intended for medical emergencies. 
                    For life-threatening conditions, contact emergency services immediately (112 in EU).
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">4.2 Diagnostic Limitations</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Remote consultations have inherent limitations</li>
                    <li>Physical examinations cannot be performed remotely</li>
                    <li>Certain conditions require in-person evaluation</li>
                    <li>Technology limitations may affect consultation quality</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">4.3 No Guarantee of Outcomes</h3>
                  <p>
                    Medical outcomes cannot be guaranteed. All medical advice is provided based on 
                    information available during consultation.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. User Responsibilities</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">5.1 Accurate Information</h3>
                  <p className="mb-2">You agree to:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Provide complete and accurate medical history</li>
                    <li>Report all symptoms truthfully</li>
                    <li>Disclose all medications and allergies</li>
                    <li>Update information as changes occur</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">5.2 Compliance with Medical Advice</h3>
                  <p>
                    You acknowledge that following medical advice is your responsibility. 
                    Non-compliance may result in adverse health outcomes.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Payment Terms</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">6.1 Consultation Fees</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Standard consultation fee: €35 per session</li>
                    <li>Specialist consultations may have different rates</li>
                    <li>Prices are displayed before booking</li>
                    <li>All prices include applicable VAT</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">6.2 Payment Processing</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Payments processed securely via Stripe</li>
                    <li>Payment required before consultation</li>
                    <li>Accepted methods: Credit/Debit cards, SEPA</li>
                    <li>PCI DSS compliant processing</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">6.3 Refund Policy</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Full refund if cancelled 24+ hours before appointment</li>
                    <li>50% refund if cancelled 2-24 hours before</li>
                    <li>No refund for cancellations within 2 hours</li>
                    <li>Full refund for technical failures on our end</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
              <p className="mb-4">
                All content, trademarks, and intellectual property on the platform remain the property of 
                Doktu or its licensors. Users may not:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Copy, modify, or distribute platform content</li>
                <li>Use trademarks without permission</li>
                <li>Reverse engineer platform technology</li>
                <li>Create derivative works</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Privacy and Data Protection</h2>
              <p className="mb-4">
                Your privacy is protected under our Privacy Policy, which complies with GDPR and 
                healthcare data protection regulations. Key points:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Health data processed under Article 9(2)(h) GDPR</li>
                <li>Data encrypted at rest and in transit</li>
                <li>Access restricted to authorized personnel</li>
                <li>Your rights under GDPR are fully respected</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Liability and Indemnification</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">9.1 Platform Liability</h3>
                  <p className="mb-2">Doktu's liability is limited to:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Providing access to the telemedicine platform</li>
                    <li>Ensuring technical functionality</li>
                    <li>Protecting data security and privacy</li>
                    <li>Verifying healthcare professional credentials</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">9.2 Medical Liability</h3>
                  <p>
                    Healthcare professionals are independently liable for medical advice and treatment. 
                    They maintain their own professional indemnity insurance.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">9.3 User Indemnification</h3>
                  <p>
                    You agree to indemnify Doktu against claims arising from your misuse of the platform 
                    or violation of these terms.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">10.1 User Termination</h3>
                  <p>You may terminate your account at any time by contacting support.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">10.2 Platform Termination</h3>
                  <p className="mb-2">We may terminate or suspend accounts for:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Violation of terms of service</li>
                    <li>Fraudulent or illegal activity</li>
                    <li>Risk to other users or the platform</li>
                    <li>Non-payment of fees</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Governing Law and Disputes</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">11.1 Governing Law</h3>
                  <p>These terms are governed by French law and EU regulations.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">11.2 Dispute Resolution</h3>
                  <ol className="list-decimal pl-6 space-y-1">
                    <li>First attempt: Direct negotiation</li>
                    <li>Second attempt: Mediation</li>
                    <li>Final resort: Courts of Paris, France</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">11.3 EU Online Dispute Resolution</h3>
                  <p>
                    EU residents may use the ODR platform: 
                    <a href="https://ec.europa.eu/consumers/odr" className="text-blue-600 underline ml-1">
                      ec.europa.eu/consumers/odr
                    </a>
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
              <p className="mb-4">We may update these terms to reflect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Changes in law or regulations</li>
                <li>New features or services</li>
                <li>Security or operational requirements</li>
              </ul>
              <p className="mt-4">
                Material changes will be notified 30 days in advance via email and platform notification.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Contact Information</h2>
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p><strong>General Inquiries:</strong> support@doktu.co</p>
                <p><strong>Legal Department:</strong> legal@doktu.co</p>
                <p><strong>Data Protection Officer:</strong> dpo@doktu.co</p>
                <p><strong>Address:</strong> 123 Rue de la Santé, 75014 Paris, France</p>
                <p><strong>Phone:</strong> +33 1 23 45 67 89</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Severability</h2>
              <p>
                If any provision of these terms is found invalid or unenforceable, the remaining provisions 
                will continue in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">15. Entire Agreement</h2>
              <p>
                These Terms of Service, together with our Privacy Policy and other legal documents, 
                constitute the entire agreement between you and Doktu regarding the use of our platform.
              </p>
            </section>
          </div>

          <div className="mt-12 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600 mb-4">
              By using the Doktu platform, you acknowledge that you have read, understood, and agree to be 
              bound by these Terms of Service.
            </p>
            <p className="text-sm text-gray-600 italic">
              These terms comply with EU consumer protection laws, telemedicine regulations, and the 
              Directive 2011/24/EU on patients' rights in cross-border healthcare.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}