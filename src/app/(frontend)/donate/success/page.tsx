import { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

export const metadata: Metadata = {
  title: 'Mulțumim pentru donație!',
}

export default function DonateSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircleIcon className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4 font-playfair">Mulțumim!</h1>
        <p className="text-gray-600 mb-8">
          Donația ta susține jurnalismul local independent. Îți mulțumim pentru încredere!
        </p>
        <Link
          href="/"
          className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Înapoi la pagina principală
        </Link>
      </div>
    </div>
  )
}
