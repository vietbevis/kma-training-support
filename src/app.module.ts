import {
  ClassSerializerInterceptor,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AcademicCredentialModule } from './modules/academic-credential/academic-credential.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { AccountModule } from './modules/account/account.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { BuildingModule } from './modules/building/building.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { CourseModule } from './modules/course/course.module';
import { EducationalSystemModule } from './modules/educational-system/educational-system.module';
import { ExemptionPercentageModule } from './modules/exemption-percentage/exemption-percentage.module';
import { FacultyDepartmentModule } from './modules/faculty-department/faculty-department.module';
import { LectureInvitationMoneyModule } from './modules/lecture-invitation-money/lecture-invitation-money.module';
import { PermissionModule } from './modules/permission/permission.module';
import { RoleModule } from './modules/role/role.module';
import { StandardLectureHoursModule } from './modules/standard-lecture-hours/standard-lecture-hours.module';
import { SubjectModule } from './modules/subject/subject.module';
import { UserModule } from './modules/user/user.module';
import { CompressionMiddleware } from './shared/middlewares/compression.middleware';
import { HelmetMiddleware } from './shared/middlewares/helmet.middleware';
import { MorganMiddleware } from './shared/middlewares/morgan.middleware';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    DatabaseModule,
    SharedModule,
    AcademicCredentialModule,
    AuditLogModule,
    FacultyDepartmentModule,
    SubjectModule,
    PermissionModule,
    RoleModule,
    AcademicYearsModule,
    BuildingModule,
    ClassroomModule,
    CourseModule,
    EducationalSystemModule,
    LectureInvitationMoneyModule,
    StandardLectureHoursModule,
    ExemptionPercentageModule,
    UserModule,
    AccountModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MorganMiddleware, HelmetMiddleware, CompressionMiddleware)
      .forRoutes('*path');
  }
}
