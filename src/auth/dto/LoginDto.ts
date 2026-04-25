import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const loginSchema = z.object({
  email: z.email().nonempty(),
  password: z.string().regex(/^\d+$/),
});

export class LoginDto extends createZodDto(loginSchema) {}
