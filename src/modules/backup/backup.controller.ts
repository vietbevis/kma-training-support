import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseFilePipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  BackupStatisticsDto,
  CreateBackupDto,
  ForceCleanupResponseDto,
  QueryBackupDto,
} from './backup.dto';
import { BackupService } from './backup.service';

@ApiTags('Backup')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo backup' })
  async createBackup(@Body() createBackupDto: CreateBackupDto) {
    return this.backupService.createBackup(createBackupDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách backup' })
  async getBackups(@Query() query: QueryBackupDto) {
    return this.backupService.getBackups(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Lấy thống kê backup' })
  @ApiResponse({ status: 200, type: BackupStatisticsDto })
  async getBackupStatistics() {
    return this.backupService.getBackupStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy backup theo ID' })
  @ApiParam({ name: 'id', type: String })
  async getBackup(@Param('id') id: string) {
    return this.backupService.getBackupById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa backup' })
  @ApiParam({ name: 'id', type: String })
  async deleteBackup(@Param('id') id: string) {
    await this.backupService.deleteBackup(id);
    return { message: 'Backup deleted successfully' };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Tải backup' })
  @ApiParam({ name: 'id', type: String })
  async downloadBackup(@Param('id') id: string, @Res() res: Response) {
    try {
      const { stream, filename } = await this.backupService.downloadBackup(id);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`,
      );

      stream.pipe(res);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục backup' })
  @ApiParam({ name: 'id', type: String })
  async restoreBackup(@Param('id') id: string) {
    await this.backupService.restoreBackup(id);
    return { message: 'Backup restored successfully' };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Dọn dẹp tất cả backup' })
  @ApiResponse({ status: 200, type: ForceCleanupResponseDto })
  async forceCleanup() {
    const result = await this.backupService.forceBackupCleanup();
    return {
      message: `Deleted ${result.deletedCount} backups`,
      deletedCount: result.deletedCount,
      errors: result.errors,
    };
  }

  @Post('rebuild-metadata')
  @ApiOperation({ summary: 'Rebuild backup metadata từ files có sẵn' })
  async rebuildMetadata() {
    const result = await this.backupService.rebuildBackupMetadata();
    return {
      message: `Rebuilt ${result.rebuiltCount} backup metadata entries`,
      rebuiltCount: result.rebuiltCount,
      errors: result.errors,
    };
  }

  @Post('restore-from-upload')
  @UseInterceptors(FileInterceptor('backupFile'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file backup và khôi phục' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        backupFile: {
          type: 'string',
          format: 'binary',
          description: 'File backup định dạng zip',
        },
      },
      required: ['backupFile'],
    },
  })
  async restoreFromUpload(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
      }),
    )
    backupFile: Express.Multer.File,
  ) {
    try {
      await this.backupService.restoreFromUploadedFile(backupFile);
      return { message: 'Khôi phục từ file backup thành công' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Khôi phục từ file backup thất bại',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
