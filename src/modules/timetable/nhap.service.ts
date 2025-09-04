import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { TimetableUploadDataDto } from './timetable.dto';

@Injectable()
export class ExcelParserService {
  /**
   * Parse Excel file buffer và trả về dữ liệu thời khóa biểu
   */
  async parseExcelFile(fileBuffer: Buffer): Promise<TimetableUploadDataDto[]> {
    try {
      // Đọc workbook từ buffer
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      // Lấy tất cả sheet names
      const sheetNames = workbook.SheetNames;

      const allData: TimetableUploadDataDto[] = [];

      // Duyệt qua tất cả các sheet
      for (const sheetName of sheetNames) {
        // Bỏ qua các sheet tổng hợp (thường có nhiều lớp)
        if (sheetName.includes('A20') || sheetName.includes('A21')) {
          continue;
        }

        const worksheet = workbook.Sheets[sheetName];

        // Chuyển đổi sheet thành JSON
        // chuyển sheet thành mảng 2 chiều
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // Sử dụng array thay vì object
          defval: null, // Giá trị mặc định cho ô trống
        });

        // Parse dữ liệu từ sheet
        // xử lý từng từng sheet (mảng 2 chiều) thành mảng các dữ liệu rồi đưa vào allData
        const sheetData = this.parseSheetData(rawData as any[][], sheetName);
        allData.push(...sheetData);
      }

