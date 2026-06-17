'use client'

import Link from 'next/link'
import { XCircleIcon } from '@heroicons/react/24/solid'

export default function DonateCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <XCircleIcon className="h-16 w-16 text-gray-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4 font-playfair">Donație anulată</h1>
        <p className="text-gray-600 mb-8">
          Nu s-a efectuat nicio plată. Dacă ai întâmpinat probleme, te rugăm să ne contactezi.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Înapoi acasă
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Încearcă din nou
          </button>
        </div>
      </div>
    </div>
  )
}
