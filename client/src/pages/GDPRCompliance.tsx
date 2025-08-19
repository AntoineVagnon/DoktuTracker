import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, CheckCircle } from "lucide-react";
import { useEffect } from "react";

export default function GDPRCompliance() {
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
          <div className="flex items-center mb-8">
            <Shield className="h-10 w-10 text-blue-600 mr-4" />
            <h1 className="text-3xl font-bold">GDPR Compliance Statement</h1>
          </div>
          
          <div className="text-sm text-gray-600 mb-6">
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Version:</strong> 1.0</p>
          </div>

          <div className="space-y-8 text-gray-700">
            <section className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">Our Commitment to GDPR</h2>
              <p className="mb-4">
                Doktu is fully committed to compliance with the General Data Protection Regulation (GDPR) 
                (EU) 2016/679. As a healthcare platform processing special category data under Article 9, 
                we implement the highest standards of data protection.
              </p>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                <p>
                  We are registered with the French Data Protection Authority (CNIL) and comply with all 
                  EU data protection regulations.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Legal Framework</h2>
              
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-lg font-semibold mb-2">GDPR Article 9 - Processing of Health Data</h3>
                  <p className="mb-2">We process health data under the following legal bases:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Article 9(2)(h):</strong> Healthcare provision and management</li>
                    <li><strong>Article 9(2)(a):</strong> Explicit consent where required</li>
                    <li><strong>Article 9(2)(i):</strong> Public health interests</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-lg font-semibold mb-2">GDPR Article 6 - Lawfulness of Processing</h3>
                  <p className="mb-2">General data processing is based on:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Article 6(1)(b):</strong> Contract performance</li>
                    <li><strong>Article 6(1)(c):</strong> Legal obligations</li>
                    <li><strong>Article 6(1)(a):</strong> Consent for marketing</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Protection Measures</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Technical Measures</h3>
                  <ul className="text-sm space-y-1">
                    <li>✓ End-to-end encryption</li>
                    <li>✓ AES-256 data encryption</li>
                    <li>✓ Secure access controls</li>
                    <li>✓ Regular security audits</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Organizational Measures</h3>
                  <ul className="text-sm space-y-1">
                    <li>✓ Staff training programs</li>
                    <li>✓ Data protection policies</li>
                    <li>✓ Access restrictions</li>
                    <li>✓ Incident response plans</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Protection Impact Assessment (DPIA)</h2>
              <p className="mb-4">
                We have conducted a comprehensive DPIA for our telemedicine platform, addressing:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Processing of health data at large scale</li>
                <li>Use of video consultation technology</li>
                <li>Cross-border data transfers within EU</li>
                <li>Integration with third-party services (Zoom, Stripe)</li>
                <li>Long-term storage of medical records</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Subject Rights</h2>
              <p className="mb-4">
                We fully support all rights granted under GDPR:
              </p>
              
              <div className="space-y-3">
                {[
                  { right: "Right to Access", article: "Article 15", description: "Request copies of your personal data" },
                  { right: "Right to Rectification", article: "Article 16", description: "Correct inaccurate personal data" },
                  { right: "Right to Erasure", article: "Article 17", description: "Request deletion of your data" },
                  { right: "Right to Restriction", article: "Article 18", description: "Limit processing of your data" },
                  { right: "Right to Portability", article: "Article 20", description: "Transfer data to another provider" },
                  { right: "Right to Object", article: "Article 21", description: "Object to certain processing" },
                  { right: "Right to Withdraw Consent", article: "Article 7", description: "Withdraw consent at any time" },
                  { right: "Right to Complain", article: "Article 77", description: "Lodge complaint with supervisory authority" }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-3 bg-gray-50 p-3 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{item.right} ({item.article})</p>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Processing Activities</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Legal Basis
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Retention
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm">Medical consultations</td>
                      <td className="px-4 py-3 text-sm">Article 9(2)(h)</td>
                      <td className="px-4 py-3 text-sm">10 years</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm">Payment processing</td>
                      <td className="px-4 py-3 text-sm">Article 6(1)(b)</td>
                      <td className="px-4 py-3 text-sm">7 years</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm">Account management</td>
                      <td className="px-4 py-3 text-sm">Article 6(1)(b)</td>
                      <td className="px-4 py-3 text-sm">Active + 3 years</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm">Marketing communications</td>
                      <td className="px-4 py-3 text-sm">Article 6(1)(a)</td>
                      <td className="px-4 py-3 text-sm">Until withdrawn</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Breach Response</h2>
              <p className="mb-4">
                Our incident response plan ensures compliance with GDPR breach notification requirements:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Supervisory authority notification within 72 hours (Article 33)</li>
                <li>Data subject notification for high-risk breaches (Article 34)</li>
                <li>Comprehensive breach documentation and remediation</li>
                <li>Regular security testing and vulnerability assessments</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Third-Party Processors</h2>
              <p className="mb-4">
                All our data processors are GDPR-compliant and bound by data processing agreements:
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span><strong>Supabase:</strong> Database hosting (EU servers)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span><strong>Zoom:</strong> Video consultations (GDPR-compliant)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span><strong>Stripe:</strong> Payment processing (PCI DSS Level 1)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span><strong>SendGrid:</strong> Email communications (GDPR-compliant)</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">International Data Transfers</h2>
              <p className="mb-4">
                All data processing occurs within the European Economic Area (EEA). 
                Any transfers outside the EEA are protected by:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>EU Commission adequacy decisions</li>
                <li>Standard Contractual Clauses (SCCs)</li>
                <li>Binding Corporate Rules (BCRs)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Our Data Protection Officer</h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="mb-4">
                  For any GDPR-related inquiries or to exercise your data protection rights:
                </p>
                <div className="space-y-2">
                  <p><strong>Data Protection Officer:</strong> Jean-Pierre Martin</p>
                  <p><strong>Email:</strong> dpo@doktu.co</p>
                  <p><strong>Phone:</strong> +33 1 23 45 67 89</p>
                  <p><strong>Address:</strong> 123 Rue de la Santé, 75014 Paris, France</p>
                </div>
                <p className="mt-4 text-sm">
                  Response time: We aim to respond to all requests within 30 days as required by GDPR.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Supervisory Authorities</h2>
              <p className="mb-4">
                You have the right to lodge a complaint with your national data protection authority:
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold mb-2">France (Lead Authority):</p>
                <p>Commission Nationale de l'Informatique et des Libertés (CNIL)</p>
                <p className="text-sm text-gray-600">www.cnil.fr</p>
              </div>
              
              <p className="mt-4 text-sm">
                For other EU member states, please contact your national data protection authority.
              </p>
            </section>

            <section className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">Compliance Certifications</h2>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>GDPR Compliant since May 25, 2018</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>ISO 27001 Information Security (In Progress)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>HIPAA Compliant Infrastructure</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>ePrivacy Directive Compliant</span>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600 italic">
              This GDPR Compliance Statement is regularly reviewed and updated to ensure ongoing compliance 
              with evolving data protection regulations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}