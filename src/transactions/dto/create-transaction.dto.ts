import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const transactionSchema = z.object({
  to: z.uuid().nonempty(),
  amount: z
    .number()
    .positive()
    .min(0.01)
    .transform((v) => v.toFixed(2)),
});

export class CreateTransactionDto extends createZodDto(transactionSchema) {}
