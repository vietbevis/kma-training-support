import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { JSDOM } from 'jsdom';
import { StandardUploadDataDto } from './standard.dto';

@Injectable()
export class StandardWordParserService {
  async parseWordFile(fileBuffer: Buffer): Promise<StandardUploadDataDto[]> {
    try {
      const result = await mammoth.convertToHtml({ buffer: fileBuffer });
      const html = result.value;
      return this.parseHtmlTable(html);
    } catch (error) {
      throw new Error(`Lỗi khi đọc file Word: ${error.message}`);
    }
  }

  private parseHtmlTable(html: string): StandardUploadDataDto[] {
    const result: StandardUploadDataDto[] = [];
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Lấy tất cả các bảng
    const tables = document.querySelectorAll('table');

    // console.log('First 1000 chars:', html.substring(400, 450));

    //Lấy chuỗi có kì học và năm học
    const text = html.substring(400, 450);
    // Regex tìm "học kỳ <số>" và "năm học <năm> – <năm>"
    const regex = /học kỳ\s*(\d+).*?năm học\s*(\d{4})\s*[–-]\s*(\d{4})/i;
    const match = text.match(regex);
    // console.log("match@@@@@@@@", );

    if (tables.length === 0) {
      throw new Error('Không tìm thấy bảng trong file Word');
    }

    // Lấy bảng lớn nhất (có nhiều dòng nhất)
    let mainTable = tables[tables.length - 1];
    if (tables.length > 1) {
      let maxRows = 0;
      tables.forEach((table, i) => {
        const rowCount = table.querySelectorAll('tr').length;
        if (rowCount > maxRows) {
          maxRows = rowCount;
          mainTable = table;
        }
      });
    }

    const rows = Array.from(mainTable.querySelectorAll('tr'));

    let headerRowIndex = -1;

    // Fallback: Tìm dòng có nhiều cột nhất
    if (headerRowIndex === -1) {
      let maxCols = 0;
      for (let i = 0; i < rows.length; i++) {
        const colCount = rows[i].querySelectorAll('td, th').length;
        if (colCount > maxCols && colCount >= 10) {
          maxCols = colCount;
          headerRowIndex = i;
        }
      }
      if (headerRowIndex === -1) {
        console.error('Không thể tìm header row. Cấu trúc 15 dòng đầu:');
        for (let i = 0; i < Math.min(15, rows.length); i++) {
          const cells = rows[i].querySelectorAll('td, th');
          const texts = Array.from(cells).map(c => c.textContent?.trim());
          console.log(`Dòng ${i}: ${cells.length} cột -`, texts.slice(0, 5).join(' | '));
        }
        throw new Error('Không tìm thấy header trong bảng');
      }
    }

    // Map columns
    const headerCells = Array.from(rows[headerRowIndex].querySelectorAll('td, th'));
    const headerTexts = headerCells.map(cell => cell.textContent?.trim() || '');
    const columnMap = this.mapColumns(headerTexts);

    let currentCourse: StandardUploadDataDto | null = null;
    let currentSection = '';
    let currentDepartment = '';
    let processedCount = 0;

    // Parse data rows
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td, th'));

      if (cells.length === 0) continue;

      const rowData = cells.map(cell => cell.textContent?.trim() || '');
      const fullRowText = rowData.join(' ').trim();

      // Skip empty rows
      if (!fullRowText || fullRowText.length < 5) continue;

      // Kiểm tra section header
      const sectionMatch = fullRowText.match(/^([IVX]+)\.\s*(.+)/);
      if (sectionMatch) {
        currentSection = fullRowText;
        const deptMatch = fullRowText.match(/Khoa\s+([A-ZĐÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ&\s]+)/i);
        if (deptMatch) {
          currentDepartment = `${deptMatch[1].trim()}`;
        } else {
          const specialMatch = fullRowText.match(/thuộc\s+(.+)$/i);
          if (specialMatch) {
            currentDepartment = specialMatch[1].trim();
          } else {
            currentDepartment = currentSection;
          }
        }
        if (currentCourse) {
          result.push(currentCourse);
          currentCourse = null;
        }
        continue;
      }

      const className = this.cleanText(rowData[columnMap.className] || '');
      const lecturerName = this.cleanText(rowData[columnMap.lecturerName] || '');

      // Chỉ tạo course mới nếu có className
      if (className && className.length > 3) {
        if (currentCourse) {
          result.push(currentCourse);
          processedCount++;
        }
        currentCourse = {
          credits: this.parseNumber(rowData[columnMap.credits]),
          className: this.getPureClassName(className),
          semester: match ? `Học kỳ ${match[1]}` : "",
          academicYearId: match ? `${match[2]}-${match[3]}` : "undefined",
          lecturerName: lecturerName || '',
          studentCount: this.parseNumber(rowData[columnMap.studentCount]),
          theoryHours: this.parseNumber(rowData[columnMap.theoryHours]),
          actualHours: this.parseNumber(rowData[columnMap.actualHours]),
          overtimeCoefficient: this.parseNumber(rowData[columnMap.overtimeCoefficient]),
          crowdClassCoefficient: this.parseNumber(rowData[columnMap.crowdClassCoefficient]),
          standardHours: this.parseNumber(rowData[columnMap.standardHours]),
          courseCode: '',
          classType: '',
          startDate: '',
          endDate: '',
          detailTimeSlots: [],
          department: currentDepartment,
          note: rowData[columnMap.note],
        };
      }
    }
    if (currentCourse) {
      result.push(currentCourse);
      processedCount++;
    }
    return result;
  }

  private mapColumns(headerRow: string[]): Record<string, number> {
    const columnMap: Record<string, number> = {};

    for (let i = 0; i < headerRow.length; i++) {
      const header = this.cleanText(headerRow[i]).toLowerCase();

      // Flexible matching với nhiều từ khóa
      if (header.includes('số tc') || header.includes('so tc') || header.includes('tín chỉ') || header.includes('tin chi'))
        columnMap.credits = i;
      else if (header.includes('lớp học phần') || header.includes('lop hoc phan') || header.includes('tên lớp'))
        columnMap.className = i;
      else if (header.includes('giáo viên') || header.includes('giao vien') || header.includes('giảng viên') || header.includes('gv'))
        columnMap.lecturerName = i;
      else if ((header.includes('số') || header.includes('so')) && header.includes('sv'))
        columnMap.studentCount = i;
      else if (header.includes('số tiết theo') || header.includes('so tiet theo') || header.includes('ctđt') || header.includes('ctdt'))
        columnMap.theoryHours = i;
      else if (header.includes('số tiết lên') || header.includes('so tiet len') || (header.includes('tiết') && header.includes('lên lớp')))
        columnMap.actualHours = i;
      else if (header.includes('hệ số lên') || header.includes('he so len') || (header.includes('ngoài') && header.includes('giờ')))
        columnMap.overtimeCoefficient = i;
      else if (header.includes('hệ số lớp') || header.includes('he so lop') || header.includes('lớp đông') || header.includes('lop dong'))
        columnMap.crowdClassCoefficient = i;
      else if (header.includes('quy chuẩn') || header.includes('quy chuan') || header === 'qc')
        columnMap.standardHours = i;
      else if (header.includes('ghi chú') || header.includes('ghi chu') || header === 'gc')
        columnMap.note = i;
    }

    return columnMap;
  }

  private cleanText(text: string): string {
    return text
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
  }

  private getPureClassName(className: string): string {
    if (!className) return '';
    return className.trim();
  }

  private parseNumber(value: any): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const cleanValue = String(value)
      .replace(/[^\d.,]/g, '')
      .replace(',', '.');

    const num = Number(cleanValue);
    if (isNaN(num)) return 0;

    if (Number.isInteger(num)) {
      return num;
    }

    return Math.round(num * 10) / 10;
  }
}