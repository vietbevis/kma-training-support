import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicCredentialsEntity } from 'src/database/entities/academic-credentials.entity';
import { UserEntity } from 'src/database/entities/user.entity';
import { AcademicCredentialController } from './academic-credential.controller';
import { AcademicCredentialService } from './academic-credential.service';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicCredentialsEntity, UserEntity])],
  controllers: [AcademicCredentialController],
  providers: [AcademicCredentialService],
  exports: [AcademicCredentialService],
})
export class AcademicCredentialModule {}
