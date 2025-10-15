import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export default function GDPRCompliance() {
  const { t } = useTranslation('gdpr');

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
          <div className="flex items-center mb-8">
            <Shield className="h-10 w-10 text-blue-600 mr-4" />
            <h1 className="text-3xl font-bold">{t('header.title')}</h1>
          </div>

          <div className="text-sm text-gray-600 mb-6">
            <p><strong>{t('header.last_updated')}</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>{t('header.version')}</strong> 1.0</p>
          </div>

          <div className="space-y-8 text-gray-700">
            <section className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">{t('commitment.title')}</h2>
              <p className="mb-4">
                {t('commitment.description')}
              </p>
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                <p>
                  {t('commitment.registration')}
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('legal_framework.title')}</h2>

              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-lg font-semibold mb-2">{t('legal_framework.article9.title')}</h3>
                  <p className="mb-2">{t('legal_framework.article9.description')}</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Article 9(2)(h):</strong> {t('legal_framework.article9.basis_h')}</li>
                    <li><strong>Article 9(2)(a):</strong> {t('legal_framework.article9.basis_a')}</li>
                    <li><strong>Article 9(2)(i):</strong> {t('legal_framework.article9.basis_i')}</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-lg font-semibold mb-2">{t('legal_framework.article6.title')}</h3>
                  <p className="mb-2">{t('legal_framework.article6.description')}</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Article 6(1)(b):</strong> {t('legal_framework.article6.basis_b')}</li>
                    <li><strong>Article 6(1)(c):</strong> {t('legal_framework.article6.basis_c')}</li>
                    <li><strong>Article 6(1)(a):</strong> {t('legal_framework.article6.basis_a')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('protection_measures.title')}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">{t('protection_measures.technical.title')}</h3>
                  <ul className="text-sm space-y-1">
                    <li>✓ {t('protection_measures.technical.encryption')}</li>
                    <li>✓ {t('protection_measures.technical.aes')}</li>
                    <li>✓ {t('protection_measures.technical.access')}</li>
                    <li>✓ {t('protection_measures.technical.audits')}</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">{t('protection_measures.organizational.title')}</h3>
                  <ul className="text-sm space-y-1">
                    <li>✓ {t('protection_measures.organizational.training')}</li>
                    <li>✓ {t('protection_measures.organizational.policies')}</li>
                    <li>✓ {t('protection_measures.organizational.restrictions')}</li>
                    <li>✓ {t('protection_measures.organizational.response')}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('dpia.title')}</h2>
              <p className="mb-4">
                {t('dpia.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('dpia.health_data')}</li>
                <li>{t('dpia.video')}</li>
                <li>{t('dpia.transfers')}</li>
                <li>{t('dpia.third_party')}</li>
                <li>{t('dpia.storage')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('rights.title')}</h2>
              <p className="mb-4">
                {t('rights.description')}
              </p>

              <div className="space-y-3">
                {[
                  { right: t('rights.access.name'), article: t('rights.access.article'), description: t('rights.access.description') },
                  { right: t('rights.rectification.name'), article: t('rights.rectification.article'), description: t('rights.rectification.description') },
                  { right: t('rights.erasure.name'), article: t('rights.erasure.article'), description: t('rights.erasure.description') },
                  { right: t('rights.restriction.name'), article: t('rights.restriction.article'), description: t('rights.restriction.description') },
                  { right: t('rights.portability.name'), article: t('rights.portability.article'), description: t('rights.portability.description') },
                  { right: t('rights.object.name'), article: t('rights.object.article'), description: t('rights.object.description') },
                  { right: t('rights.withdraw.name'), article: t('rights.withdraw.article'), description: t('rights.withdraw.description') },
                  { right: t('rights.complain.name'), article: t('rights.complain.article'), description: t('rights.complain.description') }
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
              <h2 className="text-2xl font-semibold mb-4">{t('processing.title')}</h2>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('processing.table.activity')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('processing.table.legal_basis')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('processing.table.retention')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.consultations.activity')}</td>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.consultations.basis')}</td>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.consultations.retention')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.payment.activity')}</td>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.payment.basis')}</td>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.payment.retention')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.account.activity')}</td>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.account.basis')}</td>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.account.retention')}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.marketing.activity')}</td>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.marketing.basis')}</td>
                      <td className="px-4 py-3 text-sm">{t('processing.rows.marketing.retention')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('breach.title')}</h2>
              <p className="mb-4">
                {t('breach.description')}
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t('breach.authority')}</li>
                <li>{t('breach.subject')}</li>
                <li>{t('breach.documentation')}</li>
                <li>{t('breach.testing')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('processors.title')}</h2>
              <p className="mb-4">
                {t('processors.description')}
              </p>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span><strong>Supabase:</strong> {t('processors.supabase')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span><strong>Zoom:</strong> {t('processors.zoom')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span><strong>Stripe:</strong> {t('processors.stripe')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span><strong>SendGrid:</strong> {t('processors.sendgrid')}</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('transfers.title')}</h2>
              <p className="mb-4">
                {t('transfers.description')}
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t('transfers.adequacy')}</li>
                <li>{t('transfers.scc')}</li>
                <li>{t('transfers.bcr')}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('dpo.title')}</h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="mb-4">
                  {t('dpo.description')}
                </p>
                <div className="space-y-2">
                  <p><strong>{t('dpo.officer')}</strong> {t('dpo.officer_name')}</p>
                  <p><strong>{t('dpo.email')}</strong> {t('dpo.email_address')}</p>
                  <p><strong>{t('dpo.phone')}</strong> {t('dpo.phone_number')}</p>
                  <p><strong>{t('dpo.address')}</strong> {t('dpo.address_value')}</p>
                </div>
                <p className="mt-4 text-sm">
                  {t('dpo.response_time')}
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">{t('authorities.title')}</h2>
              <p className="mb-4">
                {t('authorities.description')}
              </p>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold mb-2">{t('authorities.france_title')}</p>
                <p>{t('authorities.france_name')}</p>
                <p className="text-sm text-gray-600">{t('authorities.france_website')}</p>
              </div>

              <p className="mt-4 text-sm">
                {t('authorities.other')}
              </p>
            </section>

            <section className="bg-green-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">{t('certifications.title')}</h2>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>{t('certifications.gdpr')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>{t('certifications.iso')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>{t('certifications.hipaa')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>{t('certifications.eprivacy')}</span>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600 italic">
              {t('footer.note')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}