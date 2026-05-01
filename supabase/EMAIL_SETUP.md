# SIPCOT TRACK — Email Notification Setup Guide

## Architecture Overview

```
DB Change → pg_net HTTP POST → Supabase Edge Function → Resend API → User Inbox
```

---

## Step 1 — Get a Resend API Key (Free)

1. Go to [https://resend.com](https://resend.com) → Sign up (free tier: 100 emails/day)
2. Dashboard → API Keys → **Create API Key**
3. Copy the key (starts with `re_...`)

---

## Step 2 — Deploy Edge Functions

Run these commands from your project root:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login
supabase login

# Link to your project (get project-ref from Dashboard → Settings → General)
supabase link --project-ref YOUR-PROJECT-REF

# Set secrets (Edge Function environment variables)
supabase secrets set RESEND_API_KEY=re_YOUR_RESEND_KEY
supabase secrets set ADMIN_ALERT_EMAIL=admin@yourdomain.com
supabase secrets set PORTAL_URL=https://your-deployment-url.vercel.app

# Deploy both functions
supabase functions deploy notify-status-change
supabase functions deploy notify-water-alert
```

---

## Step 3 — Run the SQL Script

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open `scripts/06-setup-email-triggers.sql`
3. Replace `YOUR-PROJECT-REF` with your actual project ref
4. Replace `YOUR-SUPABASE-ANON-KEY` with your anon key from Dashboard → Settings → API
5. Click **Run**

---

## Step 4 — Verify Domain in Resend (for Production)

For emails to land in inbox (not spam):

1. Resend Dashboard → **Domains** → Add Domain
2. Add your domain's DNS records (MX, DKIM, SPF)
3. Update `FROM_EMAIL` in both edge functions to use your verified domain

> **For testing**, you can use Resend's sandbox and send to your own email.

---

## Email Triggers Summary

| Event | Who Gets Email | Subject |
|---|---|---|
| New report submitted (INSERT) | Allottee | `Acknowledgement: SIPCOT Monthly Filing [Ref: SIPCOT-XXXXX]` |
| Report status → `verified` | Allottee | `Compliance Approved: Your Monthly Report has been Verified` |
| Report status → `rejected` | Allottee | `Action Required: Correction Needed for SIPCOT Filing` |
| water_kld > 1,000 on INSERT | Admin | `CRITICAL: Resource Threshold Violation - [Industry Name]` |
| power_kwh > 500,000 on INSERT | Admin | `HIGH: Resource Threshold Violation - [Industry Name]` |

---

## Environment Variables Needed

Add these to your `.env.local` and Vercel dashboard:

```env
# Already present:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# New — for Edge Functions (set via supabase secrets set):
RESEND_API_KEY=re_...
ADMIN_ALERT_EMAIL=admin@yourdomain.com
PORTAL_URL=https://your-app.vercel.app
```

---

## Testing the Functions Locally

```bash
# Run edge functions locally
supabase functions serve notify-status-change --env-file .env.local

# In another terminal, test with curl:
curl -X POST http://localhost:54321/functions/v1/notify-status-change \
  -H "Content-Type: application/json" \
  -d '{
    "type": "UPDATE",
    "table": "monthly_reports",
    "record": {
      "id": 1,
      "industry_id": "YOUR-INDUSTRY-UUID",
      "status": "verified",
      "month": 5,
      "year": 2026
    },
    "old_record": { "status": "pending" }
  }'
```
