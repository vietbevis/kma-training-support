import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TimetableEntity } from 'src/database/entities/timetable.entity';
import { Public } from 'src/shared/decorators/public.decorator';
import { KyHoc } from 'src/shared/enums/semester.enum';
import { ExcelFileValidator } from './excel-file.validator';
import { ExcelParserService } from './excel-parser.service';
import {
  CreateTimetableDto,
  TimetableConflictCheckDto,
  TimetableQueryDto,
  TimetableResponseDto,
  TimetableUploadDto,
  UpdateTimetableDto,
} from './timetable.dto';
import { TimetableService } from './timetable.service';

@ApiTags('Timetable - Thời khóa biểu')
@Controller('timetables')
@Public()
export class TimetableController {
  constructor(
    private readonly timetableService: TimetableService,
    private readonly excelParserService: ExcelParserService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo thời khóa biểu mới' })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
    type: TimetableResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Trung lịch phòng học' })
  async create(
    @Body() createTimetableDto: CreateTimetableDto,
  ): Promise<TimetableEntity> {
    return await this.timetableService.create(createTimetableDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thời khóa biểu' })
  async findAll(@Query() query: TimetableQueryDto) {
    return await this.timetableService.findAll(query);
  }

  @Get('weekly-schedule')
  @ApiOperation({ summary: 'Lấy thời khóa biểu theo tuần' })
  @ApiQuery({ name: 'academicYearId', description: 'ID năm học' })
  @ApiQuery({ name: 'semester', enum: KyHoc, description: 'Kỳ học' })
  @ApiQuery({
    name: 'week',
    description: 'Ngày trong tuần muốn xem (YYYY-MM-DD)',
  })
  async getWeeklySchedule(
    @Query('academicYearId') academicYearId: string,
    @Query('semester') semester: KyHoc,
    @Query('week') week: string,
  ) {
    return await this.timetableService.getWeeklySchedule(
      academicYearId,
      semester,
      new Date(week),
    );
  }

  @Post('check-conflict')
  @ApiOperation({ summary: 'Kiểm tra xung đột lịch học' })
  @ApiResponse({ status: 200, description: 'Không có xung đột' })
  @ApiResponse({ status: 409, description: 'Có xung đột lịch học' })
  async checkConflict(
    @Body() conflictDto: TimetableConflictCheckDto,
  ): Promise<{ message: string }> {
    await this.timetableService.checkConflict(conflictDto);
    return { message: 'Không có xung đột lịch học' };
  }

  @Post('upload-excel')
  @ApiOperation({ summary: 'Upload thời khóa biểu từ file Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File Excel chứa thời khóa biểu',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        semester: {
          type: 'string',
          enum: Object.values(KyHoc),
        },
        academicYearId: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcel(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new ExcelFileValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('semester') semester: KyHoc,
    @Body('academicYearId') academicYearId: string,
  ) {
    // Parse Excel file and convert to DTO
    const excelData = await this.parseExcelFile(file);

    const uploadDto: TimetableUploadDto = {
      semester,
      academicYearId,
      data: excelData,
    };

    return await this.timetableService.uploadFromExcel(uploadDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin thời khóa biểu theo ID' })
  @ApiParam({ name: 'id', description: 'ID thời khóa biểu' })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin thành công',
    type: TimetableResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async findOne(@Param('id') id: string): Promise<TimetableEntity> {
    return await this.timetableService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thời khóa biểu' })
  @ApiParam({ name: 'id', description: 'ID thời khóa biểu' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    type: TimetableResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  @ApiResponse({ status: 409, description: 'Trung lịch phòng học' })
  async update(
    @Param('id') id: string,
    @Body() updateTimetableDto: UpdateTimetableDto,
  ): Promise<TimetableEntity> {
    return await this.timetableService.update(id, updateTimetableDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thời khóa biểu' })
  @ApiParam({ name: 'id', description: 'ID thời khóa biểu' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.timetableService.remove(id);
    return { message: 'Xóa thời khóa biểu thành công' };
  }

  // Helper method to parse Excel file
  private async parseExcelFile(file: Express.Multer.File): Promise<any[]> {
    return await this.excelParserService.parseExcelFile(file.buffer);
  }
}
