import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export default function TermsOfService() {
  const { t } = useTranslation('terms_of_service');

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
                {t('terms_of_service.header.back_to_home')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8">{t('terms_of_service.header.title')}</h1>

          <div className="text-sm text-gray-600 mb-6">
            <p><strong>{t('terms_of_service.header.effective_date')}</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>{t('terms_of_service.header.last_updated')}</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>{t('terms_of_service.header.version')}</strong> 1.0</p>
          </div>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section1.title')}</h2>
              <div className="space-y-2">
                <p><strong>{t('terms_of_service.section1.company')}</strong> {t('terms_of_service.section1.company_value')}</p>
                <p><strong>{t('terms_of_service.section1.registration')}</strong> {t('terms_of_service.section1.registration_value')}</p>
                <p><strong>{t('terms_of_service.section1.address')}</strong> {t('terms_of_service.section1.address_value')}</p>
                <p><strong>{t('terms_of_service.section1.email')}</strong> {t('terms_of_service.section1.email_value')}</p>
                <p><strong>{t('terms_of_service.section1.phone')}</strong> {t('terms_of_service.section1.phone_value')}</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section2.title')}</h2>
              <p className="mb-4">
                {t('terms_of_service.section2.description')}
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section2.included.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('terms_of_service.section2.included.video')}</li>
                    <li>{t('terms_of_service.section2.included.messaging')}</li>
                    <li>{t('terms_of_service.section2.included.records')}</li>
                    <li>{t('terms_of_service.section2.included.scheduling')}</li>
                    <li>{t('terms_of_service.section2.included.membership')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section2.not_included.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('terms_of_service.section2.not_included.emergency')}</li>
                    <li>{t('terms_of_service.section2.not_included.in_person')}</li>
                    <li>{t('terms_of_service.section2.not_included.surgical')}</li>
                    <li>{t('terms_of_service.section2.not_included.controlled')}</li>
                    <li>{t('terms_of_service.section2.not_included.crisis')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section3.title')}</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section3.patient.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('terms_of_service.section3.patient.age')}</li>
                    <li>{t('terms_of_service.section3.patient.location')}</li>
                    <li>{t('terms_of_service.section3.patient.information')}</li>
                    <li>{t('terms_of_service.section3.patient.internet')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section3.professional.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('terms_of_service.section3.professional.license')}</li>
                    <li>{t('terms_of_service.section3.professional.insurance')}</li>
                    <li>{t('terms_of_service.section3.professional.standards')}</li>
                    <li>{t('terms_of_service.section3.professional.training')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-red-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <AlertTriangle className="h-6 w-6 mr-2 text-red-600" />
                {t('terms_of_service.section4.title')}
              </h2>

              <div className="space-y-4">
                <div className="bg-red-100 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2 text-red-800">{t('terms_of_service.section4.emergency.title')}</h3>
                  <p className="text-red-700 font-semibold">
                    {t('terms_of_service.section4.emergency.description')}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section4.diagnostic.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('terms_of_service.section4.diagnostic.remote')}</li>
                    <li>{t('terms_of_service.section4.diagnostic.physical')}</li>
                    <li>{t('terms_of_service.section4.diagnostic.in_person')}</li>
                    <li>{t('terms_of_service.section4.diagnostic.technology')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section4.guarantee.title')}</h3>
                  <p>
                    {t('terms_of_service.section4.guarantee.description')}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section5.title')}</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section5.accurate.title')}</h3>
                  <p className="mb-2">{t('terms_of_service.section5.accurate.agree')}</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('terms_of_service.section5.accurate.history')}</li>
                    <li>{t('terms_of_service.section5.accurate.symptoms')}</li>
                    <li>{t('terms_of_service.section5.accurate.medications')}</li>
                    <li>{t('terms_of_service.section5.accurate.updates')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section5.compliance.title')}</h3>
                  <p>
                    {t('terms_of_service.section5.compliance.description')}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section6.title')}</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section6.fees.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('terms_of_service.section6.fees.standard')}</li>
                    <li>{t('terms_of_service.section6.fees.specialist')}</li>
                    <li>{t('terms_of_service.section6.fees.displayed')}</li>
                    <li>{t('terms_of_service.section6.fees.vat')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section6.processing.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('terms_of_service.section6.processing.stripe')}</li>
                    <li>{t('terms_of_service.section6.processing.required')}</li>
                    <li>{t('terms_of_service.section6.processing.methods')}</li>
                    <li>{t('terms_of_service.section6.processing.compliant')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section6.refund.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('terms_of_service.section6.refund.full_24')}</li>
                    <li>{t('terms_of_service.section6.refund.half_2')}</li>
                    <li>{t('terms_of_service.section6.refund.no_refund')}</li>
                    <li>{t('terms_of_service.section6.refund.technical')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section7.title')}</h2>
              <p className="mb-4">
                {t('terms_of_service.section7.description')}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t('terms_of_service.section7.copy')}</li>
                <li>{t('terms_of_service.section7.trademarks')}</li>
                <li>{t('terms_of_service.section7.reverse')}</li>
                <li>{t('terms_of_service.section7.derivative')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section8.title')}</h2>
              <p className="mb-4">
                {t('terms_of_service.section8.description')}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t('terms_of_service.section8.article9')}</li>
                <li>{t('terms_of_service.section8.encrypted')}</li>
                <li>{t('terms_of_service.section8.access')}</li>
                <li>{t('terms_of_service.section8.rights')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section9.title')}</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section9.platform.title')}</h3>
                  <p className="mb-2">{t('terms_of_service.section9.platform.description')}</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('terms_of_service.section9.platform.access')}</li>
                    <li>{t('terms_of_service.section9.platform.functionality')}</li>
                    <li>{t('terms_of_service.section9.platform.security')}</li>
                    <li>{t('terms_of_service.section9.platform.credentials')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section9.medical.title')}</h3>
                  <p>
                    {t('terms_of_service.section9.medical.description')}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section9.user.title')}</h3>
                  <p>
                    {t('terms_of_service.section9.user.description')}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section10.title')}</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section10.user.title')}</h3>
                  <p>{t('terms_of_service.section10.user.description')}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section10.platform.title')}</h3>
                  <p className="mb-2">{t('terms_of_service.section10.platform.description')}</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('terms_of_service.section10.platform.violation')}</li>
                    <li>{t('terms_of_service.section10.platform.fraud')}</li>
                    <li>{t('terms_of_service.section10.platform.risk')}</li>
                    <li>{t('terms_of_service.section10.platform.payment')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section11.title')}</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section11.law.title')}</h3>
                  <p>{t('terms_of_service.section11.law.description')}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section11.resolution.title')}</h3>
                  <ol className="list-decimal pl-6 space-y-1">
                    <li>{t('terms_of_service.section11.resolution.first')}</li>
                    <li>{t('terms_of_service.section11.resolution.second')}</li>
                    <li>{t('terms_of_service.section11.resolution.final')}</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('terms_of_service.section11.odr.title')}</h3>
                  <p>
                    {t('terms_of_service.section11.odr.description')}
                    <a href="https://ec.europa.eu/consumers/odr" className="text-blue-600 underline ml-1">
                      ec.europa.eu/consumers/odr
                    </a>
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section12.title')}</h2>
              <p className="mb-4">{t('terms_of_service.section12.description')}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t('terms_of_service.section12.law')}</li>
                <li>{t('terms_of_service.section12.features')}</li>
                <li>{t('terms_of_service.section12.security')}</li>
              </ul>
              <p className="mt-4">
                {t('terms_of_service.section12.notification')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section13.title')}</h2>
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p><strong>{t('terms_of_service.section13.general')}</strong> {t('terms_of_service.section13.general_value')}</p>
                <p><strong>{t('terms_of_service.section13.legal')}</strong> {t('terms_of_service.section13.legal_value')}</p>
                <p><strong>{t('terms_of_service.section13.dpo')}</strong> {t('terms_of_service.section13.dpo_value')}</p>
                <p><strong>{t('terms_of_service.section13.address')}</strong> {t('terms_of_service.section13.address_value')}</p>
                <p><strong>{t('terms_of_service.section13.phone')}</strong> {t('terms_of_service.section13.phone_value')}</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section14.title')}</h2>
              <p>
                {t('terms_of_service.section14.description')}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('terms_of_service.section15.title')}</h2>
              <p>
                {t('terms_of_service.section15.description')}
              </p>
            </section>
          </div>

          <div className="mt-12 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600 mb-4">
              {t('terms_of_service.footer.acknowledgment')}
            </p>
            <p className="text-sm text-gray-600 italic">
              {t('terms_of_service.footer.compliance')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}