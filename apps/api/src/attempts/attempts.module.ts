import { Module } from '@nestjs/common';
import { QuestionsModule } from '../questions/questions.module.js';
import { ReviewModule } from '../review/review.module.js';
import { AttemptsController } from './attempts.controller.js';
import { AttemptsService } from './attempts.service.js';

@Module({
  imports: [QuestionsModule, ReviewModule],
  controllers: [AttemptsController],
  providers: [AttemptsService],
})
export class AttemptsModule {}
