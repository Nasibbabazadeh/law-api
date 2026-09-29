import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import type { ErrorCode, ErrorResponse } from '@huquq/core';
import { ApiException } from './api-exception.js';
import { zodIssues } from './zod-issues.js';

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'BAD_REQUEST',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

/** User-facing default messages (Azerbaijani) for errors raised outside our own code. */
const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Göndərilən məlumatlar yanlışdır',
  BAD_REQUEST: 'Sorğu yanlışdır',
  UNAUTHORIZED: 'Daxil olmaq tələb olunur',
  FORBIDDEN: 'Bu əməliyyat üçün icazəniz yoxdur',
  NOT_FOUND: 'Tapılmadı',
  CONFLICT: 'Məlumat artıq mövcuddur',
  TOO_MANY_REQUESTS: 'Çox sayda sorğu göndərildi, bir az sonra yenidən cəhd edin',
  INTERNAL_ERROR: 'Gözlənilməz xəta baş verdi',
};

function clientErrorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const value = typeof status === 'number' ? status : statusCode;
  return typeof value === 'number' && value >= 400 && value < 500 ? value : null;
}

/** Renders every error as `{ code, message, details? }`. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toResponse(exception);
    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    response.status(status).json(body);
  }

  private toResponse(exception: unknown): { status: number; body: ErrorResponse } {
    if (exception instanceof ApiException) {
      const body: ErrorResponse = { code: exception.code, message: exception.message };
      if (exception.details !== undefined) body.details = exception.details;
      return { status: exception.getStatus(), body };
    }

    if (exception instanceof ZodValidationException) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          code: 'VALIDATION_ERROR',
          message: DEFAULT_MESSAGES.VALIDATION_ERROR,
          details: zodIssues(exception.getZodError()),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code: ErrorCode =
        CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
      return { status, body: { code, message: DEFAULT_MESSAGES[code] } };
    }

    // Errors from Express middleware such as body-parser (malformed JSON, body too large).
    const clientStatus = clientErrorStatus(exception);
    if (clientStatus !== null) {
      const code = CODE_BY_STATUS[clientStatus] ?? 'BAD_REQUEST';
      return { status: clientStatus, body: { code, message: DEFAULT_MESSAGES[code] } };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: DEFAULT_MESSAGES.INTERNAL_ERROR },
    };
  }
}
