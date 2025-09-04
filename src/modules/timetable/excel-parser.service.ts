import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { TimetableUploadDataDto } from './timetable.dto';
import { DetailTimeSlotsDto } from './timetable.dto';
@Injectable()
export class ExcelParserService {
  async parseExcelFile(fileBuffer: Buffer): Promise<TimetableUploadDataDto[]> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;

      const allData: TimetableUploadDataDto[] = [];

      for (const sheetName of sheetNames) {
        if (sheetName.includes('A20') || sheetName.includes('A21')) {
          continue;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: null,
        });


        const sheetData = this.parseSheetData(rawData as any[][], sheetName);
        allData.push(...sheetData);
      }

      return allData;
    } catch (error) {
      throw new Error(`Lỗi khi đọc file Excel: ${error.message}`);
    }
  }

  private parseSheetData(
    rawData: any[][],
    sheetName: string,
  ): TimetableUploadDataDto[] {
    const result: TimetableUploadDataDto[] = [];
    // Loại bỏ dòng trống
    const filteredData = rawData.filter((row: any[]) => row.some(cell => cell !== null && cell !== undefined && cell !== ''));

   
    let headerRowIndex = -1;
    for (let i = 0; i < filteredData.length; i++) {
      const row = filteredData[i];
      if (
        row &&
        row.some(
          (cell: any) =>
            String(cell).includes('TT') ||
            String(cell).includes('Mã HP') ||
            String(cell).includes('Số TC'),
        )
      ) {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex === -1) {
      throw new Error(`Không tìm thấy header trong sheet ${sheetName}`);
    }

    const headerRow = filteredData[headerRowIndex];
    const columnMap = this.mapColumns(headerRow);

    let currentCourse: TimetableUploadDataDto | null = null;

    for (let i = headerRowIndex + 1; i < filteredData.length; i++) {
      const row = filteredData[i];
      if (!row || row.every((cell) => !cell && cell !== 0)) continue;

      // if(sheetName == "AT18") {
      //   console.log("i  " + i);
      // }
      const courseCode = String(row[columnMap.courseCode] || '').trim();

      // lấy endDate của dòng cuối dùng trong sheet
      if(currentCourse) {
        if(i === filteredData.length - 1 && row[columnMap.endDate]) {
            currentCourse.endDate = this.parseExcelDate(row[columnMap.endDate]);
          }

        if(i === filteredData.length - 1 && !row[columnMap.endDate]) {
          for(let j = i - 1; j >= 0; j--){
            const prevRow = filteredData[j];
            if(prevRow && prevRow[columnMap.endDate]){
              currentCourse.endDate = this.parseExcelDate(prevRow[columnMap.endDate]);
              break;
            }
          }
        }
      }
      

      // Nếu có mã học phần -> bắt đầu course mới
      if (courseCode) {
        if (currentCourse) {
          // lấy dòng trên gần nhất để lấy ngày kết thúc
          for(let j = i - 1; j >= 0; j--){
            const prevRow = filteredData[j];
            if(prevRow && prevRow[columnMap.endDate]){
              currentCourse.endDate = this.parseExcelDate(prevRow[columnMap.endDate]);
              break;
            }
          }
          this.updateCourseDates(currentCourse);
          result.push(currentCourse);
        }

        currentCourse = {
          order: this.parseNumber(row[columnMap.tt]),
          courseCode,
          credits: this.parseNumber(row[columnMap.credits]),
          studentCount: this.parseNumber(row[columnMap.studentCount]),
          theoryHours: this.parseNumber(row[columnMap.theoryHours]),
          crowdClassCoefficient: this.parseNumber(row[columnMap.crowdClassCoefficient]),
          actualHours: this.parseNumber(row[columnMap.actualHours]),
          overtimeCoefficient: this.parseNumber(row[columnMap.overtimeCoefficient]),
          standardHours: this.parseNumber(row[columnMap.standardHours]),
          className: String(row[columnMap.className] || '').trim(),
          classType: String(row[columnMap.classType] || '').trim(),
          lecturerName: String(row[columnMap.lecturerName] || '').trim(),
          startDate: this.parseExcelDate(row[columnMap.startDate]),
          endDate: '',
          detailTimeSlots: [],
        };
      }

      if (currentCourse) {
        const detail: DetailTimeSlotsDto = {
          hoursPerWeek: this.parseNumber(row[columnMap.hoursPerWeek]),
          dayOfWeek: row[columnMap.dayOfWeek]
            ? [this.parseNumber(row[columnMap.dayOfWeek])]
            : [],
          timeSlot: String(row[columnMap.timeSlot] || '').trim(),
          roomName: String(row[columnMap.roomName] || '').trim(),
          startDate: this.parseExcelDate(row[columnMap.startDate]),
          endDate: this.parseExcelDate(row[columnMap.endDate]),
        };

        // Gom nếu trùng timeSlot + room + start/end
        const last = currentCourse.detailTimeSlots[currentCourse.detailTimeSlots.length - 1];
        if (
          last &&
          last.timeSlot === detail.timeSlot &&
          last.roomName === detail.roomName &&
          last.startDate === detail.startDate &&
          last.endDate === detail.endDate
        ) {
          last.dayOfWeek.push(...detail.dayOfWeek);
        } else {
          currentCourse.detailTimeSlots.push(detail);
        }
      }
    }

    if (currentCourse) {
      this.updateCourseDates(currentCourse);
      result.push(currentCourse);
    }

    return result;
  }

  private mapColumns(headerRow: any[]): Record<string, number> {
    const columnMap: Record<string, number> = {};

    for (let i = 0; i < headerRow.length; i++) {
      const header = String(headerRow[i] || '')
        .normalize('NFC')
        .toLowerCase()
        .trim();

      if (header.includes('tt')) columnMap.tt = i;
      else if (header.includes('mã hp') || header.includes('ma hp'))
        columnMap.courseCode = i;
      else if (header.includes('số tc') || header.includes('so tc'))
        columnMap.credits = i;
      else if (header.includes('số') && header.includes('sv'))
        columnMap.studentCount = i;
      else if (header === 'll' && !header.includes('thực'))
        columnMap.theoryHours = i;
      else if (header.includes('hs') && header.includes('lớp'))
        columnMap.crowdClassCoefficient = i;
      else if (header.includes('ll thực') || header.includes('ll thuc'))
        columnMap.actualHours = i;
      else if (header.includes('ngoài giờ') || header.includes('ngoai gio'))
        columnMap.overtimeCoefficient = i;
      else if (header.includes('qc')) columnMap.standardHours = i;
      else if (header.includes('lớp học phần') || header.includes('lop hoc phan'))
        columnMap.className = i;
      else if (header.includes('hình thức') || header.includes('hinh thuc'))
        columnMap.classType = i;
      else if (header.includes('st') && header.includes('tuần'))
        columnMap.hoursPerWeek = i;
      else if (header.includes('thứ') || header.includes('thu'))
        columnMap.dayOfWeek = i;
      else if (header.includes('tiết') || header.includes('tiet'))
        columnMap.timeSlot = i;
      else if (header.includes('phòng') || header.includes('phong'))
        columnMap.roomName = i;
      else if (header.includes('ngày bđ') || header.includes('ngay bd'))
        columnMap.startDate = i;
      else if (header.includes('ngày kt') || header.includes('ngay kt'))
        columnMap.endDate = i;
      else if (header.includes('giáo viên') || header.includes('giao vien'))
        columnMap.lecturerName = i;
    }

    return columnMap;
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    if (isNaN(num)) return 0;
    return num;
  }

  private parseExcelDate(value: any): string {
    if (!value) return '';
    if (typeof value === 'number') {
      const excelDate = XLSX.SSF.parse_date_code(value);
      return `${String(excelDate.d).padStart(2, '0')}/${String(
        excelDate.m,
      ).padStart(2, '0')}/${excelDate.y}`;
    }
    if (value instanceof Date) {
      const d = String(value.getDate()).padStart(2, '0');
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const y = value.getFullYear();
      return `${d}/${m}/${y}`;
    }
    return String(value).trim();
  }

  private updateCourseDates(course: TimetableUploadDataDto) {
    if (!course.detailTimeSlots.length) return;
    const startDates = course.detailTimeSlots
      .map((d) => new Date(d.startDate.split('/').reverse().join('-')))
      .filter((d) => !isNaN(d.getTime()));
    const endDates = course.detailTimeSlots
      .map((d) => new Date(d.endDate.split('/').reverse().join('-')))
      .filter((d) => !isNaN(d.getTime()));

    if (startDates.length && endDates.length) {
      const minDate = new Date(Math.min(...startDates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...endDates.map((d) => d.getTime())));
      course.startDate = this.formatDate(minDate);
      course.endDate = this.formatDate(maxDate);
    }
  }

  private formatDate(date: Date): string {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
}
