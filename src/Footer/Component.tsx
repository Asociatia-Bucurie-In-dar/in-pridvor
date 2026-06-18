import { Link } from '@/i18n/routing'
import Image from 'next/image'
import React from 'react'
import { SiFacebook, SiWhatsapp, SiYoutube } from 'react-icons/si'
import { getTranslations } from 'next-intl/server'

export async function Footer() {
  const currentYear = new Date().getFullYear()
  const t = await getTranslations('Common')

  const footerLinks = [
    {
      name: t('home'),
      href: '/',
    },
    {
      name: t('posts'),
      href: '/posts',
    },
    {
      name: t('about'),
      href: '/noi',
    },
  ]

  const navigation = [
    {
      name: 'Facebook',
      href: 'https://www.facebook.com/asociatiabucurieindar',
      icon: SiFacebook,
    },
    {
      name: 'YouTube',
      href: 'https://www.youtube.com/@BucurieinDar',
      icon: SiYoutube,
    },
    {
      name: 'WhatsApp',
      href: 'https://wa.me/40727786725',
      icon: SiWhatsapp,
    },
  ]

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <Link href="/" className="block">
              <Image
                src="/logomic.png"
                alt="Logo Bucurie in Dar"
                width={75}
                height={75}
                priority={false}
              />
            </Link>
            <div className="flex items-center gap-6">
              {navigation.map((item) => {
                const IconComponent = item.icon
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                    aria-label={item.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <IconComponent className="w-6 h-6" aria-hidden="true" />
                  </a>
                )
              })}
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-gray-600">
              &copy; {currentYear} Asociația Bucurie în Dar. Toate drepturile rezervate.
            </p>
            <div className="flex items-center gap-4">
              {footerLinks.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
