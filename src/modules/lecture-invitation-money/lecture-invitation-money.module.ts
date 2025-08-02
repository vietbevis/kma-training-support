import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicCredentialsEntity } from 'src/database/entities/academic-credentials.entity';
import { LectureInvitationMoneyEntity } from 'src/database/entities/lecture-invitation-money.entity';
import { LectureInvitationMoneyController } from './lecture-invitation-money.controller';
import { LectureInvitationMoneyService } from './lecture-invitation-money.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LectureInvitationMoneyEntity,
      AcademicCredentialsEntity,
    ]),
  ],
  controllers: [LectureInvitationMoneyController],
  providers: [LectureInvitationMoneyService],
  exports: [LectureInvitationMoneyService],
})
export class LectureInvitationMoneyModule {}
