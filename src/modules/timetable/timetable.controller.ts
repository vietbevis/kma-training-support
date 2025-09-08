import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiTags,
} from '@nestjs/swagger';
import { TimetableEntity } from 'src/database/entities/timetable.entity';
import { ExcelFileValidator } from './excel-file.validator';
import { ExcelParserService } from './excel-parser.service';
import {
  TimetableQueryDto,
  TimetableUploadDto,
  UpdateTimetableDto,
} from './timetable.dto';
import { TimetableService } from './timetable.service';

@ApiTags('Timetable - Thời khóa biểu')
@Controller('timetables')
export class TimetableController {
  constructor(
    private readonly timetableService: TimetableService,
    private readonly excelParserService: ExcelParserService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Lấy thời khóa biểu (danh sách các lớp học phần trong thời khoá biểu)',
  })
  async findAll(@Query() query: TimetableQueryDto) {
    return await this.timetableService.findAll(query);
  }

  @Post('upload-excel')
  @ApiOperation({ summary: 'Upload thời khóa biểu từ file Excel' })
  @HttpCode(HttpStatus.CREATED)
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
  ) {
    // Parse Excel file and convert to DTO
    const excelData = await this.parseExcelFile(file);

    const uploadDto: TimetableUploadDto = {
      data: excelData,
    };

    return await this.timetableService.uploadFromExcel(uploadDto);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Lấy thông tin lớp học phần trong thời khóa biểu theo ID của lớp học phần',
  })
  @ApiParam({ name: 'id', description: 'ID thời khóa biểu' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<TimetableEntity> {
    return await this.timetableService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật lớp học phần trong thời khóa biểu' })
  @ApiParam({ name: 'id', description: 'ID thời khóa biểu' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateTimetableDto: UpdateTimetableDto,
  ): Promise<TimetableEntity> {
    return await this.timetableService.update(id, updateTimetableDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa lớp học phần trong thời khóa biểu' })
  @ApiParam({ name: 'id', description: 'ID thời khóa biểu' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.timetableService.remove(id);
    return { message: 'Xóa thời khóa biểu thành công' };
  }

  // Helper method to parse Excel file
  private async parseExcelFile(file: Express.Multer.File): Promise<any[]> {
    return await this.excelParserService.parseExcelFile(file.buffer);
  }
}
