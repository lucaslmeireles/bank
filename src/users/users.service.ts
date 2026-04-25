import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import * as schema from '../drizzle/schema';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../drizzle/drizzle.service';

@Injectable()
export class UsersService {
  constructor(private readonly drizzle: DrizzleService) {}
  async create(dto: CreateUserDto) {
    const data = {
      email: dto.email,
      password: await argon2.hash(dto.password),
    };
    return this.drizzle.db
      .insert(schema.users)
      .values(data)
      .returning({ email: schema.users.email });
  }

  /**
   * Use only for auth flow, return the password_hash
   * @param email string
   * @returns complete user
   */
  async findByEmail(email: string) {
    const [user] = await this.drizzle.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email));
    return user;
  }
  async findOne(id: string) {
    const [user] = await this.drizzle.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        created_at: schema.users.created_at,
      })
      .from(schema.users)
      .where(eq(schema.users.id, id));
    return user;
  }

  async remove(id: string) {
    await this.drizzle.db.delete(schema.users).where(eq(schema.users.id, id));
  }
}
