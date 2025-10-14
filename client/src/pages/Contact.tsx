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

export default function Contact() {
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
              Nazad na početnu
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Kontaktirajte nas
          </h1>
          <p className="text-xl text-blue-100">
            Rado ćemo odgovoriti na vaša pitanja
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Pošaljite nam poruku</CardTitle>
                <CardDescription>
                  Popunite obrazac ispod i odgovorit ćemo vam u najkraćem roku
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Ime i prezime *</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
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
                    <Label htmlFor="subject">Predmet *</Label>
                    <Input
                      id="subject"
                      required
                      placeholder="O čemu želite razgovarati?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Poruka *</Label>
                    <Textarea
                      id="message"
                      required
                      placeholder="Vaša poruka..."
                      rows={8}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>Napomena o privatnosti:</strong> Vaše osobne informacije su zaštićene u skladu sa RGPD
                      propisima. Koristit ćemo vaše podatke isključivo za odgovor na vaš upit.
                      Više informacija u našoj{' '}
                      <Link href="/privacy">
                        <a className="text-blue-600 hover:underline">politici privatnosti</a>
                      </Link>.
                    </p>
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Pošalji poruku
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* GDPR Notice */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Zaštita podataka (RGPD)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>
                  <strong>Odgovorni za obradu:</strong> Doktu Platform, registriran u Evropskoj Uniji
                </p>
                <p>
                  <strong>Svrha obrade:</strong> Odgovor na vaš upit i pružanje podrške
                </p>
                <p>
                  <strong>Pravna osnova:</strong> Vaša saglasnost (RGPD Član 6(1)(a))
                </p>
                <p>
                  <strong>Zadržavanje podataka:</strong> 12 mjeseci nakon posljednje komunikacije
                </p>
                <p>
                  <strong>Vaša prava:</strong> Pristup, ispravka, brisanje, ograničenje obrade, prenosivost podataka
                </p>
                <p>
                  Za više informacija ili za ostvarivanje vaših prava, kontaktirajte našeg DPO (Data Protection Officer) na{' '}
                  <a href="mailto:dpo@doktu.co" className="text-blue-600 hover:underline">dpo@doktu.co</a>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kontakt informacije</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Email</p>
                    <a href="mailto:contact@doktu.co" className="text-sm text-blue-600 hover:underline">
                      contact@doktu.co
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Telefon</p>
                    <a href="tel:+33123456789" className="text-sm text-blue-600 hover:underline">
                      +33 1 23 45 67 89
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Adresa</p>
                    <p className="text-sm text-gray-600">
                      123 Avenue de la Santé<br />
                      75001 Paris, Francuska
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Radno vrijeme</p>
                    <p className="text-sm text-gray-600">
                      Pon-Pet: 9:00 - 18:00<br />
                      Sub: 10:00 - 16:00<br />
                      Ned: Zatvoreno
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Registracija</p>
                    <p className="text-sm text-gray-600">
                      Društvo: Doktu SAS<br />
                      SIRET: 123 456 789 00010<br />
                      TVA: FR12345678900
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Lokacije</p>
                    <p className="text-sm text-gray-600">
                      Dostupno u cijeloj EU<br />
                      Regionalne kancelarije u<br />
                      Parizu, Berlinu i Madridu
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Potrebna hitna pomoć?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Ako imate medicinsku hitnost, molimo vas da ne koristite ovaj obrazac.
                </p>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-red-600">Hitne službe:</p>
                  <div className="space-y-1 text-gray-700">
                    <p>🇫🇷 Francuska: 15 (SAMU)</p>
                    <p>🇩🇪 Njemačka: 112</p>
                    <p>🇪🇸 Španija: 112</p>
                    <p>🇮🇹 Italija: 118</p>
                    <p>🇧🇪 Belgija: 112</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Drugi načini da stupite u kontakt</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/support">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Centar za podršku</h3>
                  <p className="text-sm text-gray-600">
                    Tehnička podrška i česta pitanja
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
                  <h3 className="font-semibold mb-2">Za doktore</h3>
                  <p className="text-sm text-gray-600">
                    Pridružite se našoj platformi kao doktor
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
                  <h3 className="font-semibold mb-2">RGPD zahtjevi</h3>
                  <p className="text-sm text-gray-600">
                    Pristup i upravljanje vašim podacima
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
