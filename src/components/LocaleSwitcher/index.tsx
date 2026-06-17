'use client'

import { useLocale, useTranslations } from 'next-intl'
import { routing, usePathname, useRouter } from '@/i18n/routing'
import { useParams } from 'next/navigation'

export const LocaleSwitcher = () => {
  const t = useTranslations('Common')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  const onLocaleChange = (newLocale: string) => {
    router.replace(
      // @ts-expect-error -- pathname is checked by defineRouting
      { pathname, params },
      { locale: newLocale }
    )
  }

  return (
    <div className="flex gap-2">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => onLocaleChange(l)}
          className={`px-2 py-1 text-xs rounded ${
            locale === l ? 'bg-yellow-400 text-black font-bold' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          } transition-colors uppercase`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
