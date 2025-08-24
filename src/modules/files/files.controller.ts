import {
  BadRequestException,
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { MultipleFileUploadResponseDto } from './files.dto';
import { FilesService } from './files.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Danh sách files cần upload (ảnh hoặc document)',
        },
      },
    },
  })
  async uploadMultipleFiles(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({
            fileType:
              '.(jpg|jpeg|png|gif|webp|bmp|tiff|pdf|doc|docx|xls|xlsx|ppt|pptx)',
          }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ): Promise<MultipleFileUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file nào được upload');
    }

    return this.filesService.uploadMultipleFiles(files);
  }
}
