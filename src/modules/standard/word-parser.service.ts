import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { StandardUploadDataDto } from './standard.dto';

@Injectable()
export class StandardWordParserService {
  async parseWordFile(buffer: Buffer): Promise<StandardUploadDataDto[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new BadRequestException('File Excel không có sheet nào');
      }

      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!data || data.length < 2) {
        throw new BadRequestException(
          'File Excel không có dữ liệu hoặc thiếu header',
        );
      }

      // Bỏ qua header row (row đầu tiên)
      const dataRows = data.slice(1) as any[][];
      const parsedData: StandardUploadDataDto[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];

        // Bỏ qua các row trống
        if (!row || row.length === 0 || !row[0]) {
          continue;
        }

        try {
          const standardData: StandardUploadDataDto = {
            order: i + 1,
            courseCode: this.getCellValue(row[0]),
            credits: parseInt(this.getCellValue(row[1])) || 3,
            className: this.getCellValue(row[2]),
            classType: this.getCellValue(row[3]) || 'LT',
            studentCount: parseInt(this.getCellValue(row[4])) || 0,
            theoryHours: parseInt(this.getCellValue(row[5])) || 0,
            actualHours: parseFloat(this.getCellValue(row[6])) || 0,
            crowdClassCoefficient: parseFloat(this.getCellValue(row[7])) || 1.0,
            overtimeCoefficient: parseFloat(this.getCellValue(row[8])) || 1.0,
            standardHours: parseFloat(this.getCellValue(row[9])) || 0,
            startDate: this.parseDate(this.getCellValue(row[10])),
            endDate: this.parseDate(this.getCellValue(row[11])),
            lecturerName: this.getCellValue(row[12]) || undefined,
            // detailTimeSlots sẽ được xử lý sau nếu cần
            detailTimeSlots: undefined,
          };

          // Validate required fields
          if (!standardData.courseCode || !standardData.className) {
            throw new Error(
              `Row ${i + 2}: Thiếu thông tin mã học phần hoặc tên lớp`,
            );
          }

          parsedData.push(standardData);
        } catch (error: any) {
          throw new BadRequestException(
            `Lỗi tại row ${i + 2}: ${error.message}`,
          );
        }
      }

      if (parsedData.length === 0) {
        throw new BadRequestException(
          'Không có dữ liệu hợp lệ trong file Excel',
        );
      }

      return parsedData;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Lỗi đọc file Excel: ${error.message}`);
    }
  }

  private getCellValue(cell: any): string {
    if (cell === null || cell === undefined) {
      return '';
    }
    return String(cell).trim();
  }

  private parseDate(dateStr: string): string {
    if (!dateStr) {
      throw new Error('Ngày không hợp lệ');
    }

    // Nếu là số (Excel date serial number)
    if (!isNaN(Number(dateStr))) {
      const date = XLSX.SSF.parse_date_code(Number(dateStr));
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    // Nếu là string date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Định dạng ngày không hợp lệ: ${dateStr}`);
    }

    return date.toISOString().split('T')[0];
  }
}
