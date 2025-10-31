import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const netopiaApiKey = process.env.NETOPIA_API_KEY
const netopiaPosSignature = process.env.NETOPIA_POS_SIGNATURE
const netopiaIsLive = process.env.NETOPIA_IS_LIVE === 'true'
const netopiaPublicKey = process.env.NETOPIA_PUBLIC_KEY

const netopiaApiUrl = netopiaIsLive
  ? 'https://secure.mobilpay.ro'
  : 'https://sandbox.netopia-payments.com'

if (!netopiaApiKey || !netopiaPosSignature) {
  console.warn('NETOPIA_API_KEY or NETOPIA_POS_SIGNATURE is not set. Netopia checkout will not work.')
}

interface PaymentRequest {
  orderId: string
  amount: string
  currency: string
  details: string
  successUrl: string
  cancelUrl: string
  notifyUrl: string
  invoiceId?: string
  customer?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    country?: string
  }
}

function generateOrderId(): string {
  return `DON-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function createPaymentRequest(data: PaymentRequest) {
  const paymentData = {
    orderId: data.orderId,
    amount: data.amount,
    currency: data.currency,
    details: data.details,
    successUrl: data.successUrl,
    cancelUrl: data.cancelUrl,
    notifyUrl: data.notifyUrl,
    invoiceId: data.invoiceId || data.orderId,
    customer: data.customer || {},
  }

  const jsonData = JSON.stringify(paymentData)
  const encodedData = Buffer.from(jsonData).toString('base64')

  if (!netopiaPosSignature) {
    throw new Error('NETOPIA_POS_SIGNATURE is not configured')
  }

  const signature = crypto
    .createHash('sha256')
    .update(encodedData + netopiaPosSignature)
    .digest('hex')

  return {
    data: encodedData,
    env_key: netopiaPosSignature,
    signature: signature,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { amount } = await request.json()

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 10) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (!netopiaApiKey || !netopiaPosSignature) {
      return NextResponse.json({ error: 'Netopia not configured' }, { status: 500 })
    }

    const origin = request.headers.get('origin') || ''
    const orderId = generateOrderId()

    const paymentRequest = createPaymentRequest({
      orderId,
      amount: amount.toFixed(2),
      currency: 'RON',
      details: 'Donație In Pridvor - Susține În Pridvor și oameni în nevoie.',
      successUrl: `${origin}/donate/success?order_id=${orderId}`,
      cancelUrl: `${origin}/donate/cancelled`,
      notifyUrl: `${origin}/api/donate/ipn`,
      invoiceId: orderId,
    })

    const paymentUrl = `${netopiaApiUrl}/payment/card`

    return NextResponse.json({
      url: paymentUrl,
      orderId,
      paymentRequest: JSON.stringify(paymentRequest),
    })
  } catch (error) {
    console.error('Netopia error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment request' },
      { status: 500 }
    )
  }
}
