# Stripe Integration Guide

This guide will help you integrate Stripe payment processing for the donation modal.

## Prerequisites

1. A Stripe account (create one at https://stripe.com)
2. Your Stripe API keys (found in Dashboard → Developers → API keys)

## Step 1: Install Stripe Dependencies

```bash
pnpm add stripe @stripe/stripe-js
```

## Step 2: Add Environment Variables

Add to your `.env.local`:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

⚠️ **Important:** Use test keys for development, live keys only for production!

## Step 3: Create Stripe Checkout API Route

Create `/src/app/api/donate/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json()

    // Validate amount
    if (!amount || amount < 10) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'ron',
            product_data: {
              name: 'Donație In Pridvor',
              description: 'Susține jurnalismul local independent',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/donate/cancelled`,
      metadata: {
        type: 'donation',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
```

## Step 4: Update DonateModal Component

Replace the `handleStripeCheckout` function in `/src/components/DonateModal/index.tsx`:

```typescript
const [donationAmount, setDonationAmount] = useState<number>(100)
const [isLoading, setIsLoading] = useState(false)

const handleStripeCheckout = async () => {
  if (donationAmount < 10) {
    alert('Suma minimă este 10 RON')
    return
  }

  setIsLoading(true)
  try {
    const response = await fetch('/api/donate/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: donationAmount }),
    })

    const { url, error } = await response.json()

    if (error) {
      throw new Error(error)
    }

    // Redirect to Stripe Checkout
    window.location.href = url
  } catch (error) {
    console.error('Checkout error:', error)
    alert('A apărut o eroare. Te rugăm să încerci din nou.')
  } finally {
    setIsLoading(false)
  }
}
```

## Step 5: Create Success/Cancel Pages

### Success Page: `/src/app/(frontend)/donate/success/page.tsx`

```typescript
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
        <h1 className="text-3xl font-bold text-gray-900 mb-4 font-playfair">
          Mulțumim!
        </h1>
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
```

### Cancel Page: `/src/app/(frontend)/donate/cancelled/page.tsx`

```typescript
import { Metadata } from 'next'
import Link from 'next/link'
import { XCircleIcon } from '@heroicons/react/24/solid'

export const metadata: Metadata = {
  title: 'Donație anulată',
}

export default function DonateCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <XCircleIcon className="h-16 w-16 text-gray-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4 font-playfair">
          Donație anulată
        </h1>
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
```

## Step 6: Update Environment Variables in Vercel

When deploying:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Use **live keys** for production!

## Testing

1. Use Stripe test cards: https://stripe.com/docs/testing
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future date for expiry
   - Any 3 digits for CVC

2. Test the flow:
   - Click "Donează" button
   - Select "Card Bancar" tab
   - Enter amount and click "Donează cu Cardul"
   - Complete Stripe checkout with test card
   - Verify redirect to success page

## Security Notes

- ✅ Never commit API keys to git
- ✅ Always use environment variables
- ✅ Use test keys in development
- ✅ Stripe Checkout handles PCI compliance
- ✅ All sensitive data processed server-side

## Webhook Setup (Optional but Recommended)

For tracking donations in your database, set up Stripe webhooks:

1. Create `/src/app/api/webhooks/stripe/route.ts`
2. Listen for `checkout.session.completed` events
3. Save donation records to your database
4. Send confirmation emails

See: https://stripe.com/docs/webhooks

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com/

