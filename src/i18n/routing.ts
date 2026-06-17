import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['ro', 'en'],

  // Used when no locale matches
  defaultLocale: 'ro',

  // Remove the prefix for the default locale (ro)
  localePrefix: 'as-needed'
});

// Lightweight wrappers around Next.js navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
