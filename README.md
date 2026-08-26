# sendInvoice-api

Standalone backend for the SendInvoice app — a Hono HTTP API backed by SQLite (via Drizzle ORM). Owns the database, invoice/customer business logic, PDF generation, email sending, and the recurring-invoice scheduler.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The server listens on `http://localhost:4000` by default and expects the frontend (`sendInvoice`) to run on `http://localhost:3000` (set `CORS_ORIGIN` to override).

Migrations run automatically on startup. To generate a new migration after changing `src/db/schema.ts`:

```bash
npm run db:generate
```

## API

All routes are mounted under `/api`:

- `GET/PUT /api/business-profile`
- `GET /api/customers`, `GET /api/customers/search`, `GET/PUT/DELETE /api/customers/:id`, `POST /api/customers`, `POST /api/customers/:id/archive`, `POST /api/customers/:id/unarchive`
- `GET /api/invoices`, `GET/PUT/DELETE /api/invoices/:id`, `POST /api/invoices`, `GET /api/invoices/:id/pdf-preview`, `POST /api/invoices/:id/send`
- `GET /api/recurring-invoices`, `GET/PUT /api/recurring-invoices/:id`, `POST /api/recurring-invoices`, `POST /api/recurring-invoices/:id/{pause,resume,end,run-now}`
- `GET /api/dashboard`
