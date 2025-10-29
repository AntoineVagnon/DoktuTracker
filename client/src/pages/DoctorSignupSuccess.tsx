import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/Header';
import { CheckCircle2, Clock, Mail, FileText, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DoctorSignupSuccess() {
  const { t } = useTranslation('doctors');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Success Icon and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-green-100 p-6">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('doctors.success.title')}
          </h1>
          <p className="text-xl text-gray-600">
            {t('doctors.success.subtitle')}
          </p>
        </div>

        {/* Main Success Message */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              {t('doctors.success.email_card_title')}
            </CardTitle>
            <CardDescription>
              {t('doctors.success.email_card_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {t('doctors.success.review_alert')} <strong>{t('doctors.success.business_days')}</strong> {t('doctors.success.review_alert_suffix')}
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">{t('doctors.success.what_next_title')}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{t('doctors.success.step1_title')}</p>
                    <p className="text-sm text-blue-800">{t('doctors.success.step1_description')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{t('doctors.success.step2_title')}</p>
                    <p className="text-sm text-blue-800">{t('doctors.success.step2_description')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{t('doctors.success.step3_title')}</p>
                    <p className="text-sm text-blue-800">{t('doctors.success.step3_description')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">{t('doctors.success.step4_title')}</p>
                    <p className="text-sm text-blue-800">{t('doctors.success.step4_description')}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Required Documents Notice */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {t('doctors.success.documents_title')}
            </CardTitle>
            <CardDescription>
              {t('doctors.success.documents_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('doctors.success.doc_license_title')}</p>
                  <p className="text-sm text-gray-600">{t('doctors.success.doc_license_description')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('doctors.success.doc_identity_title')}</p>
                  <p className="text-sm text-gray-600">{t('doctors.success.doc_identity_description')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('doctors.success.doc_photo_title')}</p>
                  <p className="text-sm text-gray-600">{t('doctors.success.doc_photo_description')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('doctors.success.doc_iban_title')}</p>
                  <p className="text-sm text-gray-600">{t('doctors.success.doc_iban_description')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('doctors.success.help_title')}</CardTitle>
            <CardDescription>
              {t('doctors.success.help_description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              {t('doctors.success.help_text')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900 mb-1">{t('doctors.success.email_support')}</p>
                <a href="mailto:doctors@doktu.co" className="text-green-600 hover:text-green-700 underline">
                  doctors@doktu.co
                </a>
              </div>
              <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900 mb-1">{t('doctors.success.help_center')}</p>
                <Link href="/support">
                  <span className="text-green-600 hover:text-green-700 underline cursor-pointer">
                    {t('doctors.success.visit_support')}
                  </span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button variant="outline" size="lg">
              {t('doctors.success.return_home')}
            </Button>
          </Link>
          <Link href="/support">
            <Button size="lg" className="bg-green-600 hover:bg-green-700">
              {t('doctors.success.visit_help')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Additional Tips */}
        <div className="mt-12 text-center text-gray-600">
          <p className="text-sm">
            {t('doctors.success.no_email_text')}{' '}
            <a href="mailto:doctors@doktu.co" className="text-green-600 hover:text-green-700 underline">
              {t('doctors.success.contact_us')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
