# Airwallex Payment Integration Setup

This document explains how to set up Airwallex for payments and payouts in the application.

## Prerequisites

1. An Airwallex account (sign up at https://www.airwallex.com/)
2. Access to the Airwallex dashboard
3. API credentials from Airwallex

## Configuration Steps

### 1. Get Your API Credentials

1. Log into your Airwallex dashboard
2. Navigate to **Developer Tools** > **API Keys**
3. Generate or copy your:
   - **Client ID** (already provided: `SoG_nJaTQOy7_7KQ5CsBTw` for sandbox)
   - **API Key** (you need to get this from the dashboard)
   - **Webhook Secret** (for webhook verification)

### 2. Set Up Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your Airwallex credentials:
   ```env
   AIRWALLEX_CLIENT_ID=SoG_nJaTQOy7_7KQ5CsBTw
   AIRWALLEX_API_KEY=your_actual_api_key_here
   AIRWALLEX_ENVIRONMENT=sandbox
   AIRWALLEX_WEBHOOK_SECRET=your_webhook_secret_here
   ```
   
   **Note:** 
   - For demo/sandbox environment, the API base URL is `https://api-demo.airwallex.com`
   - For production, the API base URL is `https://api.airwallex.com`
   - Authentication uses `x-client-id` and `x-api-key` headers (not Bearer token)

### 3. Run Database Migration

Run the SQL migration to add payment tracking fields:

```sql
-- Run the contents of supabase/add_airwallex_payment_tracking.sql
-- in your Supabase SQL editor
```

This will:
- Add payment tracking fields to the `tasks` table
- Create the `payouts` table
- Add IBAN field to the `profiles` table

### 4. Configure Webhooks

1. In your Airwallex dashboard, go to **Developer Tools** > **Webhooks**
2. Add a webhook endpoint: `https://your-domain.com/api/airwallex/webhook`
3. Select the following events:
   - `payment.succeeded`
   - `payment.failed`
   - `payment.cancelled`
   - `payout.succeeded`
   - `payout.failed`
   - `payout.cancelled`
4. Copy the webhook secret and add it to `.env.local`

### 5. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/test-airwallex` to test payment and payout creation

3. Test the full flow:
   - Create a task with a budget
   - Assign a helper
   - Make a payment (as task owner)
   - Complete the task (triggers payout to helper)

## Payment Flow

1. **Task Owner Pays**:
   - Task owner clicks "Pay Now" on an assigned task
   - Payment intent is created via Airwallex
   - User is redirected to Airwallex checkout (or shown Multibanco reference)
   - Webhook confirms payment → Task status updated

2. **Task Completion Triggers Payout**:
   - Task owner marks task as completed
   - System checks if payment was made
   - If helper has IBAN configured, payout is created automatically
   - Webhook confirms payout → Payout status updated

## Helper Setup

Helpers need to:
1. Add their IBAN to their profile (`/profile`)
2. Complete tasks to receive payouts
3. View payout history at `/profile/payouts`

## Supported Payment Methods

- **Card payments** (Visa, Mastercard, etc.)
- **Multibanco** (Portuguese payment method)
- **Bank transfers** (IBAN/SEPA for payouts)

## API Endpoints

- `POST /api/airwallex/create-payment` - Create payment intent
- `GET /api/airwallex/payment-status` - Check payment status
- `POST /api/airwallex/create-payout` - Create payout to helper
- `GET /api/airwallex/payout-status` - Check payout status
- `POST /api/airwallex/webhook` - Webhook handler (called by Airwallex)

## Troubleshooting

### Payment Creation Fails
- Check that `AIRWALLEX_CLIENT_ID` and `AIRWALLEX_API_KEY` are set correctly
- Verify you're using sandbox credentials in sandbox mode
- Check the browser console and server logs for error messages

### Payout Creation Fails
- Ensure helper has IBAN configured in their profile
- Verify IBAN format is correct (e.g., PT50 XXXX XXXX XXXX XXXX XXXX XX)
- Check that task payment status is 'paid' before completing task

### Webhooks Not Working
- Verify webhook URL is accessible from the internet (use ngrok for local testing)
- Check that `AIRWALLEX_WEBHOOK_SECRET` matches the secret in Airwallex dashboard
- Review webhook logs in Airwallex dashboard

## Going to Production

1. Update `AIRWALLEX_ENVIRONMENT=production` in `.env.local`
2. Get production credentials from Airwallex dashboard
3. Update `AIRWALLEX_CLIENT_ID` and `AIRWALLEX_API_KEY` with production values
4. Update webhook URL to production domain
5. Test thoroughly in sandbox first!

## Documentation Links

- [Airwallex API Documentation](https://www.airwallex.com/docs/developer-tools__api)
- [Payment Integration Guide](https://www.airwallex.com/docs/payments__native-api)
- [Payout Integration Checklist](https://www.airwallex.com/docs/payouts__integration-checklist)

