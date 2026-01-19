'use client'

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  ChevronRightIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
// import { capitalizeFirst } from '@/utilities/stringUtils'

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { DonateModal } from '@/components/DonateModal'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [donateModalOpen, setDonateModalOpen] = useState(false)
  const [isSticky, setIsSticky] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const [expandedMobileItems, setExpandedMobileItems] = useState<Set<string>>(new Set())
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

  const coolDivider = <div className="w-px h-10 bg-gray-300 rotate-20 mx-3" />

  function closeAllPopovers(): void {
    // Close all open popovers by clicking any PopoverButton with aria-expanded="true"
    const popoverButtons = document.querySelectorAll('[aria-expanded="true"]')
    popoverButtons.forEach((button) => (button as HTMLElement).click())
  }

  function toggleMobileItem(itemId: string): void {
    setExpandedMobileItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Animation variants
  const menuItemVariants: any = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
        ease: 'easeOut',
      },
    }),
  }

  const subItemVariants: any = {
    hidden: { opacity: 0, height: 0 },
    visible: {
      opacity: 1,
      height: 'auto',
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.2,
        ease: 'easeIn',
      },
    },
  }

  const desktopPopoverItemVariants: any = {
    hidden: { opacity: 0, y: -10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.2,
      },
    }),
  }

  return (
    <div className="w-full relative">
      {/* Search Icon - positioned relative to the full-width container */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.2 }}
        className="absolute top-6 right-6 hidden lg:block z-30"
      >
        <Link
          href="/search"
          className="block p-2 -m-2 text-gray-700 hover:text-yellow-600 cursor-pointer"
        >
          <MagnifyingGlassIcon aria-hidden="true" className="size-6" />
        </Link>
      </motion.div>

      {/* BIG Logo */}
      <div className="flex justify-center mt-3 bg-white">
        <Link href="/" className="relative z-10 block cursor-pointer">
          <Logo loading="eager" priority="high" width={525} height={525} />
        </Link>
      </div>

      <header ref={headerRef} className="relative z-20">
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
            className="mx-auto flex items-center justify-between p-2 lg:px-8"
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
                  <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
                    <Link
                      href={
                        item.link.url ||
                        (typeof item.link.reference?.value === 'object' &&
                        'slug' in item.link.reference.value
                          ? `/categories/${item.link.reference.value.slug}`
                          : '/')
                      }
                      className="text-md text-gray-800 hover:text-yellow-600 font-playfair transition-colors"
                    >
                      {item.link.label}
                    </Link>
                  </motion.div>

                  {item.sublinks && item.sublinks.length > 0 && (
                    <Popover className="relative">
                      <PopoverButton
                        id={`popover-button-${item.id}`}
                        className="flex items-center gap-x-1 text-sm/6 font-semibold text-gray-900 ml-1 text-yellow-500 hover:text-yellow-600 hover:cursor-pointer focus:outline-none focus:text-yellow-600"
                      >
                        <ChevronDownIcon aria-hidden="true" className="size-4 flex-none" />
                      </PopoverButton>

                      <PopoverPanel
                        onMouseLeave={() => closeAllPopovers()}
                        transition
                        className="absolute left-1/2 mt-3 w-screen max-w-sm -translate-x-1/2 rounded-3xl bg-white shadow-lg outline-1 outline-gray-900/5 transition data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
                      >
                        <div className="p-4">
                          {item.sublinks.map((subItem, subIndex) => {
                            const hasChildren = subItem.children && subItem.children.length > 0
                            return (
                              <div
                                key={subItem.id}
                                className="group/subitem relative rounded-lg p-4 text-sm leading-6 hover:bg-gray-50 transition-colors"
                              >
                                <motion.div
                                  custom={subIndex}
                                  initial="hidden"
                                  animate="visible"
                                  variants={desktopPopoverItemVariants}
                                  className="flex items-center justify-between gap-x-4"
                                >
                                  <Link
                                    href={
                                      subItem.link.url ||
                                      (typeof subItem.link.reference?.value === 'object' &&
                                      'slug' in subItem.link.reference.value
                                        ? `/categories/${subItem.link.reference.value.slug}`
                                        : '/')
                                    }
                                    className="block font-medium font-playfair text-gray-900 group-hover/subitem:text-yellow-600 transition-colors"
                                    onClick={() => {
                                      closeAllPopovers()
                                    }}
                                  >
                                    {subItem.link?.label || ''}
                                  </Link>
                                  {hasChildren && (
                                    <ChevronRightIcon className="size-4 text-gray-400 group-hover/subitem:text-yellow-600 transition-colors flex-shrink-0" />
                                  )}
                                </motion.div>
                                {hasChildren && (
                                  <>
                                    {/* Invisible bridge to connect hover between parent and flyout */}
                                    <div className="invisible group-hover/subitem:visible absolute left-full top-0 w-4 h-full" />
                                    <div className="invisible group-hover/subitem:visible opacity-0 group-hover/subitem:opacity-100 absolute left-full top-0 ml-2 w-56 rounded-2xl bg-white shadow-lg ring-1 ring-gray-900/5 p-2 z-50 transition-opacity duration-150">
                                      {subItem.children!.map((child) => (
                                        <Link
                                          key={child.id}
                                          href={
                                            child.link.url ||
                                            (typeof child.link.reference?.value === 'object' &&
                                            'slug' in child.link.reference.value
                                              ? `/categories/${child.link.reference.value.slug}`
                                              : '/')
                                          }
                                          className="block rounded-lg px-3 py-2 text-sm font-medium font-playfair text-gray-900 hover:bg-gray-50 hover:text-yellow-600 transition-colors"
                                          onClick={() => {
                                            closeAllPopovers()
                                          }}
                                        >
                                          {child.link?.label || ''}
                                        </Link>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </PopoverPanel>
                    </Popover>
                  )}
                </div>
              </PopoverGroup>
            ))}

            {/* Donate Button */}
            <div className="flex flex-1 justify-end">
              <motion.button
                type="button"
                onClick={() => setDonateModalOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex items-center text-sm shadow-sm text-gray-800 bg-yellow-400 hover:shadow-md focus:outline-hidden focus:ring-4 focus:ring-yellow-300 font-medium rounded-full px-5 py-2.5 text-center"
              >
                <HeartIcon aria-hidden="true" className="size-5 mr-1" />
                Donează
              </motion.button>
              <div className="lg:hidden mr-5"></div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden mr-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileMenuOpen(true)}
                className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Bars3Icon aria-hidden="true" className="size-6" />
              </motion.button>
            </div>
          </nav>
        </div>

        {/* Mobile Menu */}
        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden z-30">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" aria-hidden="true" />

          <DialogPanel
            transition
            className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm z-30 transition data-closed:translate-x-full data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in shadow-2xl"
          >
            <div className="flex items-center justify-between">
              {/* Mobile Logo */}
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                <Logo loading="eager" priority="high" />
              </Link>
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>

            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-200">
                {/* Search Link */}
                <motion.div
                  initial="hidden"
                  animate="visible"
                  custom={0}
                  variants={menuItemVariants}
                  className="py-2"
                >
                  <Link
                    href="/search"
                    className="flex items-center gap-x-3 rounded-lg px-3 py-2 text-base font-semibold text-gray-900 hover:bg-gray-50 font-playfair transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MagnifyingGlassIcon aria-hidden="true" className="size-5 text-yellow-600" />
                    Caută
                  </Link>
                </motion.div>

                {/* Navigation Items */}
                <div className="space-y-2 py-6">
                  {navigation.map((item, index) => {
                    const itemId = item.id || `item-${index}`
                    return (
                      <motion.div
                        key={itemId}
                        initial="hidden"
                        animate="visible"
                        custom={index + 1}
                        variants={menuItemVariants}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <Link
                              href={
                                item.link.url ||
                                (typeof item.link.reference?.value === 'object' &&
                                'slug' in item.link.reference.value
                                  ? `/categories/${item.link.reference.value.slug}`
                                  : '/')
                              }
                              className="flex-1 rounded-lg px-3 py-2 text-base font-semibold text-gray-900 hover:bg-gray-50 font-playfair transition-colors"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {item.link.label}
                            </Link>
                            {item.sublinks && item.sublinks.length > 0 && (
                              <button
                                onClick={() => toggleMobileItem(itemId)}
                                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                                aria-expanded={expandedMobileItems.has(itemId)}
                              >
                                <motion.div
                                  animate={{ rotate: expandedMobileItems.has(itemId) ? 90 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronRightIcon
                                    aria-hidden="true"
                                    className="size-5 text-yellow-600"
                                  />
                                </motion.div>
                              </button>
                            )}
                          </div>

                          {/* Collapsible Sublinks */}
                          <AnimatePresence>
                            {item.sublinks &&
                              item.sublinks.length > 0 &&
                              expandedMobileItems.has(itemId) && (
                                <motion.div
                                  initial="hidden"
                                  animate="visible"
                                  exit="exit"
                                  variants={subItemVariants}
                                  className="overflow-hidden"
                                >
                                  <div className="ml-4 mt-2 space-y-1 border-l-2 border-yellow-400 pl-3">
                                    {item.sublinks.map((subItem) => {
                                      const subItemId =
                                        subItem.id || `subitem-${subItem.link?.label}`
                                      const hasChildren =
                                        subItem.children && subItem.children.length > 0
                                      return (
                                        <div key={subItem.id}>
                                          <div className="flex items-center justify-between">
                                            <Link
                                              href={
                                                subItem.link.url ||
                                                (typeof subItem.link.reference?.value ===
                                                  'object' && 'slug' in subItem.link.reference.value
                                                  ? `/categories/${subItem.link.reference.value.slug}`
                                                  : '/')
                                              }
                                              className="flex-1 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-yellow-600 font-playfair transition-colors"
                                              onClick={() => setMobileMenuOpen(false)}
                                            >
                                              {subItem.link?.label || ''}
                                            </Link>
                                            {hasChildren && (
                                              <button
                                                onClick={() => toggleMobileItem(subItemId)}
                                                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                                                aria-expanded={expandedMobileItems.has(subItemId)}
                                              >
                                                <motion.div
                                                  animate={{
                                                    rotate: expandedMobileItems.has(subItemId)
                                                      ? 90
                                                      : 0,
                                                  }}
                                                  transition={{ duration: 0.2 }}
                                                >
                                                  <ChevronRightIcon
                                                    aria-hidden="true"
                                                    className="size-4 text-yellow-500"
                                                  />
                                                </motion.div>
                                              </button>
                                            )}
                                          </div>
                                          <AnimatePresence>
                                            {hasChildren && expandedMobileItems.has(subItemId) && (
                                              <motion.div
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                variants={subItemVariants}
                                                className="overflow-hidden"
                                              >
                                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-yellow-300 pl-3">
                                                  {subItem.children!.map((child) => (
                                                    <Link
                                                      key={child.id}
                                                      href={
                                                        child.link.url ||
                                                        (typeof child.link.reference?.value ===
                                                          'object' &&
                                                        'slug' in child.link.reference.value
                                                          ? `/categories/${child.link.reference.value.slug}`
                                                          : '/')
                                                      }
                                                      className="block rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-yellow-600 font-playfair transition-colors"
                                                      onClick={() => setMobileMenuOpen(false)}
                                                    >
                                                      {child.link?.label || ''}
                                                    </Link>
                                                  ))}
                                                </div>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </motion.div>
                              )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Donate Button in Mobile Menu */}
                <motion.div
                  initial="hidden"
                  animate="visible"
                  custom={navigation.length + 1}
                  variants={menuItemVariants}
                  className="py-6"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setDonateModalOpen(true)
                    }}
                    className="flex w-full items-center justify-center text-sm shadow-sm text-black bg-yellow-400 hover:shadow-md focus:outline-hidden focus:ring-4 focus:ring-yellow-300 font-medium rounded-full px-5 py-3 text-center transition-all"
                  >
                    <HeartIcon aria-hidden="true" className="size-5 mr-2" />
                    Donează
                  </button>
                </motion.div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>

      {/* Donate Modal */}
      <DonateModal isOpen={donateModalOpen} onClose={() => setDonateModalOpen(false)} />
    </div>
  )
}
