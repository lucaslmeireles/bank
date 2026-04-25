import { execSync } from 'child_process';

export default async function setup() {
  process.env.NODE_ENV = 'test';

  execSync('dotenv -e .env.test npx drizzle-kit migrate', {
    stdio: 'inherit',
    env: { ...process.env },
  });
}
