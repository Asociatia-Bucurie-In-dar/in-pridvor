import Link from 'next/link'
import Image from 'next/image'
import React from 'react'
import { SiFacebook, SiWhatsapp, SiYoutube } from 'react-icons/si'

export async function Footer() {
  const currentYear = new Date().getFullYear()

  const navigation = [
    {
      name: 'Facebook',
      href: 'https://www.facebook.com/asociatiabucurieindar',
      icon: SiFacebook,
    },
    {
      name: 'WhatsApp',
      href: 'https://wa.me/40727786725',
      icon: SiWhatsapp,
    },
    {
      name: 'YouTube',
      href: 'https://www.youtube.com/@BucurieinDar',
      icon: SiYoutube,
    },
  ]

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex flex-col gap-4">
            <Link href="/" className="block">
              <Image
                src="/logomic.png"
                alt="Logo Bucurie in Dar"
                width={75}
                height={75}
                priority={false}
              />
            </Link>
            <p className="text-sm text-gray-600">
              &copy; {currentYear} Asociația Bucurie în Dar. Toate drepturile rezervate.
            </p>
          </div>

          <div className="flex items-center gap-6">
            {navigation.map((item) => {
              const IconComponent = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label={item.name}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconComponent className="w-6 h-6" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
