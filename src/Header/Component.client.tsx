
// export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
//   /* Storing the value in a useState to avoid hydration errors */
//
//   const pathname = usePathname()

//   return (
//     <header className="container relative z-20   " {...(theme ? { 'data-theme': theme } : {})}>
//       <div className="py-8 flex justify-between">
//         <Link href="/">
//           <Logo loading="eager" priority="high" className="invert dark:invert-0" />
//         </Link>
//         <HeaderNav data={data} />
//       </div>
//     </header>
//   )
// }

"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogPanel, PopoverGroup } from "@headlessui/react";
import { Bars3Icon, HeartIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { capitalizeFirst } from "@/utilities/stringUtils";
import Image from "next/image";

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const threshold = 0; // Buffer to prevent flickering

  const navigation = data?.navItems || []

  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;
      const headerTop = headerRef.current.offsetTop;
      const scrollY = window.scrollY;

      // Only update state if change is greater than the threshold
      if (!isSticky && scrollY > headerTop + threshold) {
        setIsSticky(true);
      } else if (isSticky && scrollY < headerTop - threshold) {
        setIsSticky(false);
      }
    };

    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeaderHeight(); // Set initial height
    window.addEventListener("resize", updateHeaderHeight);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("resize", updateHeaderHeight);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isSticky]);

  return (
    <div className="z-20">
      {/* BIG Logo */}
      <div className="flex justify-center mt-3 bg-white">
        <Link href="/">
          <Logo
            loading="eager"
            priority="high"
          />
        </Link>
      </div>

      <header ref={headerRef} className="relative">
        {/* Sticky Header (only sticks after scrolling past its original position) */}
        {/* we need a div the height of header, which becomes visible when header becomes sticky */}
        <div style={{ height: isSticky ? (headerHeight) : 0 }} className="top-0 left-0 right-0 flex justify-center"></div>
        <div className={`w-full transition-all bg-white line shadow-sm ${isSticky ? "fixed top-0 left-0" : ""}`}>
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
                <Logo
                  loading="eager"
                  priority="high"
                />
              </Link>
            </motion.div>

            {/* Desktop Menu */}
            <PopoverGroup className="hidden lg:flex lg:gap-x-4">
              {navigation.map((item, index) => (
                <div key={item.id} className="flex items-center">
                  {index !== 0 && (
                    <div className="w-px h-10 bg-gray-300 rotate-[20deg] mr-4"></div> )}
                  <Link href={(item.link.url) ? item.link.url : "/"}
                        className="text-md/6 text-gray-700 hover:text-gray-900 font-playfair">
                    {/*{capitalizeFirst(item.)}*/}
                    {item.link.label}
                  </Link>
                </div>
              ))}
              {/* Extra links */}
              <div className="flex items-center">
                <div className="w-px h-10 bg-gray-300 rotate-[20deg] mr-4"></div>
                <Link
                  href={"/search"}
                  className="hover:text-gray-700">
                  <MagnifyingGlassIcon aria-hidden="true" className="size-6" />
                </Link>
              </div>
            </PopoverGroup>

            {/* Donate Button */}
            <div className="flex flex-1 justify-end">
              {/*<button className="rounded-full "*/}
              {/*        style={{backgroundColor: "#ffdd00", borderColor: "#ffdd00"}}>*/}
              {/*  <HeartIcon aria-hidden="true" className="size-5 mr-0"/>*/}
              {/*  Donează*/}
              {/*</button>*/}
              <button type="button"
                      className="flex items-center text-sm shadow-sm text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-300 font-medium rounded-full px-5 py-2.5 text-center me-2 mb-2">
                <HeartIcon aria-hidden="true" className="size-5 mr-1"/>
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
                <Logo
                  loading="eager"
                  priority="high"
                />
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
                  href={item.link.url || "/"}
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
  );
}


