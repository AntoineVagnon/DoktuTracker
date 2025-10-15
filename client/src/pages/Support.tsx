import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/Header';
import {
  ArrowLeft,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  HelpCircle,
  FileText,
  Video,
  CreditCard
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export default function Support() {
  const { t } = useTranslation('support');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement support ticket submission
    console.log('Support request:', formData);
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
              {t('support.back_home')}
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('support.title')}
          </h1>
          <p className="text-xl text-blue-100">
            {t('support.subtitle')}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* Contact Methods */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <Mail className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold mb-2">{t('support.contact_methods.email.title')}</h3>
              <p className="text-sm text-gray-600 mb-3">{t('support.contact_methods.email.description')}</p>
              <a href={`mailto:${t('support.contact_methods.email.address')}`} className="text-blue-600 hover:underline text-sm">
                {t('support.contact_methods.email.address')}
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Phone className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold mb-2">{t('support.contact_methods.phone.title')}</h3>
              <p className="text-sm text-gray-600 mb-3">{t('support.contact_methods.phone.description')}</p>
              <a href={`tel:${t('support.contact_methods.phone.number')}`} className="text-blue-600 hover:underline text-sm">
                {t('support.contact_methods.phone.number')}
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <MessageSquare className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold mb-2">{t('support.contact_methods.chat.title')}</h3>
              <p className="text-sm text-gray-600 mb-3">{t('support.contact_methods.chat.description')}</p>
              <Button variant="outline" size="sm" className="text-blue-600">
                {t('support.contact_methods.chat.button')}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('support.form.title')}</CardTitle>
                <CardDescription>
                  {t('support.form.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('support.form.name_label')} *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t('support.form.email_label')} *</Label>
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
                    <Label htmlFor="category">{t('support.form.category_label')} *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('support.form.category_placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">{t('support.form.categories.technical')}</SelectItem>
                        <SelectItem value="billing">{t('support.form.categories.billing')}</SelectItem>
                        <SelectItem value="appointment">{t('support.form.categories.appointment')}</SelectItem>
                        <SelectItem value="account">{t('support.form.categories.account')}</SelectItem>
                        <SelectItem value="medical">{t('support.form.categories.medical')}</SelectItem>
                        <SelectItem value="other">{t('support.form.categories.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">{t('support.form.subject_label')} *</Label>
                    <Input
                      id="subject"
                      required
                      placeholder={t('support.form.subject_placeholder')}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">{t('support.form.message_label')} *</Label>
                    <Textarea
                      id="message"
                      required
                      placeholder={t('support.form.message_placeholder')}
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    {t('support.form.submit_button')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('support.faq.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/faq#appointments">
                  <Button variant="outline" className="w-full justify-start">
                    <Video className="h-4 w-4 mr-2" />
                    {t('support.faq.appointments_link')}
                  </Button>
                </Link>

                <Link href="/faq#payments">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t('support.faq.payments_link')}
                  </Button>
                </Link>

                <Link href="/faq#technical">
                  <Button variant="outline" className="w-full justify-start">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    {t('support.faq.technical_link')}
                  </Button>
                </Link>

                <Link href="/faq">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    {t('support.faq.all_link')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('support.hours.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('support.hours.monday_friday')}</span>
                    <span className="font-medium">9:00 - 18:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('support.hours.saturday')}</span>
                    <span className="font-medium">10:00 - 16:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('support.hours.sunday')}</span>
                    <span className="font-medium">{t('support.hours.closed')}</span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex items-center text-blue-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="text-xs">{t('support.hours.email_24_7')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Help Articles */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">{t('support.articles.title')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <Video className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">{t('support.articles.video_consultation.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('support.articles.video_consultation.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <CreditCard className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">{t('support.articles.subscription.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('support.articles.subscription.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <FileText className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">{t('support.articles.medical_records.title')}</h3>
                <p className="text-sm text-gray-600">
                  {t('support.articles.medical_records.description')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
