import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const UserSchema = z.object({
  email: z.email().nonempty(),
  password: z.string().length(6).regex(/^\d+$/),
});

export class CreateUserDto extends createZodDto(UserSchema) {}
