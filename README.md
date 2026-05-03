# NovoBanco API

> Simulação do núcleo de um sistema bancário real — transações ACID, race conditions, filas assíncronas e comunicação em tempo real via WebSocket.

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-FF4438?style=flat&logo=redis&logoColor=white)
![DrizzleORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black)
![Jest](https://img.shields.io/badge/Jest-C21325?style=flat&logo=jest&logoColor=white)

---

## 🌐 Demo ao vivo

**Frontend:** [https://bank-frontend-snowy.vercel.app](https://bank-frontend-snowy.vercel.app)

Use as credenciais abaixo para explorar o sistema:

| Email | Senha | Conta | Saldo inicial |
|---|---|---|---|
| alice@demo.com | demo123 | 1001 | R$ 5.000,00 |
| bob@demo.com | demo123 | 1002 | R$ 3.000,00 |
| carol@demo.com | demo123 | 1003 | R$ 7.500,00 |

> Faça login com Alice e transfira para Bob ou Carol. Ative o modo **Race ⚡** para disparar 3 transferências simultâneas e observar o isolamento de transações em ação.

---

## Sobre o projeto

A maioria dos portfólios junior é um CRUD com JWT. Este vai além.

O NovoBanco simula a parte de um sistema bancário que realmente importa: o que acontece quando dois usuários transferem dinheiro **ao mesmo tempo**. O projeto demonstra que o desenvolvedor entende não apenas como construir uma API, mas *por que* certas decisões arquiteturais existem — e quais as consequências de não tomá-las.

O frontend interativo visualiza cada etapa em tempo real: a transação iniciando, o lock sendo adquirido no banco de dados, o commit ou rollback, e o saldo sendo atualizado via WebSocket.

---

## Arquitetura

```
┌──────────────────────────────────────────────────┐
│         Next.js — bank-frontend-snowy.vercel.app │
│     PhoneFrame ←→ BankContext ←→ Terminal        │
│            ↕ HTTP           ↕ WebSocket          │
└──────────────────────────────────────────────────┘
                       │
┌──────────────────────────────────────────────────┐
│              NestJS API (Cloud Run)              │
│   AuthModule → JwtGuard → TransactionsModule     │
│                    ↓                             │
│             BullMQ Worker                        │
│     (processa transações em background)          │
│                    ↓                             │
│          WebSocket Gateway                       │
│    (emite logs e status em tempo real)           │
└──────────────────────────────────────────────────┘
          │                       │
┌──────────────────┐   ┌──────────────────┐
│   PostgreSQL     │   │      Redis       │
│   Supabase       │   │     Upstash      │
│  (ACID, locks)   │   │  (fila BullMQ)   │
└──────────────────┘   └──────────────────┘
```

---

## Conceitos demonstrados

### Transações ACID

Cada transferência segue o contrato ACID completo:

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  INSERT INTO transactions (status) VALUES ('pending');
  SELECT * FROM accounts WHERE id = $1 FOR UPDATE; -- trava a linha
  -- valida saldo
  UPDATE accounts SET balance = balance - $amount WHERE id = $from;
  UPDATE accounts SET balance = balance + $amount WHERE id = $to;
  UPDATE transactions SET status = 'committed';
COMMIT;
-- em qualquer erro: ROLLBACK + status = 'rolled_back'
```

| Propriedade | Implementação |
|---|---|
| **Atomicidade** | Débito e crédito em uma única transação. Erro em qualquer etapa reverte tudo. |
| **Consistência** | Saldo validado antes do commit. Nunca fica negativo. |
| **Isolamento** | `SELECT FOR UPDATE` + `SERIALIZABLE`. Transações concorrentes esperam, não corrompem. |
| **Durabilidade** | Após `COMMIT`, o dado está persistido. Crashes não desfazem a operação. |

### Race Conditions

O endpoint `POST /transactions` aceita requisições concorrentes. Com `ISOLATION LEVEL SERIALIZABLE` e `SELECT FOR UPDATE`, apenas uma transação pode segurar o lock de uma conta por vez. As demais aguardam, releem o saldo e fazem rollback se necessário.

Visível na prática ativando o modo **Race ⚡** no frontend — 3 transferências simultâneas via `Promise.all`, onde apenas as que cabem no saldo são commitadas.

### Fila Assíncrona (BullMQ)

No modo **Queue**, a API retorna `202 Accepted` imediatamente. O worker processa a transação em background com retries automáticos em caso de falha. O resultado é enviado via WebSocket quando concluído — o mesmo padrão usado por sistemas de pagamento reais.

### WebSocket em Tempo Real

O Gateway do NestJS emite dois eventos:

- `log:{userId}` — logs granulares do worker em cada etapa (BEGIN, SELECT FOR UPDATE, COMMIT/ROLLBACK)
- `transaction:updated` — status final com saldo atualizado

O terminal no frontend exibe esses eventos em tempo real, simulando o que seria o log do servidor.

### Exception Filter Global

Todos os erros do Postgres são mapeados para respostas HTTP semânticas:

| Código Postgres | HTTP | Situação |
|---|---|---|
| `40001` | `409 Conflict` | Conflito de serialização (race condition) |
| `40P01` | `409 Conflict` | Deadlock detectado |
| `23505` | `409 Conflict` | Unique constraint (email/número duplicado) |
| `23503` | `422 Unprocessable` | Foreign key inválida |

---

## Stack

| Camada | Tecnologia | Por quê |
|---|---|---|
| API | NestJS + TypeScript | Estruturado, testável, orientado a módulos |
| ORM | Drizzle ORM | SQL explícito e type-safe, sem abstração desnecessária |
| Banco | PostgreSQL (Supabase) | ACID nativo, lock por linha com `FOR UPDATE` |
| Fila | BullMQ + Redis (Upstash) | Jobs confiáveis com retries e backoff exponencial |
| Auth | Passport + JWT + Argon2 | Padrão da indústria para autenticação e hash |
| Validação | Zod + nestjs-zod | Runtime type safety, schema como fonte única da verdade |
| Tempo real | Socket.io | WebSocket com fallback automático |
| Testes | Jest + Supertest | Unitários e E2E com banco real |
| Health | @nestjs/terminus | Monitora DB, fila, memória e disco |
| Deploy | Google Cloud Run + Docker | Containerizado, escala para zero |

---

## Rodando localmente

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/novobank-api
cd novobank-api
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bank
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=sua-chave-secreta
NODE_ENV=development
```

### 3. Suba a infraestrutura

```bash
docker compose up -d
```

### 4. Migrations e seed

```bash
npx drizzle-kit migrate
npm run seed
```

### 5. Inicie a API

```bash
npm install
npm run start:dev
```

API disponível em `http://localhost:3000/v1/api`.
Documentação Swagger em `http://localhost:3000/docs`.

---

## Testes

```bash
# unitários
npm run test

# unitários com cobertura
npm run test:cov

# E2E (requer infraestrutura rodando)
npm run test:e2e
```

Os testes E2E sobem um banco de teste isolado, rodam as migrations automaticamente e truncam as tabelas ao final.

---

## Endpoints

Todas as rotas exigem `Authorization: Bearer <token>` exceto as de auth.

### Auth

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/v1/api/auth/login` | Login com email e senha |

### Usuários

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/v1/api/users` | Criar usuário |
| `GET` | `/v1/api/users/:id` | Buscar usuário por ID |

### Contas

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/v1/api/accounts` | Criar conta bancária |
| `GET` | `/v1/api/accounts` | Listar contas |
| `GET` | `/v1/api/accounts/:id` | Buscar conta por ID |

### Transações

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/v1/api/transactions` | Criar transação ACID |
| `GET` | `/v1/api/transactions` | Listar transações |
| `GET` | `/v1/api/transactions/:id` | Buscar transação por ID |

### Health

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status de DB, fila, memória e disco |

---

## Estrutura do projeto

```
src/
├── auth/                   # Autenticação JWT + Passport
├── users/                  # Módulo de usuários
├── accounts/               # Módulo de contas bancárias
├── transactions/
│   ├── transactions.service.ts      # Lógica ACID síncrona
│   ├── transactions.processor.ts    # Worker BullMQ
│   ├── transactions.controller.ts
│   └── dto/
├── gateway/                # WebSocket gateway
├── drizzle/                # Schema, migrations, seed
├── health/                 # Health indicators
├── redis/                  # Cliente Redis compartilhado
└── filters/                # Exception filter global (códigos Postgres)

test/
├── transactions.e2e-spec.ts
└── helpers/
    ├── auth.ts             # createAndLoginUser, createAccount
    ├── database.ts         # resetDatabase
    └── wait.ts             # waitForTransaction (polling WebSocket)
```

---

## Decisões de design

**Por que `SERIALIZABLE` em vez de só `READ COMMITTED` com `FOR UPDATE`?**
O `FOR UPDATE` previne leituras sujas nas linhas travadas, mas o `SERIALIZABLE` detecta também phantom reads e write skew em toda a transação. Para operações financeiras, é o nível correto.

**Por que Drizzle em vez de Prisma?**
O Drizzle escreve SQL que parece SQL — `db.select().from(accounts).where(eq(...)).for('update')` mapeia diretamente para `SELECT ... FOR UPDATE`. Não há geração oculta de queries, o que importa quando a correção do SQL é o ponto central do projeto.

**Por que Zod em vez de class-validator?**
O schema Zod é a fonte única da verdade para validação e tipos. Sem decorators, sem duplicação — o tipo TypeScript é inferido automaticamente do schema de validação.

**Por que o exception filter mapeia códigos do Postgres?**
Expor `duplicate key value violates unique constraint` para o cliente não é aceitável em produção. O filter centraliza o mapeamento de todos os erros conhecidos do Postgres para respostas HTTP semânticas, sem vazar detalhes internos.

---

## Licença

MIT