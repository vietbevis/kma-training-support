import { Injectable } from '@nestjs/common';
import { DayOfWeek } from 'src/shared/enums/day-of-week.enum';
import * as XLSX from 'xlsx';
import { TimetableUploadDataDto } from './timetable.dto';
@Injectable()
export class ExcelParserService {
  async parseExcelFile(fileBuffer: Buffer): Promise<TimetableUploadDataDto[]> {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;

      const allData: TimetableUploadDataDto[] = [];

      for (const sheetName of sheetNames) {
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
    const filteredData = rawData.filter((row: any[]) =>
      row.some((cell) => cell !== null && cell !== undefined && cell !== ''),
    );

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

      if (!row[columnMap.dayOfWeek] || !row[columnMap.timeSlot]) {
        // nếu thiếu dayOfWeek hoặc timeSlot thì bỏ qua dòng này
        continue;
      }

      const courseCode = String(row[columnMap.courseCode] || '').trim();
      const className = String(row[columnMap.className] || '').trim();

      // Nếu có mã học phần/ tên lớp học phần -> bắt đầu course mới
      if (courseCode || className) {
        if (currentCourse) {
          this.updateCourseDates(currentCourse);
          result.push(currentCourse);
        }

        // get pure className
        const pureClassName = this.getPureClassName(
          String(row[columnMap.className] || '').trim(),
        );

        currentCourse = {
          order: this.parseNumber(row[columnMap.tt]),
          courseCode,
          credits: this.parseNumber(row[columnMap.credits]),
          studentCount: this.parseNumber(row[columnMap.studentCount]),
          theoryHours: this.parseNumber(row[columnMap.theoryHours]),
          crowdClassCoefficient: this.parseNumber(
            row[columnMap.crowdClassCoefficient],
          ),
          actualHours: this.parseNumber(row[columnMap.actualHours]),
          overtimeCoefficient: this.parseNumber(
            row[columnMap.overtimeCoefficient],
          ),
          standardHours: this.parseNumber(row[columnMap.standardHours]),
          className: pureClassName,
          classType: String(row[columnMap.classType] || '').trim(),
          lecturerName: String(row[columnMap.lecturerName] || '').trim(),
          startDate: this.parseExcelDate(row[columnMap.startDate]),
          endDate: this.parseExcelDate(row[columnMap.endDate]),
          detailTimeSlots: [],
        };
      }

      if (currentCourse) {
        const rawRoom = String(row[columnMap.roomName] || '').trim();

        let roomName = '';
        let buildingName: string | undefined = undefined;

        if (rawRoom.includes('-')) {
          const parts = rawRoom.split('-').map((s) => s.trim());
          roomName = parts[0] || '';
          buildingName = parts[1] || undefined;
        } else {
          roomName = rawRoom;
        }

        const detail: any = {
          dayOfWeek: this.parseNumber(row[columnMap.dayOfWeek]),
          timeSlot: String(row[columnMap.timeSlot] || '').trim(),
          roomName,
          startDate: this.parseExcelDate(row[columnMap.startDate]),
          endDate: this.parseExcelDate(row[columnMap.endDate]),
        };

        // chỉ thêm buildingName nếu có
        if (buildingName) {
          detail.buildingName = buildingName;
        }

        // thiếu chi tiết startDate và endDate cho mỗi detailTimeSlot thì lấy dòng trước đó gần nhất có startDate và endDate
        if (!detail.startDate && !detail.endDate && i > 0) {
          for (let j = i - 1; j >= 0; j--) {
            const prevRow = filteredData[j];
            if (
              prevRow &&
              prevRow[columnMap.startDate] &&
              prevRow[columnMap.endDate]
            ) {
              {
                detail.startDate = this.parseExcelDate(
                  prevRow[columnMap.startDate],
                );
                detail.endDate = this.parseExcelDate(
                  prevRow[columnMap.endDate],
                );
                break;
              }
            }
          }
        }

        // kiểm tra xem tổ hợp dayOfWeek + timeSlot + room dòng hiện tại đã có trong detailTimeSlots chưa
        // nếu có thì gộp vào và thay đổi endDate của bản trước đó bằng endDate của dòng hiện tại.
        // nếu chưa thì push vào mảng detailTimeSlots

        const existingDetail = currentCourse.detailTimeSlots.find(
          (eachDetail) => {
            // Kiểm tra điều kiện cơ bản
            const sameSlot =
              eachDetail.dayOfWeek === detail.dayOfWeek &&
              eachDetail.timeSlot === detail.timeSlot &&
              eachDetail.roomName === detail.roomName;

            if (!sameSlot) return false;

            // Tính khoảng cách ngày
            const endDate = new Date(eachDetail.endDate);
            const startDate = new Date(detail.startDate);

            const diffTime = Math.abs(startDate.getTime() - endDate.getTime());
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            return diffDays <= 2;
          },
        );
        if (existingDetail) {
          existingDetail.endDate = detail.endDate;
        } else {
          currentCourse.detailTimeSlots.push(detail);
        }
      }
    }

    // push bản ghi cuối cùng trong sheet
    if (currentCourse) {
      this.updateCourseDates(currentCourse);
      result.push(currentCourse);
    }

    return result;
  }

