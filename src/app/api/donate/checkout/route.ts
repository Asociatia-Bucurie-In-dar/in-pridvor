import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  // Surface a clear error at boot when the route is hit without keys
  console.warn('STRIPE_SECRET_KEY is not set. Stripe checkout will not work.')
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2025-09-30.clover' })
  : (null as unknown as Stripe)

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json()

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 10) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const origin = request.headers.get('origin') || ''

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
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/donate/cancelled`,
      metadata: { type: 'donation' },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
