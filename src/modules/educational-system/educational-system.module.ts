import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EducationalSystemEntity } from 'src/database/entities/educational-system.entity';
import { EducationalSystemController } from './educational-system.controller';
import { EducationalSystemService } from './educational-system.service';

@Module({
  imports: [TypeOrmModule.forFeature([EducationalSystemEntity])],
  controllers: [EducationalSystemController],
  providers: [EducationalSystemService],
  exports: [EducationalSystemService],
})
export class EducationalSystemModule {}
