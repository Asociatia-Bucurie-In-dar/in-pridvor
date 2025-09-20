'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogPanel,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from '@headlessui/react'
import {
  Bars3Icon,
  ChevronDownIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { capitalizeFirst } from '@/utilities/stringUtils'

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSticky, setIsSticky] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef<HTMLDivElement | null>(null)

  const navigation = data?.navItems || []

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return
      const headerTop = headerRef.current.offsetTop
      const scrollY = window.scrollY

      // Only update state if change is greater than the threshold
      if (!isSticky && scrollY > headerTop) {
        setIsSticky(true)
      } else if (isSticky && scrollY < headerTop) {
        setIsSticky(false)
      }
    }

    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight)
      }
    }

    updateHeaderHeight() // Set initial height
    window.addEventListener('resize', updateHeaderHeight)
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isSticky])

  const coolDivider = <div className="w-px h-10 bg-gray-300 rotate-20 mx-4" />

  return (
    <div className="z-20">
      {/* BIG Logo */}
      <div className="flex justify-center mt-3 bg-white">
        <Link href="/">
          <Logo loading="eager" priority="high" width={525} height={525} />
        </Link>
      </div>

      <header ref={headerRef} className="relative">
        {/* Sticky Header (only sticks after scrolling past its original position) */}
        {/* we need a div the height of header, which becomes visible when header becomes sticky */}
        <div
          style={{ height: isSticky ? headerHeight : 0 }}
          className="top-0 left-0 right-0 flex justify-center"
        ></div>
        <div
          className={`w-full transition-all bg-white line shadow-xs ${isSticky ? 'fixed top-0 left-0' : ''}`}
        >
          <nav
            className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8"
            aria-label="Global"
          >
            {/* Small Logo (only visible when sticky) */}
            <motion.div
              initial={{ opacity: 0, y: -25 }}
              animate={{ opacity: isSticky ? 1 : 0, y: isSticky ? 0 : -25 }}
              transition={{ duration: 0.5 }}
              className="flex lg:flex-1"
            >
              <Link href="/">
                <Logo loading="eager" priority="high" />
              </Link>
            </motion.div>

            {/* Desktop Menu */}
            {navigation.map((item, index) => (
              <PopoverGroup key={item.id} className="hidden lg:flex lg:gap-x-4">
                <div className="flex items-center">
                  {index !== 0 && coolDivider}
                  <Link
                    href={item.link.url ? item.link.url : '/'}
                    className="text-md/6 text-gray-700 hover:text-yellow-600 font-playfair font-medium"
                  >
                    {/*{capitalizeFirst(item.)}*/}
                    {capitalizeFirst(item.link.label)}
                  </Link>

                  <Popover className="relative">
                    <PopoverButton className="flex items-center gap-x-1 text-sm/6 font-semibold text-gray-900 ml-1">
                      <ChevronDownIcon
                        aria-hidden="true"
                        className="size-5 flex-none text-yellow-500"
                      />
                    </PopoverButton>

                    <PopoverPanel
                      transition
                      className="absolute left-1/2 z-10 mt-3 w-screen max-w-md -translate-x-1/2 overflow-hidden rounded-3xl bg-white shadow-lg outline-1 outline-gray-900/5 transition data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
                    >
                      <div className="p-4">asd</div>
                    </PopoverPanel>
                  </Popover>
                </div>
              </PopoverGroup>
            ))}

            {/* Extra links */}
            <div className="flex items-center">
              {coolDivider}
              <Link href={'/search'} className="hover:text-gray-700 hover:text-yellow-600">
                <MagnifyingGlassIcon aria-hidden="true" className="size-6" />
              </Link>
            </div>

            {/* Donate Button */}
            <div className="flex flex-1 justify-end">
              <button
                type="button"
                className="flex items-center text-sm shadow-xs text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-hidden focus:ring-4 focus:ring-yellow-300 font-medium rounded-full px-5 py-2.5 text-center"
              >
                <HeartIcon aria-hidden="true" className="size-5 mr-1" />
                Donează
              </button>
              <div className="lg:hidden mr-4"></div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
              >
                <Bars3Icon aria-hidden="true" className="size-6" />
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Menu */}
        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
          <DialogPanel className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm">
            <div className="flex items-center justify-between">
              {/* Mobile Logo */}
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                <Logo loading="eager" priority="high" />
              </Link>
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
              >
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="mt-6 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.id}
                  href={item.link.url || '/'}
                  className="block rounded-lg px-3 py-2 text-base font-semibold text-gray-900 hover:bg-gray-50 font-playfair"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.link.label}
                </Link>
              ))}
            </div>
          </DialogPanel>
        </Dialog>
      </header>
    </div>
  )
}
