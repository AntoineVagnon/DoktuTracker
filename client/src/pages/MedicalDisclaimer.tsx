import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Phone } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export default function MedicalDisclaimer() {
  const { t } = useTranslation('medical_disclaimer');

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
                {t('header.back_to_home')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8">{t('header.title')}</h1>

          <div className="text-sm text-gray-600 mb-6">
            <p><strong>{t('header.last_updated')}</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>{t('header.version')}</strong> 1.0</p>
          </div>

          {/* Emergency Warning */}
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-red-800 mb-3">
                  {t('emergency_warning.title')}
                </h2>
                <p className="text-red-700 font-semibold mb-3">
                  {t('emergency_warning.not_for_emergencies')}
                </p>
                <p className="text-red-700 mb-3">
                  {t('emergency_warning.experiencing_emergency')}
                </p>
                <ul className="list-disc pl-6 space-y-1 text-red-700 mb-4">
                  <li>{t('emergency_warning.symptoms.chest_pain')}</li>
                  <li>{t('emergency_warning.symptoms.breathing')}</li>
                  <li>{t('emergency_warning.symptoms.bleeding')}</li>
                  <li>{t('emergency_warning.symptoms.consciousness')}</li>
                  <li>{t('emergency_warning.symptoms.allergic')}</li>
                  <li>{t('emergency_warning.symptoms.self_harm')}</li>
                  <li>{t('emergency_warning.symptoms.life_threatening')}</li>
                </ul>
                <div className="bg-red-100 rounded-lg p-4 flex items-center justify-center">
                  <Phone className="h-6 w-6 mr-2 text-red-800" />
                  <span className="text-2xl font-bold text-red-800">
                    {t('emergency_warning.call_emergency')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section1.title')}</h2>
              <p className="mb-4">
                {t('section1.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('section1.items.supplementary')}</li>
                <li>{t('section1.items.limited')}</li>
                <li>{t('section1.items.not_suitable')}</li>
                <li>{t('section1.items.technology')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section2.title')}</h2>

              <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                <p className="font-semibold mb-2">{t('section2.important_label')}</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>{t('section2.limitations.physical')}</li>
                  <li>{t('section2.limitations.emergency')}</li>
                  <li>{t('section2.limitations.diagnostic')}</li>
                  <li>{t('section2.limitations.surgical')}</li>
                  <li>{t('section2.limitations.medications')}</li>
                </ul>
              </div>

              <p>
                {t('section2.may_require')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section3.title')}</h2>
              <p className="mb-4">
                {t('section3.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('section3.items.based_on')}</li>
                <li>{t('section3.items.may_not_account')}</li>
                <li>{t('section3.items.consider')}</li>
                <li>{t('section3.items.no_guarantee')}</li>
                <li>{t('section3.items.verification')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section4.title')}</h2>
              <p className="mb-4">
                {t('section4.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('section4.items.browsing')}</li>
                <li>{t('section4.items.paid')}</li>
                <li>{t('section4.items.general_info')}</li>
                <li>{t('section4.items.independent')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section5.title')}</h2>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="font-semibold mb-2">{t('section5.policy_label')}</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>{t('section5.items.discretion')}</li>
                  <li>{t('section5.items.controlled')}</li>
                  <li>{t('section5.items.licensed')}</li>
                  <li>{t('section5.items.interactions')}</li>
                  <li>{t('section5.items.followup')}</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section6.title')}</h2>
              <p className="mb-4">
                {t('section6.description')}
              </p>

              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold mb-1">{t('section6.accurate.title')}</p>
                  <p className="text-sm">
                    {t('section6.accurate.description')}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold mb-1">{t('section6.follow.title')}</p>
                  <p className="text-sm">
                    {t('section6.follow.description')}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold mb-1">{t('section6.emergency.title')}</p>
                  <p className="text-sm">
                    {t('section6.emergency.description')}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-semibold mb-1">{t('section6.primary.title')}</p>
                  <p className="text-sm">
                    {t('section6.primary.description')}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section7.title')}</h2>
              <p className="mb-4">
                {t('section7.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('section7.items.connectivity')}</li>
                <li>{t('section7.items.quality')}</li>
                <li>{t('section7.items.failures')}</li>
                <li>{t('section7.items.security')}</li>
                <li>{t('section7.items.availability')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section8.title')}</h2>
              <p className="mb-4">
                {t('section8.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('section8.items.risks')}</li>
                <li>{t('section8.items.ensure')}</li>
                <li>{t('section8.items.family')}</li>
                <li>{t('section8.items.recording')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section9.title')}</h2>
              <p className="mb-4">
                {t('section9.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('section9.items.available')}</li>
                <li>{t('section9.items.licensed')}</li>
                <li>{t('section9.items.crossborder')}</li>
                <li>{t('section9.items.laws')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section10.title')}</h2>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <p className="font-semibold mb-2">{t('section10.disclaimer_label')}</p>
                <p>
                  {t('section10.description')}
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>{t('section10.factors.conditions')}</li>
                  <li>{t('section10.factors.compliance')}</li>
                  <li>{t('section10.factors.timeliness')}</li>
                  <li>{t('section10.factors.accuracy')}</li>
                  <li>{t('section10.factors.unknown')}</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section11.title')}</h2>
              <p className="mb-4">
                {t('section11.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('section11.items.malpractice')}</li>
                <li>{t('section11.items.outcomes')}</li>
                <li>{t('section11.items.misuse')}</li>
                <li>{t('section11.items.technical')}</li>
                <li>{t('section11.items.risks')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section12.title')}</h2>
              <p className="mb-4">
                {t('section12.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('section12.items.electronic')}</li>
                <li>{t('section12.items.limitations')}</li>
                <li>{t('section12.items.transmission')}</li>
                <li>{t('section12.items.interruption')}</li>
                <li>{t('section12.items.alternative')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section13.title')}</h2>
              <p className="mb-4">
                {t('section13.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('section13.items.seek')}</li>
                <li>{t('section13.items.consult')}</li>
                <li>{t('section13.items.evaluation')}</li>
                <li>{t('section13.items.not_rely')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section14.title')}</h2>
              <p className="mb-4">
                {t('section14.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('section14.items.consent')}</li>
                <li>{t('section14.items.present')}</li>
                <li>{t('section14.items.conditions')}</li>
                <li>{t('section14.items.limitations')}</li>
              </ul>
            </section>

            <section className="bg-gray-100 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">{t('section15.title')}</h2>
              <p className="mb-4">
                {t('section15.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('section15.items.limitations')}</li>
                <li>{t('section15.items.not_replace')}</li>
                <li>{t('section15.items.responsible')}</li>
                <li>{t('section15.items.no_guarantee')}</li>
                <li>{t('section15.items.assume')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('contact.title')}</h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="mb-2">{t('contact.description')}</p>
                <p><strong>{t('contact.email')}</strong> {t('contact.email_value')}</p>
                <p><strong>{t('contact.phone')}</strong> {t('contact.phone_value')}</p>
                <p><strong>{t('contact.address')}</strong> {t('contact.address_value')}</p>
              </div>
            </section>
          </div>

          <div className="mt-12 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-center font-bold text-red-800 text-lg">
              {t('final_reminder')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}