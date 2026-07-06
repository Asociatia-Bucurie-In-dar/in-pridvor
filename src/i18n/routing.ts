import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['ro', 'en'],

  // Used when no locale matches
  defaultLocale: 'ro',

  // Remove the prefix for the default locale (ro)
  localePrefix: 'as-needed',

  // Romanian is the source of truth and the default: serve it at `/` without
  // auto-redirecting based on the browser's Accept-Language header. Visitors
  // opt into English via the LocaleSwitcher.
  localeDetection: false,
});

// Lightweight wrappers around Next.js navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
