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

export default function Support() {
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
              Nazad na početnu
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Centar za podršku
          </h1>
          <p className="text-xl text-blue-100">
            Tu smo da vam pomognemo 24/7
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* Contact Methods */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="pt-6">
              <Mail className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold mb-2">Email podrška</h3>
              <p className="text-sm text-gray-600 mb-3">Odgovaramo u roku od 24h</p>
              <a href="mailto:support@doktu.co" className="text-blue-600 hover:underline text-sm">
                support@doktu.co
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Phone className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold mb-2">Telefonska podrška</h3>
              <p className="text-sm text-gray-600 mb-3">Pon-Pet 9:00-18:00</p>
              <a href="tel:+33123456789" className="text-blue-600 hover:underline text-sm">
                +33 1 23 45 67 89
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <MessageSquare className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-semibold mb-2">Live Chat</h3>
              <p className="text-sm text-gray-600 mb-3">Dostupno 24/7</p>
              <Button variant="outline" size="sm" className="text-blue-600">
                Započnite chat
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Pošaljite nam poruku</CardTitle>
                <CardDescription>
                  Popunite obrazac ispod i odgovorit ćemo vam što prije
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
                    <Label htmlFor="category">Kategorija *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Odaberite kategoriju" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Tehnička podrška</SelectItem>
                        <SelectItem value="billing">Plaćanje i računi</SelectItem>
                        <SelectItem value="appointment">Termini</SelectItem>
                        <SelectItem value="account">Račun</SelectItem>
                        <SelectItem value="medical">Medicinska pitanja</SelectItem>
                        <SelectItem value="other">Ostalo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Predmet *</Label>
                    <Input
                      id="subject"
                      required
                      placeholder="Ukratko opišite problem"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Poruka *</Label>
                    <Textarea
                      id="message"
                      required
                      placeholder="Detaljno opišite vaš problem ili pitanje..."
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Pošalji poruku
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Često postavljana pitanja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/faq#appointments">
                  <Button variant="outline" className="w-full justify-start">
                    <Video className="h-4 w-4 mr-2" />
                    Kako zakazati termin?
                  </Button>
                </Link>

                <Link href="/faq#payments">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Opcije plaćanja
                  </Button>
                </Link>

                <Link href="/faq#technical">
                  <Button variant="outline" className="w-full justify-start">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Tehnički problemi
                  </Button>
                </Link>

                <Link href="/faq">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Sva pitanja
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Radno vrijeme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ponedjeljak - Petak:</span>
                    <span className="font-medium">9:00 - 18:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subota:</span>
                    <span className="font-medium">10:00 - 16:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nedjelja:</span>
                    <span className="font-medium">Zatvoreno</span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex items-center text-blue-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="text-xs">Email podrška 24/7</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Help Articles */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Popularni članci pomoći</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <Video className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">Kako se pripremiti za video konsultaciju</h3>
                <p className="text-sm text-gray-600">
                  Savjeti za uspješnu online konsultaciju sa vašim doktorom
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <CreditCard className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">Upravljanje pretplatom</h3>
                <p className="text-sm text-gray-600">
                  Kako nadograditi, promijeniti ili otkazati vašu pretplatu
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <FileText className="h-8 w-8 text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">Pristup medicinskoj dokumentaciji</h3>
                <p className="text-sm text-gray-600">
                  Gdje pronaći i preuzeti vaše medicinske zapise
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
