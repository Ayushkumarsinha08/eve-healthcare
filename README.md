# EVE Healthcare Backend

A REST API for diagnostic centres, tests, bookings, and simulated payments. Built with Express, TypeScript, PostgreSQL, and Prisma.

## Requirements
- Node.js 20+
- PostgreSQL

## Setup

Install dependencies:
```sh
npm install
```

Copy `.env.example` to `.env`. Set `DATABASE_URL` to your PostgreSQL connection string and `JWT_SECRET` to a private value of at least 32 characters. `PORT` defaults to `3000`; `JWT_EXPIRES_IN` defaults to `1h`.

Apply the database migration and load sample centres and tests:
```sh
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Start the development server:
```sh
npm run dev
```

The API runs at `http://localhost:3000` by default. Swagger UI is available at `http://localhost:3000/api-docs`.

## Endpoints

Protected endpoints require `Authorization: Bearer <JWT>`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Check API health. |
| POST | `/api/auth/signup` | No | Create an account. Returns the public user; never returns the password hash. |
| POST | `/api/auth/login` | No | Authenticate and receive a JWT. |
| POST | `/api/centres` | No | Create a centre. |
| GET | `/api/centres` | No | List centres. |
| GET | `/api/centres/:id` | No | Get a centre and its tests. |
| POST | `/api/tests` | No | Create a test with a positive price and an existing centre. |
| GET | `/api/tests` | No | List tests with centre summaries. |
| GET | `/api/tests/:id` | No | Get a test with its centre. |
| POST | `/api/bookings` | Yes | Create a pending booking. The server supplies the user ID and amount. |
| GET | `/api/bookings` | Yes | List the authenticated user's bookings. |
| GET | `/api/bookings/:id` | Yes | Get an owned booking. |
| DELETE | `/api/bookings/:id` | Yes | Cancel an eligible booking without deleting it. |
| POST | `/api/payments` | Yes | Simulate payment for an owned pending booking. |
| POST | `/api/payments/webhook` | No | Process a validated, idempotent payment event. |

Request bodies are JSON. Signup requires `name`, `email`, and `password`. Login requires `email` and `password`. Centre creation requires `name` and `location`. Test creation requires `name`, positive `price`, and `centreId`. Booking creation requires `testId`, `centreId`, and a future ISO `appointmentAt`. Simulated payment requires `bookingId`. The webhook requires `eventId`, `paymentId`, `bookingId`, and `status` (`SUCCESS` or `FAILED`).

## Booking and Payment

Bookings begin as `PENDING`. A successful payment changes the booking to `CONFIRMED`; a failed payment changes it to `FAILED`. Cancellation changes a `PENDING` or `CONFIRMED` booking to `CANCELLED`. Other status changes are rejected.

Payments are simulated; no payment gateway is connected. The result is randomly `SUCCESS` or `FAILED`. The amount comes from the booking in the database. Payment creation and booking status updates use a Prisma transaction.

Webhook event IDs are unique. Repeated events return success without creating another payment or changing the booking again. A different event cannot process a booking that already has a payment. The webhook validates `paymentId`, but the current database model does not store it.

## Data and Security

Prisma models: `User`, `DiagnosticCentre`, `DiagnosticTest`, `Booking`, and `Payment`. Users own bookings; centres have tests and bookings; tests have bookings; each booking has at most one payment. Prices and booking/payment amounts use PostgreSQL decimal columns.

Zod validates request data. Signup normalizes email and hashes passwords with bcrypt. JWT-protected booking and simulated-payment operations use the token subject for ownership. Users cannot access or cancel another user's bookings.

## Tests and Build

Run tests:
```sh
npm test
```

The current Jest/Supertest suite contains 32 tests.

Build the production output:
```sh
npm run build
```

## Assumptions
- IDs are Prisma-generated CUID strings; positive numeric IDs are converted to strings during validation but are not database integer IDs.
- The public webhook is for the simulated assignment flow and does not verify a provider signature.

## Not Implemented
- Real payment processing or webhook signature verification.
- Pagination or filtering for list endpoints.
