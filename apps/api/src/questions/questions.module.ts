import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service.js';

@Module({ providers: [QuestionsService], exports: [QuestionsService] })
export class QuestionsModule {}
