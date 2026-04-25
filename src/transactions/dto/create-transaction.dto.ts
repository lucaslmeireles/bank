import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const transactionSchema = z
  .object({
    from: z.uuid().nonempty(),
    to: z.uuid().nonempty(),
    amount: z
      .number()
      .positive()
      .min(0.01)
      .transform((v) => v.toFixed(2)),
  })
  .refine((data) => data.from !== data.to, {
    message: 'Conta de origem e destino não podem ser iguais',
    path: ['to'],
  });
export class CreateTransactionDto extends createZodDto(transactionSchema) {}
