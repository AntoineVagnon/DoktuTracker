import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export default function PrivacyPolicy() {
  const { t } = useTranslation('privacy_policy');

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
            <p><strong>{t('header.effective_date')}</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>{t('header.last_updated')}</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>{t('header.version')}</strong> 1.0</p>
          </div>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section1.title')}</h2>
              <div className="space-y-2">
                <p><strong>{t('section1.controller')}</strong> {t('section1.controller_value')}</p>
                <p><strong>{t('section1.address')}</strong> {t('section1.address_value')}</p>
                <p><strong>{t('section1.email')}</strong> {t('section1.email_value')}</p>
                <p><strong>{t('section1.phone')}</strong> {t('section1.phone_value')}</p>
                <p><strong>{t('section1.dpo')}</strong> {t('section1.dpo_value')}</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section2.title')}</h2>
              <p className="mb-4">
                {t('section2.description')}
              </p>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">{t('section2.primary.title')}</h3>
                  <p className="mb-2">{t('section2.primary.description')}</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section2.primary.diagnosis')}</li>
                    <li>{t('section2.primary.provision')}</li>
                    <li>{t('section2.primary.management')}</li>
                    <li>{t('section2.primary.communication')}</li>
                  </ul>
                  <p className="mt-2 text-sm">
                    {t('section2.primary.note')}
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">{t('section2.secondary.title')}</h3>
                  <p className="mb-2">{t('section2.secondary.description')}</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section2.secondary.history')}</li>
                    <li>{t('section2.secondary.sharing')}</li>
                    <li>{t('section2.secondary.anonymized')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section3.title')}</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('section3.health.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section3.health.history')}</li>
                    <li>{t('section3.health.notes')}</li>
                    <li>{t('section3.health.prescriptions')}</li>
                    <li>{t('section3.health.treatment')}</li>
                    <li>{t('section3.health.vitals')}</li>
                    <li>{t('section3.health.documents')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('section3.personal.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section3.personal.identity')}</li>
                    <li>{t('section3.personal.contact')}</li>
                    <li>{t('section3.personal.payment')}</li>
                    <li>{t('section3.personal.credentials')}</li>
                    <li>{t('section3.personal.communications')}</li>
                    <li>{t('section3.personal.technical')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('section3.video.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section3.video.recordings')}</li>
                    <li>{t('section3.video.chat')}</li>
                    <li>{t('section3.video.screen')}</li>
                    <li>{t('section3.video.metadata')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section4.title')}</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('section4.healthcare.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section4.healthcare.consultations')}</li>
                    <li>{t('section4.healthcare.records')}</li>
                    <li>{t('section4.healthcare.prescriptions')}</li>
                    <li>{t('section4.healthcare.followup')}</li>
                    <li>{t('section4.healthcare.emergency')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('section4.service.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section4.service.account')}</li>
                    <li>{t('section4.service.payment')}</li>
                    <li>{t('section4.service.support')}</li>
                    <li>{t('section4.service.improvement')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('section4.legal.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section4.legal.reporting')}</li>
                    <li>{t('section4.legal.licensing')}</li>
                    <li>{t('section4.legal.tax')}</li>
                    <li>{t('section4.legal.law')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section5.title')}</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('section5.professionals.title')}</h3>
                  <p className="mb-2">{t('section5.professionals.description')}</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section5.professionals.doctors')}</li>
                    <li>{t('section5.professionals.specialists')}</li>
                    <li>{t('section5.professionals.emergency')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('section5.providers.title')}</h3>
                  <p className="mb-2">{t('section5.providers.description')}</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section5.providers.supabase')}</li>
                    <li>{t('section5.providers.zoom')}</li>
                    <li>{t('section5.providers.stripe')}</li>
                    <li>{t('section5.providers.cloud')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('section5.legal_req.title')}</h3>
                  <p className="mb-2">{t('section5.legal_req.description')}</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section5.legal_req.court')}</li>
                    <li>{t('section5.legal_req.regulatory')}</li>
                    <li>{t('section5.legal_req.law')}</li>
                    <li>{t('section5.legal_req.health')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section6.title')}</h2>
              <p className="mb-4">
                {t('section6.description')}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t('section6.adequacy')}</li>
                <li>{t('section6.scc')}</li>
                <li>{t('section6.bcr')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section7.title')}</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('section7.health.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section7.health.records')}</li>
                    <li>{t('section7.health.recordings')}</li>
                    <li>{t('section7.health.prescriptions')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('section7.personal.title')}</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>{t('section7.personal.account')}</li>
                    <li>{t('section7.personal.payment')}</li>
                    <li>{t('section7.personal.marketing')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section8.title')}</h2>

              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">{t('section8.access.title')}</h3>
                  <p>{t('section8.access.description')}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">{t('section8.rectification.title')}</h3>
                  <p>{t('section8.rectification.description')}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">{t('section8.erasure.title')}</h3>
                  <p>{t('section8.erasure.description')}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">{t('section8.restriction.title')}</h3>
                  <p>{t('section8.restriction.description')}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">{t('section8.portability.title')}</h3>
                  <p>{t('section8.portability.description')}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">{t('section8.objection.title')}</h3>
                  <p>{t('section8.objection.description')}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">{t('section8.withdrawal.title')}</h3>
                  <p>{t('section8.withdrawal.description')}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section9.title')}</h2>
              <p className="mb-4">{t('section9.description')}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t('section9.e2e')}</li>
                <li>{t('section9.aes')}</li>
                <li>{t('section9.mfa')}</li>
                <li>{t('section9.audits')}</li>
                <li>{t('section9.training')}</li>
                <li>{t('section9.incident')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section10.title')}</h2>
              <p className="mb-4">{t('section10.description')}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t('section10.authority')}</li>
                <li>{t('section10.subject')}</li>
                <li>{t('section10.documentation')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section11.title')}</h2>
              <p className="mb-4">{t('section11.description')}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t('section11.france')}</li>
                <li>{t('section11.germany')}</li>
                <li>{t('section11.other')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section12.title')}</h2>
              <p className="mb-4">{t('section12.description')}</p>
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p><strong>{t('section12.email')}</strong> {t('section12.email_value')}</p>
                <p><strong>{t('section12.dpo')}</strong> {t('section12.dpo_value')}</p>
                <p><strong>{t('section12.address')}</strong> {t('section12.address_value')}</p>
                <p><strong>{t('section12.phone')}</strong> {t('section12.phone_value')}</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('section13.title')}</h2>
              <p className="mb-4">{t('section13.description')}</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t('section13.notify')}</li>
                <li>{t('section13.post')}</li>
                <li>{t('section13.maintain')}</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
            <p className="italic">
              {t('footer.note')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}