      return allData;
    } catch (error) {
      throw new Error(`Lỗi khi đọc file Excel: ${error.message}`);
    }
  }

  /**
   * Parse dữ liệu từ một sheet cụ thể
   */
  private parseSheetData(
    rawData: any[][],
    sheetName: string,
  ): TimetableUploadDataDto[] {
    const result: TimetableUploadDataDto[] = [];

    // Tìm dòng header (dòng chứa "TT", "Mã HP", "Số TC"...)
    let headerRowIndex = -1;
    for (let i = 0; i < rawData.length; i++) {
      // kiểm tra từng dòng
      const row = rawData[i];
      if (
        row &&
        row.some(
          (cell: any) =>
            String(cell).includes('TT') ||
            String(cell).includes('Mã HP') || // Số SV mới đúng chứ
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

    // dòng header
    const headerRow = rawData[headerRowIndex];

    // Map tên cột -> index
    // VD: TT -> 0, Mã HP -> 1 (mục đích: lấy dữ liệu tương ứng với chỉ số)
    const columnMap = this.mapColumns(headerRow);

    let currentCourse: TimetableUploadDataDto | null = null;

    // Parse từng dòng dữ liệu
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if(i === 5 && sheetName === "AT18"){
        console.log("hello")
        console.log("columnMap:", JSON.stringify(row, null, 2));
      }
        

      // Bỏ qua dòng hoàn toàn trống
      if (!row || row.every((cell) => !cell && cell !== 0)) {
        continue;
      }

      // Chấp nhận dòng có thứ và tiết (có thể không có TT nếu là dòng con)
      if (!row[columnMap.dayOfWeek] || !row[columnMap.timeSlot]) {
        continue;
      }

      const courseCode = String(row[columnMap.courseCode] || "").trim();
      
      // Nếu có mã học phần (bắt đầu course mới)
      if(courseCode) {
        if(currentCourse) {
          result.push(currentCourse);
        }

        // chưa có currentCourse -> khởi tạo
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
          startDate: '',
          endDate: '',
          detailTimeSlots: [],
        }
      }

      try {
        // parse dữ liệu thành TimetableUploadDataDto
        const parsedRow = this.parseDataRow(row, columnMap, rawData, i);
        if (parsedRow) {
          result.push(parsedRow);
        }
      } catch (error) {
        console.warn(
          `Lỗi parse dòng ${i + 1} trong sheet ${sheetName}:`,
          error.message,
        );
        // Tiếp tục với dòng tiếp theo
      }
    }

    return result;
  }

  /**
   * Map các cột dựa trên header row
   */
  private mapColumns(headerRow: any[]): Record<string, number> {
    const columnMap: Record<string, number> = {};

    for (let i = 0; i < headerRow.length; i++) {
      const header = String(headerRow[i] || '')
        .normalize("NFC")
        .toLowerCase()
        .trim();

      if (header.includes('tt')) {
        columnMap.tt = i;
      } else if (header.includes('mã hp') || header.includes('ma hp')) {
        columnMap.courseCode = i;
      } else if (header.includes('số tc') || header.includes('so tc')) {
        columnMap.credits = i;
      } else if (header.includes('số') && header.includes('sv')) {
        columnMap.studentCount = i;
      } else if (header === 'll' && !header.includes('thực')) {
        columnMap.theoryHours = i;
      } else if (header.includes('hs') && header.includes('lớp')) {
        columnMap.crowdClassCoefficient = i;
      } else if (header.includes('ll thực') || header.includes('ll thuc')) {
        columnMap.actualHours = i;
      } else if (header.includes('ngoài giờ') || header.includes('ngoai gio')) {
        columnMap.overtimeCoefficient = i;
      } else if (header.includes('qc')) {
        columnMap.standardHours = i;
      } else if (
        header.includes('lớp học phần') ||
        header.includes('lop hoc phan')
      ) {
        columnMap.className = i;
      } else if (header.includes('hình thức') || header.includes('hinh thuc')) {
        columnMap.classType = i;
      } else if (header.includes('st') && header.includes('tuần')) {
        columnMap.hoursPerWeek = i;
      } else if (header.includes('thứ') || header.includes('thu')) {
        columnMap.dayOfWeek = i;
      } else if (header.includes('tiết') || header.includes('tiet')) {
        columnMap.timeSlot = i;
      } else if (header.includes('phòng') || header.includes('phong')) {
        columnMap.roomName = i;
      } else if (header.includes('ngày bđ') || header.includes('ngay bd')) {
        columnMap.startDate = i;
      } else if (header.includes('ngày kt') || header.includes('ngay kt')) {
        columnMap.endDate = i;
      } else if (header.includes('giáo viên') || header.includes('giao vien')) {
        columnMap.lecturerName = i;
      }
    }

    return columnMap;
  }

  /**
   * Parse một dòng dữ liệu thành TimetableUploadDataDto
   */
  private parseDataRow(
    row: any[],
    columnMap: Record<string, number>,
    allRows?: any[][],
    currentRowIndex?: number,
  ): TimetableUploadDataDto | null {
    
    // Kiểm tra xem có đủ dữ liệu quan trọng không (chỉ cần thứ và tiết, ngày có thể trống)
    if (!row[columnMap.dayOfWeek] || !row[columnMap.timeSlot]) {
      return null;
    }

    // Lấy thông tin cơ bản từ dòng hiện tại
    const courseCode = String(row[columnMap.courseCode] || '').trim();
    const className = String(row[columnMap.className] || '').trim();

    // Nếu không có mã học phần và tên lớp, tìm từ dòng trước đó
    let actualCourseCode = courseCode;
    let actualClassName = className;
    let actualOrder = this.parseNumber(row[columnMap.tt]);
    let actualCredits = this.parseNumber(row[columnMap.credits]);
    let actualStudentCount = this.parseNumber(row[columnMap.studentCount]);
    let actualTheoryHours = this.parseNumber(row[columnMap.theoryHours]);
    let actualCrowdClassCoefficient = this.parseNumber(
      row[columnMap.crowdClassCoefficient],
    );
    let actualActualHours = this.parseNumber(row[columnMap.actualHours]);
    let actualOvertimeCoefficient = this.parseNumber(row[columnMap.overtimeCoefficient]);
    let actualStandardHours = this.parseNumber(row[columnMap.standardHours]);
    let actualClassType = String(row[columnMap.classType] || "").trim();
    let actualHoursPerWeek =  this.parseNumber(row[columnMap.hoursPerWeek]);
    let actualStartDate = this.parseExcelDate(row[columnMap.startDate]);
    let actualEndDate = this.parseExcelDate(row[columnMap.endDate]);
    let actualLecturerName = String(row[columnMap.lecturerName] || "").trim();

    if (
      (!courseCode || !className) &&
      allRows &&
      currentRowIndex !== undefined
    ) {
      // Tìm dòng trước đó có đủ thông tin học phần
      for (let i = currentRowIndex - 1; i >= 0; i--) {
        const prevRow = allRows[i];
        if (
          prevRow &&
          (prevRow[columnMap.courseCode] &&
          prevRow[columnMap.className]) || prevRow[columnMap.hoursPerWeek]
        ) {
          actualCourseCode = String(prevRow[columnMap.courseCode] || '').trim();
          actualClassName = String(prevRow[columnMap.className] || '').trim();
          // Chỉ lấy thông tin cơ bản nếu dòng hiện tại chưa có
          if (!actualOrder) {
            actualOrder = this.parseNumber(prevRow[columnMap.tt]);
          }
          if (!actualCredits) {
            actualCredits = this.parseNumber(prevRow[columnMap.credits]);
          }
          if (!actualStudentCount) {
            actualStudentCount = this.parseNumber(
              prevRow[columnMap.studentCount],
            );
          }
          if (!actualTheoryHours) {
            actualTheoryHours = this.parseNumber(
              prevRow[columnMap.theoryHours],
            );
          }
          if (!actualCrowdClassCoefficient) {
            actualCrowdClassCoefficient = this.parseNumber(
              prevRow[columnMap.crowdClassCoefficient],
            );
          }
          if (!actualActualHours) {
            actualActualHours = this.parseNumber(
              prevRow[columnMap.actualHours],
            );
          }
          if (!actualOvertimeCoefficient) {
            actualOvertimeCoefficient = this.parseNumber(
              prevRow[columnMap.overtimeCoefficient],
            );
          }
          if (!actualStandardHours) {
            actualStandardHours = this.parseNumber(
              prevRow[columnMap.standardHours],
            );
          }
          if (!actualClassType) {
            actualClassType = String(
              prevRow[columnMap.classType] || ""
            ).trim();
          }
          if (!actualHoursPerWeek) {
            actualHoursPerWeek = this.parseNumber(
              prevRow[columnMap.hoursPerWeek],
            );
          }
          if (!actualStartDate) {
            actualStartDate = this.parseExcelDate(
              prevRow[columnMap.startDate],
            );
          }
          if (!actualEndDate) {
            actualEndDate = this.parseExcelDate(
              prevRow[columnMap.endDate],
            );
          }
          if (!actualLecturerName) {
            actualLecturerName = String(
              prevRow[columnMap.lecturerName] || ""
            ).trim();
          }

          if(!actualCourseCode || !actualClassName) continue;
          break;
          
        }
      }
    }

    // Nếu vẫn không có mã học phần, bỏ qua dòng này
    if (!actualCourseCode) {
      return null;
    }

    
    // Nếu không có ngày trong dòng hiện tại, tìm dòng tiếp theo có ngày của cùng học phần
    // if ((!startDate || !endDate) && allRows && currentRowIndex !== undefined) {
    //   for (let i = currentRowIndex + 1; i < allRows.length; i++) {
    //     const nextRow = allRows[i];
    //     if (
    //       nextRow &&
    //       nextRow[columnMap.startDate] &&
    //       nextRow[columnMap.endDate]
    //     ) {
    //       startDate = this.parseExcelDate(nextRow[columnMap.startDate]);
    //       endDate = this.parseExcelDate(nextRow[columnMap.endDate]);
    //       break;
    //     }
    //     // Nếu gặp học phần khác thì dừng
    //     if (
    //       nextRow &&
    //       nextRow[columnMap.courseCode] &&
    //       String(nextRow[columnMap.courseCode]).trim() !== actualCourseCode
    //     ) {
    //       break;
    //     }
    //   }
    // }

    return null;
    // return {
    //   order: actualOrder,
    //   courseCode: actualCourseCode,
    //   credits: actualCredits,
    //   studentCount: actualStudentCount,
    //   theoryHours: actualTheoryHours,
    //   crowdClassCoefficient: actualCrowdClassCoefficient,
    //   actualHours: actualActualHours,
    //   overtimeCoefficient: actualOvertimeCoefficient,
    //   standardHours: actualStandardHours,
    //   className: actualClassName,
    //   classType: actualClassType,
    //   hoursPerWeek: actualHoursPerWeek,
    //   dayOfWeek: this.parseNumber(row[columnMap.dayOfWeek]),
    //   timeSlot: String(row[columnMap.timeSlot] || '').trim(),
    //   roomName: String(row[columnMap.roomName] || '').trim(),
    //   startDate: actualStartDate,
    //   endDate: actualEndDate,
    //   lecturerName: actualLecturerName
    // };
  }

  /**
   * Parse số từ cell Excel
   */
  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    // Nếu là string chứa công thức Excel, thử parse kết quả
    if (typeof value === 'string' && value.startsWith('=')) {
      // Đối với các công thức đơn giản, có thể eval (cẩn thận với security)
      // Ở đây chỉ return 0, sẽ cần logic phức tạp hơn để parse công thức Excel
      return 0;
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

  /**
   * Parse ngày từ Excel (có thể là Date object hoặc string)
   */
  private parseExcelDate(value: any): string {
    if (!value) {
      return '';
    }

    // Nếu là Excel date (number)
    if (typeof value === 'number') {
      const excelDate = XLSX.SSF.parse_date_code(value);
      return `${String(excelDate.d).padStart(2, '0')}/${String(
        excelDate.m,
      ).padStart(2, '0')}/${String(excelDate.y).slice(-2)}`;
    }

    // Nếu là Date object
    if (value instanceof Date) {
      const day = String(value.getDate()).padStart(2, '0');
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const year = String(value.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    }

    // Nếu là string, giữ nguyên
    return String(value).trim();
  }
}
