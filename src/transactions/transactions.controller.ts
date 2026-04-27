import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/auth/decorators/user.decorator';
import type { User as UserType } from 'src/users/user.entity';
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @HttpCode(201)
  @Post()
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @User() user: UserType,
  ) {
    return this.transactionsService.create(createTransactionDto, user);
  }

  @HttpCode(202)
  @Post('/queue')
  createWithQueue(
    @Body() createTransactionDto: CreateTransactionDto,
    @User() user: UserType,
  ) {
    return this.transactionsService.createWithQueue(createTransactionDto, user);
  }
  @HttpCode(200)
  @Get()
  findAll() {
    return this.transactionsService.findAll();
  }
  @HttpCode(200)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.remove(id);
  }
}
