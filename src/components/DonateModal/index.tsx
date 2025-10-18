'use client'

import { Fragment, useState, useEffect } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { XMarkIcon, CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline'
import { HeartIcon, BuildingLibraryIcon, CreditCardIcon } from '@heroicons/react/24/solid'
import { motion } from 'framer-motion'

interface DonateModalProps {
  isOpen: boolean
  onClose: () => void
}

type PaymentMethod = 'iban' | 'stripe'

export const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose }) => {
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('iban')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [donationAmount, setDonationAmount] = useState<number>(100)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [showTabAnimation, setShowTabAnimation] = useState(false)

  // Trigger tab animation when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowTabAnimation(true)
      // Stop animation after 4 seconds
      const timer = setTimeout(() => setShowTabAnimation(false), 4000)
      return () => clearTimeout(timer)
    } else {
      setShowTabAnimation(false)
    }
  }, [isOpen])

  // Bank details
  const bankDetails = {
    accountName: 'ASOCIATIA BUCURIE IN DAR',
    bank: 'Banca Transilvania',
    swift: 'BTRLRO22',
    accounts: [
      {
        iban: 'RO31BTRLRONCRT0610749705',
        currency: 'RON',
        label: 'Lei (RON)',
      },
      {
        iban: 'RO35BTRLEURCRT0610749703',
        currency: 'EUR',
        label: 'Euro (EUR)',
      },
    ],
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleStripeCheckout = async () => {
    // TODO: Implement Stripe checkout
    // This will redirect to Stripe's hosted checkout page
    console.log('Redirect to Stripe checkout')

    // Example implementation:
    // const response = await fetch('/api/create-checkout-session', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ amount: selectedAmount }),
    // })
    // const { url } = await response.json()
    // window.location.href = url
  }

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                      <HeartIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <DialogTitle
                        as="h3"
                        className="text-xl font-bold text-gray-900 font-playfair"
                      >
                        Susține jurnalismul local
                      </DialogTitle>
                      <p className="text-sm text-gray-500">Mulțumim pentru sprijin!</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Payment Method Tabs */}
                <motion.div
                  className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-6"
                  animate={
                    showTabAnimation
                      ? {
                          scale: [1, 1.05, 1],
                        }
                      : {}
                  }
                  transition={{
                    duration: 0.8,
                    repeat: showTabAnimation ? 1 : 0,
                    repeatType: 'loop',
                  }}
                >
                  <button
                    onClick={() => setActiveMethod('iban')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
                      activeMethod === 'iban'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <BuildingLibraryIcon className="h-5 w-5" />
                    Transfer Bancar
                  </button>
                  <button
                    onClick={() => setActiveMethod('stripe')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
                      activeMethod === 'stripe'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <CreditCardIcon className="h-5 w-5" />
                    Card Bancar
                  </button>
                </motion.div>

                {/* IBAN Section */}
                {activeMethod === 'iban' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Poți face o donație prin transfer bancar către contul nostru:
                      </p>

                      {/* Bank Details */}
                      <div className="space-y-3">
                        {/* Account Name */}
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Beneficiar
                          </label>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {bankDetails.accountName}
                            </p>
                            <button
                              onClick={() => copyToClipboard(bankDetails.accountName, 'name')}
                              className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                              title="Copiază"
                            >
                              {copiedField === 'name' ? (
                                <CheckIcon className="h-4 w-4 text-green-600" />
                              ) : (
                                <ClipboardIcon className="h-4 w-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Bank */}
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Bancă
                          </label>
                          <p className="text-sm font-semibold text-gray-900">{bankDetails.bank}</p>
                        </div>

                        {/* IBAN Accounts */}
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-500 mb-2">
                            Conturi bancare
                          </label>
                          {bankDetails.accounts.map((account, index) => (
                            <div
                              key={account.currency}
                              className="border border-yellow-200 rounded-lg p-3 bg-yellow-50"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-yellow-800">
                                  {account.label}
                                </span>
                                <span className="text-xs text-yellow-700 font-semibold">
                                  {account.currency}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-mono font-bold text-yellow-900">
                                  {account.iban}
                                </p>
                                <button
                                  onClick={() =>
                                    copyToClipboard(
                                      account.iban,
                                      `iban-${account.currency.toLowerCase()}`,
                                    )
                                  }
                                  className="p-1.5 rounded-md hover:bg-yellow-200 transition-colors"
                                  title="Copiază IBAN"
                                >
                                  {copiedField === `iban-${account.currency.toLowerCase()}` ? (
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ClipboardIcon className="h-4 w-4 text-yellow-700" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* SWIFT */}
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            SWIFT
                          </label>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-mono font-semibold text-gray-900">
                              {bankDetails.swift}
                            </p>
                            <button
                              onClick={() => copyToClipboard(bankDetails.swift, 'swift')}
                              className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                              title="Copiază SWIFT"
                            >
                              {copiedField === 'swift' ? (
                                <CheckIcon className="h-4 w-4 text-green-600" />
                              ) : (
                                <ClipboardIcon className="h-4 w-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Stripe Section */}
                {activeMethod === 'stripe' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Donează rapid și sigur cu cardul tău bancar prin Stripe.
                      </p>

                      {/* Suggested Amounts */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Alege suma
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[50, 100, 200].map((amount) => (
                            <button
                              key={amount}
                              onClick={() => {
                                setDonationAmount(amount)
                                setCustomAmount('')
                              }}
                              className={`px-4 py-3 border-2 rounded-lg transition-all font-semibold ${
                                donationAmount === amount && !customAmount
                                  ? 'border-yellow-400 bg-yellow-50 text-gray-900'
                                  : 'border-gray-200 text-gray-900 hover:border-yellow-400 hover:bg-yellow-50'
                              }`}
                            >
                              {amount} RON
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sau introdu o altă sumă
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="50"
                            min="10"
                            value={customAmount}
                            onChange={(e) => {
                              setCustomAmount(e.target.value)
                              const value = parseInt(e.target.value)
                              if (!isNaN(value)) {
                                setDonationAmount(value)
                              }
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-200 transition-all"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                            RON
                          </span>
                        </div>
                      </div>

                      {/* Stripe Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleStripeCheckout}
                        className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 px-4 rounded-lg transition-colors shadow-sm hover:shadow-md"
                      >
                        <CreditCardIcon className="h-5 w-5" />
                        Donează cu Cardul
                      </motion.button>

                      {/* Security Badge */}
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Plăți securizate prin Stripe
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Footer */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-center text-gray-500">
                    Proiect inițiat de{' '}
                    <a
                      href="https://www.bucurieindar.ro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-600 hover:text-yellow-700 underline"
                    >
                      Asociația Bucurie în Dar
                    </a>
                    .
                  </p>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
