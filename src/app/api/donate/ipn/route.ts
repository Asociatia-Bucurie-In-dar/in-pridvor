import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const netopiaPosSignature = process.env.NETOPIA_POS_SIGNATURE
const netopiaPublicKey = process.env.NETOPIA_PUBLIC_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    
    if (!netopiaPosSignature) {
      console.error('NETOPIA_POS_SIGNATURE is not configured')
      return NextResponse.json({ error: 'Netopia not configured' }, { status: 500 })
    }

    let paymentData
    try {
      paymentData = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { data: encodedData, signature } = paymentData

    if (!encodedData || !signature) {
      return NextResponse.json({ error: 'Missing payment data' }, { status: 400 })
    }

    const expectedSignature = crypto
      .createHash('sha256')
      .update(encodedData + netopiaPosSignature)
      .digest('hex')

    if (signature !== expectedSignature) {
      console.error('Invalid signature in IPN request')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8')
    const paymentInfo = JSON.parse(decodedData)

    console.log('Netopia IPN received:', {
      orderId: paymentInfo.orderId,
      status: paymentInfo.status,
      amount: paymentInfo.amount,
    })

    if (paymentInfo.status === 'confirmed' || paymentInfo.status === 'paid') {
      console.log('Payment confirmed for order:', paymentInfo.orderId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Netopia IPN error:', error)
    return NextResponse.json({ error: 'IPN processing failed' }, { status: 500 })
  }
}
