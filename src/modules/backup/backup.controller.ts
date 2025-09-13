import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from 'src/shared/decorators/public.decorator';
import {
  BackupStatisticsDto,
  CreateBackupDto,
  ForceCleanupResponseDto,
  QueryBackupDto,
  RestoreBackupDto,
} from './backup.dto';
import { BackupService } from './backup.service';

@ApiTags('Backup')
@Public()
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo backup' })
  @ApiBody({ type: CreateBackupDto })
  async createBackup(@Body() createBackupDto: CreateBackupDto) {
    return this.backupService.createBackup(createBackupDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách backup' })
  async getBackups(@Query() query: QueryBackupDto) {
    return this.backupService.getBackups(query);
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
        `attachment; filename="${filename}"`,
      );

      stream.pipe(res);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('restore')
  @ApiOperation({ summary: 'Khôi phục backup' })
  @ApiBody({ type: RestoreBackupDto })
  async restoreBackup(@Body() restoreDto: RestoreBackupDto) {
    await this.backupService.restoreBackup(restoreDto);
    return { message: 'Backup restored successfully' };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Lấy thống kê backup' })
  @ApiResponse({ status: 200, type: BackupStatisticsDto })
  async getBackupStatistics() {
    return this.backupService.getBackupStatistics();
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
}
