import { FileValidator } from '@nestjs/common';
// docx, doc
export class WordFileValidator extends FileValidator {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) {
      return false;
    }

    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-word',
    ];

    const allowedExtensions = ['.docx', '.doc'];

    const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext),
    );

    return hasValidMimeType || hasValidExtension;
  }

  buildErrorMessage(): string {
    return 'File phải có định dạng Word (.docx hoặc .doc)';
  }
}
