// eslint-disable-next-line @typescript-eslint/no-require-imports
import request = require('supertest');
import { INestApplication } from '@nestjs/common';

export async function createAndLoginUser(
  app: INestApplication,
  email = 'test@test.com',
  password = '123456',
) {
  await request(app.getHttpServer())
    .post('/v1/api/auth/register')
    .send({ email, password });

  const res = await request(app.getHttpServer())
    .post('/v1/api/auth/login')
    .send({ email, password });

  return res.body.access_token as string;
}

export async function createAccount(
  app: INestApplication,
  token: string,
  balance = 1000.0,
) {
  const accountNumber = Math.floor(Math.random() * 1000);

  const res = await request(app.getHttpServer())
    .post('/v1/api/accounts')
    .set('Authorization', `Bearer ${token}`)
    .send({ balance: Number(balance), number: accountNumber });
  console.log('createAccount response:', res.body);
  return res.body;
}
