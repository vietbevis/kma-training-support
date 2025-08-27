import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Client } from 'minio';
import * as sharp from 'sharp';
import { InjectMinio } from 'src/shared/decorators/minio.decorator';
import { ConfigService } from 'src/shared/services/config.service';
import { UserService } from '../user/user.service';
import {
  FileUploadResponseDto,
  MultipleFileUploadResponseDto,
} from './files.dto';

@Injectable()
export class FilesService {
  private readonly bucketName: string;
  private readonly allowedImageMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ];
  private readonly allowedDocumentMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectMinio() private readonly minioClient: Client,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    this.bucketName = this.configService.get('MINIO_BUCKET_NAME');
    this.initializeBucket();
  }

  private async initializeBucket(): Promise<void> {
    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(
          `✅ Bucket "${this.bucketName}" đã được tạo thành công`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Lỗi khi khởi tạo bucket:', error);
      throw new Error('Không thể khởi tạo bucket MinIO');
    }
  }

  private generateFileName(originalName: string, folderPath: string): string {
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[-:]/g, '')
      .replace('T', '-');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const filename = `${timestamp}-${randomSuffix}.${extension}`;
    return `${folderPath}/${filename}`;
  }

  private isImageFile(mimeType: string): boolean {
    return this.allowedImageMimes.includes(mimeType.toLowerCase());
  }

  private isDocumentFile(mimeType: string): boolean {
    return this.allowedDocumentMimes.includes(mimeType.toLowerCase());
  }

  private validateFile(file: Express.Multer.File): void {
    const mimeType = file.mimetype.toLowerCase();

    if (!this.isImageFile(mimeType) && !this.isDocumentFile(mimeType)) {
      throw new BadRequestException(
        `Định dạng file không được hỗ trợ. Chỉ chấp nhận: ${[
          ...this.allowedImageMimes,
          ...this.allowedDocumentMimes,
        ].join(', ')}`,
      );
    }

    // Giới hạn kích thước file (50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new BadRequestException('Kích thước file không được vượt quá 50MB');
    }
  }

  private async optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Nếu ảnh quá lớn, resize xuống
      const maxWidth = 1920;
      const maxHeight = 1080;

      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          image.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }
      }

      // Tối ưu chất lượng
      return await image
        .jpeg({ quality: 85, progressive: true })
        .png({ quality: 85, progressive: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch (error) {
      this.logger.error('❌ Lỗi khi tối ưu ảnh:', error);
      // Nếu lỗi tối ưu, trả về buffer gốc
      return buffer;
    }
  }

  private async createFolderPath(userId: string): Promise<string> {
    try {
      const user = await this.userService.findOne(userId);
      if (!user) {
        throw new BadRequestException('Không tìm thấy thông tin người dùng');
      }

      // Tạo tên folder từ tên khoa/phòng ban và tên nhân viên
      const departmentName = this.sanitizeFolderName(
        user.facultyDepartment.name,
      );
      const userName = this.sanitizeFolderName(user.fullName);

      return `${departmentName}/${userName}`;
    } catch (error) {
      this.logger.error('❌ Lỗi khi tạo đường dẫn folder:', error);
      throw new BadRequestException('Không thể tạo đường dẫn folder');
    }
  }

  private sanitizeFolderName(name: string): string {
    // Loại bỏ các ký tự đặc biệt và thay thế bằng dấu gạch ngang
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
      .replace(/[^a-zA-Z0-9\s]/g, '') // Loại bỏ ký tự đặc biệt
      .replace(/\s+/g, '-') // Thay thế khoảng trắng bằng dấu gạch ngang
      .toLowerCase();
  }

  private async uploadToMinio(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    originalName: string,
  ): Promise<string> {
    try {
      await this.minioClient.putObject(
        this.bucketName,
        fileName,
        buffer,
        buffer.length,
        {
          'Content-Type': mimeType,
          'original-name': originalName,
        },
      );

      return fileName;
    } catch (error) {
      this.logger.error('❌ Lỗi khi upload file lên MinIO:', error);
      throw new Error('Không thể upload file lên MinIO');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<FileUploadResponseDto> {
    this.validateFile(file);

    const originalName = file.originalname;
    const folderPath = await this.createFolderPath(userId);
    const fileName = this.generateFileName(originalName, folderPath);
    const mimeType = file.mimetype;
    let fileBuffer = file.buffer;
    let fileType: 'image' | 'document';

    // Xử lý file ảnh
    if (this.isImageFile(mimeType)) {
      fileType = 'image';
      fileBuffer = await this.optimizeImage(fileBuffer);
    } else {
      fileType = 'document';
    }

    // Upload lên MinIO
    const url = await this.uploadToMinio(
      fileBuffer,
      fileName,
      mimeType,
      originalName,
    );

    return {
      originalName,
      fileName,
      url,
      size: fileBuffer.length,
      mimeType,
      fileType,
      uploadedAt: new Date(),
    };
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    userId: string,
  ): Promise<MultipleFileUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file nào được upload');
    }

    const uploadPromises = files.map((file) => this.uploadFile(file, userId));
    const uploadedFiles = await Promise.all(uploadPromises);

    const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);

    return {
      files: uploadedFiles,
      totalFiles: uploadedFiles.length,
      totalSize,
    };
  }
}
