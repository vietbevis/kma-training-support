import { FileValidator } from '@nestjs/common';

export class ExcelFileValidator extends FileValidator {
  constructor(private readonly options: { allowedTypes?: string[] } = {}) {
    super({});
    this.options.allowedTypes = this.options.allowedTypes || [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
  }

  public isValid(file?: Express.Multer.File): boolean {
    if (!file) return false;

    // Check MIME type
    if (this.options.allowedTypes!.includes(file.mimetype)) {
      return true;
    }

    // Fallback: check file extension
    const filename = file.originalname.toLowerCase();
    return filename.endsWith('.xlsx') || filename.endsWith('.xls');
  }

  public buildErrorMessage(): string {
    return 'File phải là định dạng Excel (.xls hoặc .xlsx)';
  }
}
