import { Link } from "wouter";
import { Facebook, Twitter, Linkedin, Shield, Lock } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function Footer() {
  const { t } = useTranslation('common');

  const quickLinks = [
    { nameKey: "footer.quick_links.find_doctors", href: "#doctors" },
    { nameKey: "footer.quick_links.how_it_works", href: "#how-it-works" },
    { nameKey: "footer.quick_links.pricing", href: "#pricing" },
    { nameKey: "footer.quick_links.for_doctors", href: "/doctor-signup" },
    { nameKey: "footer.quick_links.support", href: "/support" },
  ];

  const legalLinks = [
    { nameKey: "footer.legal.privacy", href: "/privacy" },
    { nameKey: "footer.legal.terms", href: "/terms" },
    { nameKey: "footer.legal.gdpr", href: "/gdpr" },
    { nameKey: "footer.legal.disclaimer", href: "/disclaimer" },
    { nameKey: "footer.legal.contact", href: "/contact" },
  ];

  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[hsl(207,100%,52%)] to-[hsl(225,99%,52%)]">
                <span className="text-lg font-bold text-white">D</span>
              </div>
              <span className="ml-3 text-xl font-bold">Doktu</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              {t('footer.description')}
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-[hsl(207,100%,52%)] transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-[hsl(207,100%,52%)] transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-[hsl(207,100%,52%)] transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6">{t('footer.quick_links.title')}</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.nameKey}>
                  <a href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {t(link.nameKey)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-6">{t('footer.legal.title')}</h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.nameKey}>
                  <a href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {t(link.nameKey)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            {t('footer.copyright')}
          </p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-gray-400 text-sm">{t('footer.badges.gdpr')}</span>
            </div>
            <div className="flex items-center">
              <Lock className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-gray-400 text-sm">{t('footer.badges.ssl')}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