  private getPureClassName(className: string): string {
    if (!className) return '';

    // Regex: tìm "-số-số" và bỏ hết từ đó trở đi
    return className.replace(/-\d+-\d+.*$/, '').trim();
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
      else if (header.includes('hs') || header.includes('lớp đông'))
        columnMap.crowdClassCoefficient = i;
      else if (header.includes('ll thực') || header.includes('ll thuc'))
        columnMap.actualHours = i;
      else if (header.includes('ngoài giờ') || header.includes('ngoai gio'))
        columnMap.overtimeCoefficient = i;
      else if (header.includes('qc')) columnMap.standardHours = i;
      else if (
        header.includes('lớp học phần') ||
        header.includes('lop hoc phan')
      )
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
    if (value === null || value === undefined || value === '') {
      return 1;
    }

    // Nếu là string chứa công thức Excel, thử parse kết quả
    if (typeof value === 'string' && value.startsWith('=')) {
      // Đối với các công thức đơn giản, có thể eval (cẩn thận với security)
      // Ở đây chỉ return 0, sẽ cần logic phức tạp hơn để parse công thức Excel
      return 0;
    }

    if (value === 'CN') {
      return DayOfWeek.SUNDAY;
    }

    const num = Number(value);
    if (isNaN(num)) return 0;

    // Nếu là số nguyên -> giữ nguyên
    if (Number.isInteger(num)) {
      return num;
    }

    // Nếu là số thập phân -> lấy 1 số sau dấu phẩy
    return Math.round(num * 10) / 10;
  }

  // chuyển ngày đọc từ excel về định dạng yyyy-MM-dd
  private parseExcelDate(value: any): string {
    if (!value) return '';
    if (typeof value === 'number') {
      const excelDate = XLSX.SSF.parse_date_code(value);
      return `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(
        excelDate.d,
      ).padStart(2, '0')}`;
    }
    if (value instanceof Date) {
      const d = String(value.getDate()).padStart(2, '0');
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const y = value.getFullYear();
      return `${y}-${m}-${d}`;
    }

    // xử lý chuỗi dạng dd/MM/yyyy hoặc dd/MM/yy
    const str = String(value).trim();
    if (str.includes('/')) {
      const [d, m, y] = str.split('/');
      const fullYear = y.length === 2 ? `20${y}` : y; // nếu yy thì thêm "20"
      return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    return str; // fallback: giữ nguyên (hiếm khi cần)
  }

  private updateCourseDates(course: TimetableUploadDataDto) {
    if (!course.detailTimeSlots.length) return;

    // parse dd/MM/yyyy hoặc yyyy-MM-dd về Date
    const parseToDate = (dateStr: string) => {
      if (!dateStr) return new Date('');
      // nếu chuỗi có dạng dd/MM/yyyy
      if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return new Date(`${y}-${m}-${d}`);
      }
      return new Date(dateStr); // yyyy-MM-dd
    };

    const startDates = course.detailTimeSlots
      .map((d) => parseToDate(d.startDate))
      .filter((d) => !isNaN(d.getTime()));

    const endDates = course.detailTimeSlots
      .map((d) => parseToDate(d.endDate))
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
    return `${y}-${m}-${d}`;
  }
}
