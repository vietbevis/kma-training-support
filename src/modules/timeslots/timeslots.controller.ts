import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TimeslotsService } from './timeslots.service';

@Controller('timeslots')
export class TimeslotsController {
  constructor(private readonly timeslotsService: TimeslotsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả ca học (không phân trang)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thành công',
    type: [String],
  })
  async getAllTimeSlots(): Promise<string[]> {
    return this.timeslotsService.getAllTimeSlots();
  }
}
