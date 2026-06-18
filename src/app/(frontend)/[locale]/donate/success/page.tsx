import { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Donate')
  return {
    title: t('successMetaTitle'),
  }
}

export default async function DonateSuccessPage() {
  const t = await getTranslations('Donate')
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircleIcon className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4 font-playfair">{t('successHeading')}</h1>
        <p className="text-gray-600 mb-8">{t('successMessage')}</p>
        <Link
          href="/"
          className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  )
}
