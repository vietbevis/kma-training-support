import {
  BadRequestException,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  NotFoundException,
  Param,
  ParseFilePipe,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from 'src/shared/decorators/public.decorator';
import {
  FileUploadResponseDto,
  MultipleFileUploadResponseDto,
} from './files.dto';
import { FilesService } from './files.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File cần upload (ảnh hoặc document)',
        },
      },
    },
  })
  async uploadFile(
    @UploadedFile(
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
    file: Express.Multer.File,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('Không có file nào được upload');
    }

    return this.filesService.uploadFile(file);
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // Tối đa 10 files
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

  @Public()
  @Get(':fileName')
  @ApiParam({
    name: 'fileName',
    description: 'Tên file cần tải',
    example: '2024-01-15-123456-image.jpg',
  })
  async getFile(@Param('fileName') fileName: string, @Res() res: Response) {
    try {
      const fileInfo = await this.filesService.getFileInfo(fileName);
      const fileStream = await this.filesService.getFile(fileName);

      // Set CORS headers để cho phép frontend truy cập
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

      // Set content headers
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${fileInfo.originalName}"`,
      );
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      fileStream.pipe(res);
    } catch (error) {
      throw new NotFoundException('File không tồn tại');
    }
  }
}
