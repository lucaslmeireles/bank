// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { resetDatabase } from './helpers/database';
import { createAndLoginUser, createAccount } from './helpers/auth';
import { GlobalExceptionFilter } from '../src/filters/excpetion.filter';

describe('Transactions (e2e)', () => {
  let app: INestApplication;
  let token_ana: string;
  let token_bob: string;
  let fromAccountId: string;
  let toAccountId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('/v1/api');
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    token_ana = await createAndLoginUser(app);
    token_bob = await createAndLoginUser(app, 'bob@email.com');
    const [from] = await createAccount(app, token_ana, 1000.0);
    const [to] = await createAccount(app, token_bob, 500.0);
    console.log('from:', from); // ← e isso
    console.log('to:', to); // ← e isso
    fromAccountId = from.id;
    toAccountId = to.id;
  });

  afterAll(async () => {
    await resetDatabase();
    await app.close();
  });
  //Undefined
  describe('POST /v1/api/transactions', () => {
    it('deve criar com status pending', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/api/transactions')
        .set('Authorization', `Bearer ${token_ana}`)
        .send({ from: fromAccountId, to: toAccountId, amount: 100.0 });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('committed');
      expect(res.body.id).toBeDefined();
    });

    it('deve criar com status pending', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/api/transactions/queue')
        .set('Authorization', `Bearer ${token_ana}`)
        .send({ from: fromAccountId, to: toAccountId, amount: 100.0 });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe('pending');
      expect(res.body.id).toBeDefined();
    });

    it('deve rejeitar saldo insuficiente', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/api/transactions')
        .set('Authorization', `Bearer ${token_ana}`)
        .send({ from: fromAccountId, to: toAccountId, amount: 99999.0 });
      console.log({ from: fromAccountId, to: toAccountId, amount: 99999.0 });
      expect(res.status).toBe(422);
      expect(res.body.message).toBe('Saldo insuficiente');
    });

    it('deve rejeitar amount negativo', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/api/transactions')
        .set('Authorization', `Bearer ${token_ana}`)
        .send({ from: fromAccountId, to: toAccountId, amount: -50 });

      expect(res.status).toBe(422);
    });

    it('deve rejeitar sem token', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/api/transactions')
        .send({ from: fromAccountId, to: toAccountId, amount: 100 });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /v1/api/transactions/:id', () => {
    it('deve retornar a transação pelo id', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/api/transactions')
        .set('Authorization', `Bearer ${token_ana}`)
        .send({ from: fromAccountId, to: toAccountId, amount: 50 });
      console.log(created.body);
      const res = await request(app.getHttpServer())
        .get(`/v1/api/transactions/${created.body.id}`)
        .set('Authorization', `Bearer ${token_ana}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('deve retornar 400 para valor não valido', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/api/transactions/uuid-inexistente')
        .set('Authorization', `Bearer ${token_ana}`);

      expect(res.status).toBe(400);
    });

    it('deve retornar 404 para uuid não existente', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/api/transactions/59bf4e69-80ea-49fe-b533-16b8856c7978')
        .set('Authorization', `Bearer ${token_ana}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /v1/api/transactions/:id', () => {
    it('deve deletar a transação', async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/api/transactions')
        .set('Authorization', `Bearer ${token_ana}`)
        .send({ from: fromAccountId, to: toAccountId, amount: 25 });

      const res = await request(app.getHttpServer())
        .delete(`/v1/api/transactions/${created.body.id}`)
        .set('Authorization', `Bearer ${token_ana}`);

      expect(res.status).toBe(200);
    });
  });
});
