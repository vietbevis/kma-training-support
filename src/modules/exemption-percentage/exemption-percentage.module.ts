import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExemptionPercentageEntity } from 'src/database/entities/exemption-percentage.entity';
import { ExemptionPercentageController } from './exemption-percentage.controller';
import { ExemptionPercentageService } from './exemption-percentage.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExemptionPercentageEntity])],
  controllers: [ExemptionPercentageController],
  providers: [ExemptionPercentageService],
  exports: [ExemptionPercentageService],
})
export class ExemptionPercentageModule {}
