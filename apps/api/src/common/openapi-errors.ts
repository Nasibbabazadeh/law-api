import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { ErrorResponseSchema } from '@huquq/core';

export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}

const DESCRIPTIONS: Record<number, string> = {
  400: 'Validation failed (code VALIDATION_ERROR or BAD_REQUEST)',
  401: 'No valid session (code UNAUTHORIZED)',
  403: 'Not allowed (code FORBIDDEN)',
  404: 'Not found (code NOT_FOUND)',
};

/** Document the `{ code, message, details? }` error responses a route can return. */
export const ApiErrors = (...statuses: (400 | 401 | 403 | 404)[]) =>
  applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({ status, description: DESCRIPTIONS[status], type: ErrorResponseDto }),
    ),
  );
