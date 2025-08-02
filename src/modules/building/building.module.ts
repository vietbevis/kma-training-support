import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingEntity } from 'src/database/entities/building.entity';
import { ClassroomEntity } from 'src/database/entities/classrooms.entity';
import { BuildingController } from './building.controller';
import { BuildingService } from './building.service';

@Module({
  imports: [TypeOrmModule.forFeature([BuildingEntity, ClassroomEntity])],
  controllers: [BuildingController],
  providers: [BuildingService],
  exports: [BuildingService],
})
export class BuildingModule {}
