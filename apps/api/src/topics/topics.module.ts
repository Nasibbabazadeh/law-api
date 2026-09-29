import { Module } from '@nestjs/common';
import { QuestionsModule } from '../questions/questions.module.js';
import { TopicsController } from './topics.controller.js';
import { TopicsService } from './topics.service.js';

@Module({
  imports: [QuestionsModule],
  controllers: [TopicsController],
  providers: [TopicsService],
})
export class TopicsModule {}
