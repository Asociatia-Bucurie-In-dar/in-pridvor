# Netopia Payments Integration Guide

This guide will help you integrate Netopia Payments (Romanian payment processor) for the donation modal.

## Prerequisites

1. A Netopia Payments account (create one at https://admin.netopia-payments.com/)
2. Your Netopia POS signature and API keys (found in your Netopia admin dashboard)

## Step 1: Create a Point of Sale (POS)

1. Log in to your Netopia Admin Dashboard
2. Navigate to "Points of Sale" (Puncte de vânzare)
3. Click "Add" (Adaugă)
4. Provide details:
   - Name of your application
   - URL of your website
   - Platform information
5. After creation, note your POS signature and encryption keys

## Step 2: Generate API Keys

1. In your Netopia account, click on your profile icon in the top right
2. Select "Security" (Securitate)
3. Name your API key (e.g., "MyAppKey") and generate it
4. Copy the generated API key

## Step 3: Add Environment Variables

Add to your `.env.local`:

```env
# Netopia Payments Keys
NETOPIA_API_KEY=your-api-key-here
NETOPIA_POS_SIGNATURE=your-pos-signature-here
NETOPIA_PUBLIC_KEY=your-public-key-here
NETOPIA_IS_LIVE=false

# Enable card donations in the UI
NEXT_PUBLIC_ENABLE_CARD_DONATIONS=true
```

⚠️ **Important:** 
- Use `NETOPIA_IS_LIVE=false` for development/testing (sandbox environment)
- Use `NETOPIA_IS_LIVE=true` for production (live environment)
- Never commit API keys to git

## Step 4: Integration Details

The integration works as follows:

1. **Checkout Flow**:
   - User clicks "Donează cu Cardul" in the donation modal
   - Frontend calls `/api/donate/checkout` with the donation amount
   - Backend creates a payment request with encrypted data
   - Frontend submits a form POST to Netopia's payment gateway
   - User completes payment on Netopia's secure payment page
   - User is redirected back to success/cancel URLs

2. **IPN (Instant Payment Notification)**:
   - Netopia sends a POST request to `/api/donate/ipn` after payment
   - The IPN handler verifies the signature and processes the payment
   - Use IPN to track donations in your database or send confirmation emails

## Step 5: Update Environment Variables in Production

When deploying:

1. Go to your hosting platform (e.g., Vercel) → Settings → Environment Variables
2. Add all Netopia environment variables:
   - `NETOPIA_API_KEY`
   - `NETOPIA_POS_SIGNATURE`
   - `NETOPIA_PUBLIC_KEY`
   - `NETOPIA_IS_LIVE` (set to `true` for production)
   - `NEXT_PUBLIC_ENABLE_CARD_DONATIONS` (set to `true`)
3. Redeploy your application

## Testing

1. **Sandbox Testing**:
   - Ensure `NETOPIA_IS_LIVE=false` in your environment
   - Use Netopia's sandbox/test cards provided in their documentation
   - Test the complete payment flow

2. **Test Flow**:
   - Click "Donează" button in the donation modal
   - Select "Card Bancar" tab
   - Enter amount and click "Donează cu Cardul"
   - Complete payment with test card on Netopia's payment page
   - Verify redirect to success page

## Request Technical Validation

Once integration and testing are complete:

1. Email [implementare@netopia.ro](mailto:implementare@netopia.ro) to request final validation
2. Netopia's technical support team will review your integration
3. After validation, your POS will be activated for live transactions

## Security Notes

- ✅ Never commit API keys to git
- ✅ Always use environment variables
- ✅ Use sandbox/test environment for development
- ✅ Netopia handles PCI compliance
- ✅ All sensitive data is processed server-side
- ✅ Payment data is encrypted with SHA-256 signatures

## IPN Handler

The IPN handler at `/api/donate/ipn` receives payment notifications from Netopia. You can extend this handler to:

- Save donation records to your database
- Send confirmation emails
- Update payment statuses
- Trigger other business logic

Example extension:

```typescript
// In src/app/api/donate/ipn/route.ts
if (paymentInfo.status === 'confirmed' || paymentInfo.status === 'paid') {
  // Save to database
  await saveDonation({
    orderId: paymentInfo.orderId,
    amount: paymentInfo.amount,
    status: 'paid',
    date: new Date(),
  })
  
  // Send confirmation email
  await sendConfirmationEmail(paymentInfo)
}
```

## Support

- Netopia Payments Documentation: https://doc.netopia-payments.com/
- Netopia Support: [implementare@netopia.ro](mailto:implementare@netopia.ro)
- Netopia Admin Dashboard: https://admin.netopia-payments.com/

