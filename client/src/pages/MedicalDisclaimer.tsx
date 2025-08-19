import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Phone } from "lucide-react";
import { useEffect } from "react";

export default function MedicalDisclaimer() {
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
          <h1 className="text-3xl font-bold mb-8">Medical Disclaimer</h1>
          
          <div className="text-sm text-gray-600 mb-6">
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Version:</strong> 1.0</p>
          </div>

          {/* Emergency Warning */}
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-red-800 mb-3">
                  MEDICAL EMERGENCY WARNING
                </h2>
                <p className="text-red-700 font-semibold mb-3">
                  This platform is NOT for medical emergencies!
                </p>
                <p className="text-red-700 mb-3">
                  If you are experiencing a medical emergency, including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-red-700 mb-4">
                  <li>Chest pain or pressure</li>
                  <li>Difficulty breathing</li>
                  <li>Severe bleeding</li>
                  <li>Loss of consciousness</li>
                  <li>Severe allergic reactions</li>
                  <li>Thoughts of self-harm or suicide</li>
                  <li>Any life-threatening condition</li>
                </ul>
                <div className="bg-red-100 rounded-lg p-4 flex items-center justify-center">
                  <Phone className="h-6 w-6 mr-2 text-red-800" />
                  <span className="text-2xl font-bold text-red-800">
                    CALL EMERGENCY SERVICES: 112 (EU)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Nature of Telemedicine Services</h2>
              <p className="mb-4">
                The Doktu platform provides telemedicine services that allow patients to consult with 
                licensed healthcare professionals via video conferencing. These services are:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Supplementary to, not a replacement for, in-person medical care</li>
                <li>Limited by the inherent constraints of remote consultation</li>
                <li>Not suitable for all medical conditions or situations</li>
                <li>Subject to technological limitations and connectivity issues</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Limitations of Remote Consultations</h2>
              
              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <p className="font-semibold mb-2">Important: Remote consultations cannot provide:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Physical examinations</li>
                  <li>Immediate emergency treatment</li>
                  <li>Certain diagnostic tests</li>
                  <li>Surgical procedures</li>
                  <li>Administration of medications</li>
                </ul>
              </div>
              
              <p>
                Healthcare professionals may determine that your condition requires in-person evaluation 
                and will advise you accordingly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Medical Advice Disclaimer</h2>
              <p className="mb-4">
                All medical information, advice, and recommendations provided through the Doktu platform:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Are based solely on information provided during the consultation</li>
                <li>May not account for all aspects of your medical condition</li>
                <li>Should be considered in conjunction with your overall healthcare</li>
                <li>Do not guarantee specific medical outcomes</li>
                <li>May require verification through in-person examination</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. No Doctor-Patient Relationship Without Consultation</h2>
              <p className="mb-4">
                Important clarifications:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Browsing the platform does not establish a doctor-patient relationship</li>
                <li>A relationship is only established during paid consultations</li>
                <li>General information on the platform is not personalized medical advice</li>
                <li>Each consultation is independent unless continuity of care is arranged</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Prescription Medications</h2>
              
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="font-semibold mb-2">Prescription Policy:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Prescriptions are issued at the sole discretion of the healthcare provider</li>
                  <li>Controlled substances cannot be prescribed via telemedicine in many jurisdictions</li>
                  <li>Prescriptions must be filled at licensed pharmacies</li>
                  <li>Medication interactions and allergies must be disclosed</li>
                  <li>Follow-up may be required for certain medications</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. User Responsibilities</h2>
              <p className="mb-4">
                By using this platform, you acknowledge and agree to:
              </p>
              
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold mb-1">Provide Accurate Information</p>
                  <p className="text-sm">
                    You must provide complete, accurate, and truthful information about your medical history, 
                    symptoms, medications, and allergies.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold mb-1">Follow Medical Advice</p>
                  <p className="text-sm">
                    You are responsible for following the medical advice provided or seeking alternative care 
                    if you choose not to follow recommendations.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold mb-1">Seek Emergency Care When Needed</p>
                  <p className="text-sm">
                    You must seek immediate emergency care for any life-threatening or urgent medical conditions.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold mb-1">Maintain Primary Care</p>
                  <p className="text-sm">
                    Telemedicine consultations do not replace the need for a primary care physician and regular 
                    in-person medical care.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Technology Requirements and Risks</h2>
              <p className="mb-4">
                Telemedicine services depend on technology that may have limitations:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Internet connectivity issues may affect consultation quality</li>
                <li>Video/audio quality may impact diagnostic accuracy</li>
                <li>Technical failures may interrupt or prevent consultations</li>
                <li>Data security risks exist despite our security measures</li>
                <li>Platform availability is not guaranteed 24/7</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Privacy and Confidentiality</h2>
              <p className="mb-4">
                While we implement strong security measures:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Electronic communications carry inherent privacy risks</li>
                <li>You should ensure privacy during video consultations</li>
                <li>Family members or others present may hear confidential information</li>
                <li>Recording consultations without consent is prohibited</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Geographic Limitations</h2>
              <p className="mb-4">
                Important jurisdictional considerations:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Services are only available where legally permitted</li>
                <li>Doctors must be licensed in the appropriate jurisdiction</li>
                <li>Cross-border consultations may have legal restrictions</li>
                <li>Local laws and regulations apply to all services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. No Guarantee of Results</h2>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <p className="font-semibold mb-2">Medical Outcomes Disclaimer:</p>
                <p>
                  Medicine is not an exact science. No guarantee can be made regarding the accuracy of 
                  diagnoses, the effectiveness of treatments, or medical outcomes. Individual results may 
                  vary based on numerous factors including but not limited to:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Individual health conditions</li>
                  <li>Compliance with medical advice</li>
                  <li>Timeliness of treatment</li>
                  <li>Accuracy of information provided</li>
                  <li>Unknown or undisclosed medical factors</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Limitation of Liability</h2>
              <p className="mb-4">
                To the fullest extent permitted by law:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Doktu platform is not liable for medical malpractice of independent practitioners</li>
                <li>We do not guarantee specific medical outcomes</li>
                <li>We are not responsible for misuse of medical advice</li>
                <li>Technical failures do not constitute grounds for medical liability</li>
                <li>Users assume risks inherent in telemedicine services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Consent to Telemedicine</h2>
              <p className="mb-4">
                By using our telemedicine services, you consent to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Receiving medical care via electronic communications</li>
                <li>The limitations and risks of telemedicine</li>
                <li>The use of electronic transmission of medical information</li>
                <li>The possibility that consultations may be interrupted or unsuccessful</li>
                <li>Seeking alternative care if telemedicine is inappropriate</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Second Opinions</h2>
              <p className="mb-4">
                We strongly encourage patients to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Seek second opinions for significant medical decisions</li>
                <li>Consult with their primary care physician</li>
                <li>Obtain in-person evaluation when recommended</li>
                <li>Not rely solely on telemedicine for complex conditions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. Children and Minors</h2>
              <p className="mb-4">
                Special considerations for pediatric care:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Parental or guardian consent required for minors</li>
                <li>Parent/guardian must be present during consultations</li>
                <li>Some pediatric conditions require in-person evaluation</li>
                <li>Age-appropriate limitations apply to certain services</li>
              </ul>
            </section>

            <section className="bg-gray-100 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">15. Acknowledgment and Acceptance</h2>
              <p className="mb-4">
                By using the Doktu telemedicine platform, you acknowledge that you have read, understood, 
                and agree to this Medical Disclaimer. You understand that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Telemedicine has inherent limitations</li>
                <li>This service does not replace emergency medical care</li>
                <li>You are responsible for seeking appropriate medical care</li>
                <li>Medical outcomes cannot be guaranteed</li>
                <li>You assume the risks associated with telemedicine</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="mb-2">For questions about this medical disclaimer:</p>
                <p><strong>Email:</strong> medical@doktu.co</p>
                <p><strong>Phone:</strong> +33 1 23 45 67 89</p>
                <p><strong>Address:</strong> 123 Rue de la Santé, 75014 Paris, France</p>
              </div>
            </section>
          </div>

          <div className="mt-12 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-center font-bold text-red-800 text-lg">
              Remember: For any medical emergency, call 112 immediately!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}