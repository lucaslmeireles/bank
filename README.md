# NovoBanco API

> A backend simulation of a real banking system — built to demonstrate ACID transactions, race conditions, message queues, and real-time communication using modern Node.js tooling.

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-FF4438?style=flat&logo=redis&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)
![DrizzleORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black)

---

## What this project is about

Most junior portfolios are CRUDs with JWT auth. This one goes further.

NovoBanco simulates the core of a real banking system — the part that actually matters: what happens when two users transfer money **at the same time**. The project demonstrates that the developer understands not just how to build an API, but *why* certain architectural decisions exist.

The interactive frontend visualizes every step in real time: the transaction starting, the database lock being acquired, the commit or rollback, and the final balance update via WebSocket.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                 Next.js (UI)                │
│  PhoneFrame ←→ BankContext ←→ Terminal      │
│         ↕ HTTP          ↕ WebSocket         │
└─────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────┐
│              NestJS (API)                   │
│  AuthModule → JwtGuard → TransactionsModule │
│                   ↓                         │
│            BullMQ Worker                    │
│    (processes queue in background)          │
│                   ↓                         │
│         WebSocket Gateway                   │
│   (emits real-time logs to frontend)        │
└─────────────────────────────────────────────┘
         │                    │
┌────────────────┐   ┌────────────────┐
│  PostgreSQL    │   │     Redis      │
│  (ACID, locks) │   │  (BullMQ queue)│
└────────────────┘   └────────────────┘
```

---

## Core concepts demonstrated

### ACID Transactions

Every transfer follows the full ACID contract:

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  INSERT INTO transactions (status) VALUES ('pending');
  SELECT * FROM accounts WHERE id = $1 FOR UPDATE;  -- acquires row lock
  -- validates balance
  UPDATE accounts SET balance = balance - $amount WHERE id = $from;
  UPDATE accounts SET balance = balance + $amount WHERE id = $to;
  UPDATE transactions SET status = 'committed';
COMMIT;
```

- **Atomicity** — debit and credit happen together or not at all. If credit fails, debit rolls back.
- **Consistency** — balance can never go negative. Business rules are validated before commit.
- **Isolation** — `SELECT FOR UPDATE` locks the rows. Two concurrent transactions on the same account wait, not corrupt.
- **Durability** — after `COMMIT`, the data is on disk. Crashes or restarts don't undo the operation.

### Race Conditions

The `/transactions` endpoint accepts concurrent requests. With `ISOLATION LEVEL SERIALIZABLE` and `SELECT FOR UPDATE`, only one transaction can hold the lock on a given account at a time. The others wait, re-read the balance after the lock is released, and roll back if the balance is no longer sufficient.

You can observe this live in the UI by enabling **Race ⚡ mode**.

### Message Queue (BullMQ)

In **Queue mode**, the API returns `202 Accepted` immediately. The actual ACID transaction is processed by a BullMQ worker in the background. The result is pushed to the frontend via WebSocket when the worker finishes.

This mirrors how real payment systems work: PIX in Brazil settles in under a second, but the queue is still there.

### Real-time Updates (WebSocket)

The NestJS WebSocket Gateway emits two types of events:

- `log:{userId}` — granular logs from inside the worker (BEGIN, SELECT FOR UPDATE, COMMIT/ROLLBACK)
- `transaction:updated` — final status change with updated balance

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| API | NestJS + TypeScript | Structured, testable, decorator-based |
| ORM | Drizzle ORM | Type-safe SQL, no magic |
| Database | PostgreSQL | ACID-compliant, row-level locking |
| Queue | BullMQ + Redis | Reliable job processing with retries |
| Auth | JWT + Argon2 | Industry-standard password hashing |
| Validation | Zod (nestjs-zod) | Runtime type safety on all inputs |
| Frontend | Next.js + Tailwind CSS | Fast, component-based UI |
| Real-time | Socket.io | WebSocket with fallback |
| Testing | Jest + Supertest | Unit + E2E test coverage |
| Health | @nestjs/terminus | Monitors DB, queue, memory, disk |

---

## Getting started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/your-username/novobank
cd novobank
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bank
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-here
NEXT_PUBLIC_API_URL=http://localhost:3000/v1/api
```

### 3. Start the infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL and Redis.

### 4. Run migrations

```bash
cd api
npx drizzle-kit migrate
```

### 5. Start the API

```bash
cd api
npm install
npm run start:dev
```

### 6. Start the frontend

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) and you're good to go.

---

## Running tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests (requires running infrastructure)
npm run test:e2e
```

---

## API Endpoints

All routes require `Authorization: Bearer <token>` except auth routes.

### Auth

| Method | Route | Description |
|---|---|---|
| `POST` | `/v1/api/auth/login` | Login with email and password |
| `POST` | `/v1/api/users` | Register a new user |

### Accounts

| Method | Route | Description |
|---|---|---|
| `POST` | `/v1/api/accounts` | Create a bank account |
| `GET` | `/v1/api/accounts` | List all accounts |
| `GET` | `/v1/api/accounts/:id` | Get account by ID |

### Transactions

| Method | Route | Description |
|---|---|---|
| `POST` | `/v1/api/transactions` | Create a transaction (ACID) |
| `GET` | `/v1/api/transactions` | List all transactions |
| `GET` | `/v1/api/transactions/:id` | Get transaction by ID |

### Health

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Returns status of DB, queue, memory, disk |

---

## Project structure

```
novobank/
├── api/                          # NestJS backend
│   ├── src/
│   │   ├── auth/                 # JWT auth, guards, strategies
│   │   ├── users/                # User management
│   │   ├── accounts/             # Bank accounts
│   │   ├── transactions/         # ACID transactions + BullMQ worker
│   │   │   ├── transactions.service.ts
│   │   │   ├── transactions.processor.ts   # BullMQ worker
│   │   │   └── dto/
│   │   ├── gateway/              # WebSocket gateway
│   │   ├── drizzle/              # Schema + migrations
│   │   ├── health/               # Health check indicators
│   │   └── filters/              # Global exception filter
│   └── test/                     # E2E tests
│
└── web/                          # Next.js frontend
    ├── app/
    │   └── page.tsx              # Main demo page
    ├── components/
    │   ├── PhoneFrame.tsx        # Mobile UI simulation
    │   └── Terminal.tsx          # Real-time API log viewer
    └── context/
        └── BankContext.tsx       # Shared state + API calls
```

---

## Design decisions worth mentioning

**Why `ISOLATION LEVEL SERIALIZABLE` instead of just `FOR UPDATE`?**
`FOR UPDATE` prevents dirty reads on the locked rows, but `SERIALIZABLE` also detects phantom reads and write skew across the entire transaction. For financial operations, this is the correct isolation level.

**Why BullMQ instead of handling everything synchronously?**
In a real bank, not all operations are instant. PIX settles fast, but TED/DOC are batch-processed at specific windows. BullMQ demonstrates the architectural pattern — the API acknowledges the request immediately (`202 Accepted`) and the actual processing happens asynchronously with retries built in.

**Why Drizzle instead of Prisma?**
Drizzle writes SQL that looks like SQL. `db.select().from(accounts).where(eq(...)).for('update')` maps directly to `SELECT ... FOR UPDATE`. There's no hidden query generation — which matters when the correctness of your SQL is the whole point of the project.

**Why Zod instead of class-validator?**
Zod validates at runtime with full TypeScript inference. The schema is the source of truth for both validation and types — no decorators, no duplication.

---

## License

MIT