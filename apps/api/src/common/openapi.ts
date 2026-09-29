import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

/** Swagger UI at /docs, JSON at /docs/json. Shapes come from the zod schemas in @huquq/core. */
export function setupOpenApi(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Hüquq API')
    .setDescription(
      [
        'REST API for the Hüquq law-learning app. All routes are under `/v1`.',
        '',
        'Authentication is handled by Better Auth under `/v1/auth/*` (sign-up/email, sign-in/email,',
        'sign-in/social, request-password-reset, reset-password, get-session, sign-out).',
        'Browsers use the session cookie; native apps can send it too, or use the',
        '`Authorization: Bearer` header if the bearer plugin is enabled later.',
        '',
        'Errors are always `{ code, message, details? }`; messages are in Azerbaijani.',
      ].join('\n'),
    )
    .setVersion('1')
    .addCookieAuth('better-auth.session_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document), {
    jsonDocumentUrl: 'docs/json',
  });
}
