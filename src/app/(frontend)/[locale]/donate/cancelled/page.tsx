'use client'

import Link from 'next/link'
import { XCircleIcon } from '@heroicons/react/24/solid'
import { useTranslations } from 'next-intl'

export default function DonateCancelledPage() {
  const t = useTranslations('Donate')
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <XCircleIcon className="h-16 w-16 text-gray-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4 font-playfair">{t('cancelledHeading')}</h1>
        <p className="text-gray-600 mb-8">{t('cancelledMessage')}</p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {t('backHome')}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    </div>
  )
}
