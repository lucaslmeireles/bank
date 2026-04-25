import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { DrizzleQueryError } from 'drizzle-orm/errors';
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.resolve(exception);

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): {
    status: number;
    message: string | object;
  } {
    // Erro de validação do Zod (nestjs-zod)
    if (exception instanceof ZodValidationException) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: exception.getZodError() as ZodError,
      };
    }

    // HttpException do próprio NestJS (NotFoundException, UnauthorizedException etc)
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: exception.message,
      };
    }

    // Erros de domínio lançados no service (saldo insuficiente, conta não encontrada)
    if (exception instanceof Error) {
      const domainErrors: Record<string, number> = {
        'Saldo insuficiente': HttpStatus.UNPROCESSABLE_ENTITY,
        'Conta não encontrada': HttpStatus.NOT_FOUND,
        'Conta de origem e destino não podem ser iguais':
          HttpStatus.BAD_REQUEST,
      };

      const status = domainErrors[exception.message];
      if (status) {
        return { status, message: exception.message };
      }

      const cause = (exception as any).cause;
      if (cause?.code) {
        return this.resolvePostgresError(cause.code);
      }
    }

    // Qualquer coisa inesperada
    console.error(exception);
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
    };
  }

  private resolvePostgresError(code: string): {
    status: number;
    message: string;
  } {
    const pgErrors: Record<string, { status: number; message: string }> = {
      '40001': {
        status: HttpStatus.CONFLICT,
        message:
          'Operação não pôde ser concluída devido a alta concorrência. Tente novamente.',
      },
      '40P01': {
        status: HttpStatus.CONFLICT,
        message: 'Deadlock detectado. Tente novamente em instantes.',
      },
      '23505': {
        status: HttpStatus.CONFLICT,
        message: 'Registro duplicado. O dado informado já existe.',
      },
      '23503': {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Referência inválida. O recurso relacionado não existe.',
      },
      '23514': {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Operação viola uma regra de negócio do banco de dados.',
      },
    };

    return (
      pgErrors[code] ?? {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro interno do servidor',
      }
    );
  }
}
