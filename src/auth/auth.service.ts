import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    if (!email || !password) throw new Error('Sem valor');

    const user = await this.usersService.findByEmail(email);

    if (!user) throw new NotFoundException('User not found');

    const verifyPassword = await argon.verify(user.password, password);

    if (!verifyPassword) throw new ForbiddenException('Wrong Credetials');

    return {
      id: user.id,
      email: user.email,
      create_at: user.created_at,
    };
  }

  async login(user: User) {
    const payload = {
      id: user.id,
      email: user.email,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      userId: user.id,
    };
  }

  async register(dto: CreateUserDto) {
    await this.usersService.create(dto);
  }

  async keypad() {}
}
