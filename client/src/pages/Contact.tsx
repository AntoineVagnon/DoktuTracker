import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  Clock,
  Building2,
  Globe
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export default function Contact() {
  const { t } = useTranslation('contact');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement contact form submission
    console.log('Contact form:', formData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto max-w-6xl px-4 py-16">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-8">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('contact.hero.back_to_home')}
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('contact.hero.title')}
          </h1>
          <p className="text-xl text-blue-100">
            {t('contact.hero.subtitle')}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('contact.form.title')}</CardTitle>
                <CardDescription>
                  {t('contact.form.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('contact.form.name_label')}</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t('contact.form.email_label')}</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">{t('contact.form.subject_label')}</Label>
                    <Input
                      id="subject"
                      required
                      placeholder={t('contact.form.subject_placeholder')}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">{t('contact.form.message_label')}</Label>
                    <Textarea
                      id="message"
                      required
                      placeholder={t('contact.form.message_placeholder')}
                      rows={8}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      {t('contact.form.privacy_notice')}{' '}
                      <Link href="/privacy">
                        <a className="text-blue-600 hover:underline">{t('contact.form.privacy_link')}</a>
                      </Link>.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    {t('contact.form.submit_button')}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* GDPR Notice */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">{t('contact.gdpr.title')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>{t('contact.gdpr.controller')}</p>
                <p>{t('contact.gdpr.purpose')}</p>
                <p>{t('contact.gdpr.legal_basis')}</p>
                <p>{t('contact.gdpr.retention')}</p>
                <p>{t('contact.gdpr.rights')}</p>
                <p>
                  {t('contact.gdpr.dpo_notice')}{' '}
                  <a href={`mailto:${t('contact.gdpr.dpo_email')}`} className="text-blue-600 hover:underline">
                    {t('contact.gdpr.dpo_email')}
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('contact.info.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t('contact.info.email_label')}</p>
                    <a href="mailto:contact@doktu.co" className="text-sm text-blue-600 hover:underline">
                      contact@doktu.co
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t('contact.info.phone_label')}</p>
                    <a href="tel:+33123456789" className="text-sm text-blue-600 hover:underline">
                      +33 1 23 45 67 89
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t('contact.info.address_label')}</p>
                    <p className="text-sm text-gray-600">
                      {t('contact.info.address_line1')}<br />
                      {t('contact.info.address_line2')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t('contact.info.hours_label')}</p>
                    <p className="text-sm text-gray-600">
                      {t('contact.info.hours_weekday')}<br />
                      {t('contact.info.hours_saturday')}<br />
                      {t('contact.info.hours_sunday')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t('contact.info.registration_label')}</p>
                    <p className="text-sm text-gray-600">
                      {t('contact.info.company_name')}<br />
                      {t('contact.info.siret')}<br />
                      {t('contact.info.vat')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t('contact.info.locations_label')}</p>
                    <p className="text-sm text-gray-600">
                      {t('contact.info.locations_desc_line1')}<br />
                      {t('contact.info.locations_desc_line2')}<br />
                      {t('contact.info.locations_desc_line3')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('contact.emergency.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {t('contact.emergency.description')}
                </p>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-red-600">{t('contact.emergency.services_title')}</p>
                  <div className="space-y-1 text-gray-700">
                    <p>🇫🇷 {t('contact.emergency.france')}</p>
                    <p>🇩🇪 {t('contact.emergency.germany')}</p>
                    <p>🇪🇸 {t('contact.emergency.spain')}</p>
                    <p>🇮🇹 {t('contact.emergency.italy')}</p>
                    <p>🇧🇪 {t('contact.emergency.belgium')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center">{t('contact.additional.title')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/support">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{t('contact.additional.support_title')}</h3>
                  <p className="text-sm text-gray-600">
                    {t('contact.additional.support_description')}
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/doctor-signup">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{t('contact.additional.doctors_title')}</h3>
                  <p className="text-sm text-gray-600">
                    {t('contact.additional.doctors_description')}
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/gdpr">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Globe className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{t('contact.additional.gdpr_title')}</h3>
                  <p className="text-sm text-gray-600">
                    {t('contact.additional.gdpr_description')}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
