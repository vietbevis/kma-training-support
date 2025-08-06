import { ApiProperty } from '@nestjs/swagger';

export class FileUploadResponseDto {
  @ApiProperty({
    description: 'Tên file gốc',
    example: 'image.jpg',
  })
  originalName: string;

  @ApiProperty({
    description: 'Tên file đã được lưu',
    example: '2024-01-15-123456-image.jpg',
  })
  fileName: string;

  @ApiProperty({
    description: 'URL để truy cập file',
    example: 'http://localhost:9000/bucket/2024-01-15-123456-image.jpg',
  })
  url: string;

  @ApiProperty({
    description: 'Kích thước file (bytes)',
    example: 1024000,
  })
  size: number;

  @ApiProperty({
    description: 'MIME type của file',
    example: 'image/jpeg',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Loại file (image/document)',
    example: 'image',
  })
  fileType: 'image' | 'document';

  @ApiProperty({
    description: 'Thời gian upload',
    example: '2024-01-15T10:30:00.000Z',
  })
  uploadedAt: Date;
}

export class MultipleFileUploadResponseDto {
  @ApiProperty({
    description: 'Danh sách file đã upload thành công',
    type: [FileUploadResponseDto],
  })
  files: FileUploadResponseDto[];

  @ApiProperty({
    description: 'Tổng số file đã upload',
    example: 3,
  })
  totalFiles: number;

  @ApiProperty({
    description: 'Tổng kích thước tất cả file (bytes)',
    example: 3072000,
  })
  totalSize: number;
}
