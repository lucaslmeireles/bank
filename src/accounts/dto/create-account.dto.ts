import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const accountSchema = z.object({
  balance: z.float64().nonnegative().default(0.0),
  number: z.int().nonnegative().min(1).max(10000),
});

export class CreateAccountDto extends createZodDto(accountSchema) {}
