import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@huquq/core';

/**
 * An error with an explicit API code and a user-facing (Azerbaijani) message.
 * Rendered by `AllExceptionsFilter` as `{ code, message, details? }`.
 */
export class ApiException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    readonly details?: unknown,
  ) {
    super(message, status);
  }

  static notFound(message = 'Tapılmadı', details?: unknown): ApiException {
    return new ApiException('NOT_FOUND', message, HttpStatus.NOT_FOUND, details);
  }

  static badRequest(message: string, details?: unknown): ApiException {
    return new ApiException('BAD_REQUEST', message, HttpStatus.BAD_REQUEST, details);
  }

  static validation(message: string, details?: unknown): ApiException {
    return new ApiException('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, details);
  }

  static forbidden(message = 'Bu əməliyyat üçün icazəniz yoxdur'): ApiException {
    return new ApiException('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}
