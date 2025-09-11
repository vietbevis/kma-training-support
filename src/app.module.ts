import {
  ClassSerializerInterceptor,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AcademicCredentialModule } from './modules/academic-credential/academic-credential.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { AccountModule } from './modules/account/account.module';
import { AuditContextInterceptor } from './modules/audit-log/audit-context.interceptor';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuthModule } from './modules/auth/auth.module';
import { BuildingModule } from './modules/building/building.module';
import { ClassroomModule } from './modules/classroom/classroom.module';
import { CourseModule } from './modules/course/course.module';
import { EducationalSystemModule } from './modules/educational-system/educational-system.module';
import { ExemptionPercentageModule } from './modules/exemption-percentage/exemption-percentage.module';
import { FacultyDepartmentModule } from './modules/faculty-department/faculty-department.module';
import { FilesModule } from './modules/files/files.module';
import { LectureInvitationMoneyModule } from './modules/lecture-invitation-money/lecture-invitation-money.module';
import { PermissionModule } from './modules/permission/permission.module';
import { RoleModule } from './modules/role/role.module';
import { StandardLectureHoursModule } from './modules/standard-lecture-hours/standard-lecture-hours.module';
import { SubjectModule } from './modules/subject/subject.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { UserModule } from './modules/user/user.module';
import { VisitingLecturerModule } from './modules/visiting-lecturer/visiting-lecturer.module';
import { JwtGuard } from './shared/guards/jwt.guard';
import { CompressionMiddleware } from './shared/middlewares/compression.middleware';
import { HelmetMiddleware } from './shared/middlewares/helmet.middleware';
import { MorganMiddleware } from './shared/middlewares/morgan.middleware';
import { SharedModule } from './shared/shared.module';
import { TimeslotsModule } from './modules/timeslots/timeslots.module';
import { BackupModule } from './modules/backup/backup.module';

@Module({
  imports: [
    DatabaseModule,
    SharedModule,
    AcademicCredentialModule,
    AuditLogModule.forRoot({
      batchSize: 50,
      async: true,
      maxDescriptionLength: 2500,
      trackOldValues: true,
      trackNewValues: true,
      maxFieldsToShow: 10,
      flushInterval: 5000,
    }),
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
    VisitingLecturerModule,
    AccountModule,
    AuthModule,
    FilesModule,
    TimetableModule,
    TimeslotsModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditContextInterceptor,
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
