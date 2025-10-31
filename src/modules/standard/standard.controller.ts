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
import { StandardEntity } from 'src/database/entities/standard.entity';
import {
  CreateStandardDto,
  StandardQueryDto,
  StandardUploadDto,
  UpdateStandardDto,
} from './standard.dto';
import { StandardService } from './standard.service';
import { WordFileValidator } from './word-file.validator';
import { StandardWordParserService } from './word-parser.service';

@ApiTags('Standards - Quy chuẩn')
@Controller('standards')
export class StandardController {
  constructor(
    private readonly standardService: StandardService,
    private readonly wordParserService: StandardWordParserService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo quy chuẩn mới' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createStandardDto: CreateStandardDto) {
    return await this.standardService.create(createStandardDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách quy chuẩn (các lớp học phần đã quy chuẩn)',
  })
  async findAll(@Query() query: StandardQueryDto) {
    return await this.standardService.findAll(query);
  }

  @Post('upload-word')
  @ApiOperation({ summary: 'Upload quy chuẩn từ file Word' })
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File Word chứa dữ liệu quy chuẩn',
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
  async uploadWord(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new WordFileValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Parse Word file and convert to DTO
    const wordData = await this.wordParserService.parseWordFile(file.buffer);
    // console.log("############################", wordData);
    const uploadDto: StandardUploadDto = {
      data: wordData,
    };

    return await this.standardService.uploadFromWord(uploadDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy thông tin quy chuẩn theo ID',
  })
  @ApiParam({ name: 'id', description: 'ID quy chuẩn' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<StandardEntity> {
    return await this.standardService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin quy chuẩn' })
  @ApiParam({ name: 'id', description: 'ID quy chuẩn' })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateStandardDto: UpdateStandardDto,
  ): Promise<StandardEntity> {
    return await this.standardService.update(id, updateStandardDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa quy chuẩn' })
  @ApiParam({ name: 'id', description: 'ID quy chuẩn' })
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.standardService.remove(id);
    return { message: 'Xóa quy chuẩn thành công' };
  }
}
