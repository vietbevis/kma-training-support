import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateManualAuditLogDto,
  GetAuditLogsQueryDto,
  GetAuditLogsResponseDto,
  GetAuditStatsQueryDto,
  GetAuditStatsResponseDto,
  ManageExcludedEntityDto,
} from './audit-log.dto';
import { AuditLogService } from './audit-log.service';

@ApiTags('Audit Log - Nhật ký audit')
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách audit logs' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách audit logs',
    type: GetAuditLogsResponseDto,
  })
  async getAuditLogs(
    @Query() query: GetAuditLogsQueryDto,
  ): Promise<GetAuditLogsResponseDto> {
    const { fromDate, toDate, ...rest } = query;

    return this.auditLogService.getAuditLogs({
      ...rest,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 50,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê audit logs' })
  @ApiResponse({
    status: 200,
    description: 'Thống kê audit logs',
    type: GetAuditStatsResponseDto,
  })
  async getAuditStats(
    @Query() query: GetAuditStatsQueryDto,
  ): Promise<GetAuditStatsResponseDto> {
    const { fromDate, toDate } = query;

    return this.auditLogService.getAuditStats({
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  @Get('excluded-entities')
  @ApiOperation({
    summary: 'Lấy danh sách entities bị loại trừ khỏi audit log',
  })
  @ApiResponse({ status: 200, description: 'Danh sách entities bị loại trừ' })
  async getExcludedEntities() {
    return {
      excludedEntities: this.auditLogService.getExcludedEntities(),
      message: 'Các entities này sẽ không được ghi audit log',
    };
  }

  @Post('excluded-entities')
  @ApiOperation({ summary: 'Thêm entity vào danh sách loại trừ' })
  @ApiResponse({
    status: 201,
    description: 'Entity đã được thêm vào danh sách loại trừ',
  })
  async addExcludedEntity(@Body() dto: ManageExcludedEntityDto) {
    this.auditLogService.addExcludedEntity(dto.entityName);
    return {
      message: `Entity ${dto.entityName} đã được thêm vào danh sách loại trừ`,
      excludedEntities: this.auditLogService.getExcludedEntities(),
    };
  }

  @Delete('excluded-entities/:entityName')
  @ApiOperation({ summary: 'Xóa entity khỏi danh sách loại trừ' })
  @ApiResponse({
    status: 200,
    description: 'Entity đã được xóa khỏi danh sách loại trừ',
  })
  async removeExcludedEntity(@Param('entityName') entityName: string) {
    this.auditLogService.removeExcludedEntity(entityName);
    return {
      message: `Entity ${entityName} đã được xóa khỏi danh sách loại trừ`,
      excludedEntities: this.auditLogService.getExcludedEntities(),
    };
  }

  @Get('check-excluded/:entityName')
  @ApiOperation({ summary: 'Kiểm tra entity có bị loại trừ hay không' })
  @ApiResponse({ status: 200, description: 'Kết quả kiểm tra' })
  async checkExcludedEntity(@Param('entityName') entityName: string) {
    const isExcluded = this.auditLogService.isEntityExcluded(entityName);
    return {
      entityName,
      isExcluded,
      message: isExcluded
        ? `Entity ${entityName} bị loại trừ khỏi audit log`
        : `Entity ${entityName} được ghi audit log`,
    };
  }

  @Post('manual')
  @ApiOperation({ summary: 'Tạo audit log thủ công' })
  @ApiResponse({ status: 201, description: 'Audit log đã được tạo' })
  async createManualAuditLog(@Body() dto: CreateManualAuditLogDto) {
    return this.auditLogService.createManualAuditLog(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết audit log' })
  @ApiResponse({ status: 200, description: 'Chi tiết audit log' })
  async getAuditLogById(@Param('id') id: string) {
    return this.auditLogService.getAuditLogById(id);
  }
}
