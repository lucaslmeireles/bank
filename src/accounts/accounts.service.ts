import { Injectable } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { DrizzleService } from '../drizzle/drizzle.service';
import * as schema from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { User } from 'src/users/user.entity';
@Injectable()
export class AccountsService {
  constructor(private readonly drizzle: DrizzleService) {}
  async create(dto: CreateAccountDto, owner: User) {
    return await this.drizzle.db
      .insert(schema.accounts)
      .values({
        ...dto,
        balance: dto.balance.toString(),
        owner: owner.id,
      })
      .returning();
  }

  async findAll() {
    const accounts = await this.drizzle.db.select().from(schema.accounts);
    return accounts;
  }

  async findOne(id: string) {
    const [account] = await this.drizzle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.id, id));

    return account;
  }

  async remove(id: string) {
    return await this.drizzle.db
      .delete(schema.accounts)
      .where(eq(schema.accounts.id, id));
  }

  async getBalance(id: string) {
    return await this.drizzle.db
      .select({
        id: schema.accounts.id,
        balance: schema.accounts.balance,
      })
      .from(schema.accounts)
      .where(eq(schema.accounts.id, id));
  }
}
