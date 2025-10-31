import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const netopiaPosSignature = process.env.NETOPIA_POS_SIGNATURE
const netopiaIsLive = process.env.NETOPIA_IS_LIVE === 'true'

const netopiaApiUrl = netopiaIsLive
  ? 'https://secure.mobilpay.ro'
  : 'https://sandbox.netopia-payments.com'

function generateOrderId(): string {
  return `DON-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function createPaymentRequest(orderId: string, amount: string, origin: string) {
  const paymentData = {
    orderId,
    amount,
    currency: 'RON',
    details: 'Donație In Pridvor - Susține În Pridvor și oameni în nevoie.',
    successUrl: `${origin}/donate/success?order_id=${orderId}`,
    cancelUrl: `${origin}/donate/cancelled`,
    notifyUrl: `${origin}/api/donate/ipn`,
    invoiceId: orderId,
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const amount = parseFloat(searchParams.get('amount') || '0')

    if (!amount || amount < 10) {
      const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Error</title>
</head>
<body>
  <h1>Error</h1>
  <p>Invalid donation amount. Minimum amount is 10 RON.</p>
  <button onclick="window.history.back()">Go Back</button>
</body>
</html>
      `.trim()
      return new NextResponse(errorHtml, {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    if (!netopiaPosSignature || netopiaPosSignature === 'your-pos-signature-here') {
      const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Error</title>
</head>
<body>
  <h1>Payment Not Configured</h1>
  <p>Netopia Payments is not properly configured. Please contact the website administrator.</p>
  <button onclick="window.history.back()">Go Back</button>
</body>
</html>
      `.trim()
      return new NextResponse(errorHtml, {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const origin = request.headers.get('origin') || request.nextUrl.origin
    const orderId = generateOrderId()
    const paymentRequest = createPaymentRequest(orderId, amount.toFixed(2), origin)

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to secure payment...</title>
</head>
<body>
  <form id="paymentForm" method="POST" action="${netopiaApiUrl}/payment/card">
    <input type="hidden" name="data" value="${paymentRequest.data}" />
    <input type="hidden" name="env_key" value="${paymentRequest.env_key}" />
    <input type="hidden" name="signature" value="${paymentRequest.signature}" />
  </form>
  <script>
    document.getElementById('paymentForm').submit();
  </script>
  <p>Redirecting to secure payment...</p>
</body>
</html>
    `.trim()

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Netopia redirect error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment redirect' },
      { status: 500 }
    )
  }
}

