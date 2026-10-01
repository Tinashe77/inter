# Interpath Results PWA

Secure mobile-first MERN PWA for Interpath result access, PDF downloads, WhatsApp sharing, Covid certificates, sample collection notifications, and employee reports.

## WhatsApp provider

The backend supports two interchangeable delivery providers. Direct Meta Cloud API remains the default. To route approved result notifications through a WhatChimp Webhook Workflow, configure Render with:

```env
WHATSAPP_PROVIDER=whatchimp
WHATCHIMP_WEBHOOK_URL=https://your-generated-whatchimp-callback-url
```

Create the workflow in WhatChimp under **Bot Manager → Webhook Workflow**, select the approved result template, and map these incoming fields:

- `phone` (or `phone_number`) → recipient phone number
- `doctor_name` (or `recipient_name`) → header variable and body variable 1
- `lab_number` → body variable 2
- `report_url` → body variable 3

Keep the generated callback URL private. Set `WHATSAPP_PROVIDER=meta` to return to the direct Meta integration.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create server environment:

```bash
cp server/.env.example server/.env
```

3. Update `server/.env` with the MongoDB URI and secrets.

4. Start both apps:

```bash
npm run dev:server
npm run dev:client
```

Default URLs:

- API: `http://localhost:5001`
- Client: `http://localhost:5173`

## Security Notes

- SLIS tokens are kept in HTTP-only cookies.
- Medical results are not permanently stored in browser storage.
- Result views, PDF downloads, and WhatsApp shares are logged in MongoDB audit logs.
- All role access is enforced server-side.
