declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URI: string
      NEXT_PUBLIC_SERVER_URL: string
      VERCEL_PROJECT_PRODUCTION_URL: string
      NEXT_PUBLIC_ENABLE_CARD_DONATIONS?: string
      NETOPIA_API_KEY?: string
      NETOPIA_POS_SIGNATURE?: string
      NETOPIA_IS_LIVE?: string
      NETOPIA_PUBLIC_KEY?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
