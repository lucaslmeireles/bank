// test-race.ts
const BASE_URL = 'http://localhost:3000';

// IDs reais do seu banco — ajuste antes de rodar
const FROM_ACCOUNT = 'b5013d46-f823-466b-97d6-b81dfa573f84';
const TO_ACCOUNT = 'bad48e73-343f-4912-8268-52e8f071c78a';
const AMOUNT = 100;
const CONCURRENCY = 10; // 10 transferências simultâneas

async function transfer(id: number) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/transactions/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_ACCOUNT,
        to: TO_ACCOUNT,
        amount: AMOUNT,
      }),
    });
    const data = await res.json();
    const elapsed = Date.now() - start;

    if (res.ok) {
      console.log(
        `[${id}] ✓ COMMITTED em ${elapsed}ms — status: ${data.status}`,
      );
    } else {
      console.log(`[${id}] ✗ REJEITADO em ${elapsed}ms — ${data.message}`);
    }
  } catch (err) {
    console.log(`[${id}] ✗ ERRO de rede — ${err.message}`);
  }
}

async function run() {
  // Busca saldo antes
  const before = await fetch(`${BASE_URL}/accounts/${FROM_ACCOUNT}`).then((r) =>
    r.json(),
  );
  console.log(`\nSaldo inicial: R$ ${before.balance}`);
  console.log(
    `Disparando ${CONCURRENCY} transferências de R$ ${AMOUNT} simultâneas...\n`,
  );

  // Dispara todas ao mesmo tempo
  const requests = Array.from({ length: CONCURRENCY }, (_, i) =>
    transfer(i + 1),
  );
  await Promise.all(requests);

  // Busca saldo depois
  const after = await fetch(`${BASE_URL}/accounts/${FROM_ACCOUNT}`).then((r) =>
    r.json(),
  );
  console.log(`\nSaldo final: R$ ${after.balance}`);

  // Validação — quantas passaram?
  const expectedDebit =
    (Number(before.balance) - Number(after.balance)) / AMOUNT;
  console.log(`Transações que passaram: ${expectedDebit}`);
  console.log(
    `Saldo correto? ${Number(after.balance) >= 0 ? '✓ SIM' : '✗ NÃO — race condition vazou!'}`,
  );
}

run();
