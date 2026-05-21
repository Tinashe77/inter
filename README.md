# Interpath Results PWA

Secure mobile-first MERN PWA for Interpath result access, PDF downloads, WhatsApp sharing, Covid certificates, sample collection notifications, and employee reports.

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
