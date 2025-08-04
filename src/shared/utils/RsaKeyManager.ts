import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { generateKeyPairSync } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '../services/config.service';

const KeyType = {
  ACCESS_TOKEN: 'ACCESS_TOKEN',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
} as const;

type KeyType = (typeof KeyType)[keyof typeof KeyType];

@Injectable()
export class RsaKeyManager {
  private static RSA_ALGORITHM = 'rsa' as const;
  private static KEY_SIZE = 2048;

  private keyDirectory: string;
  private privateKeyAccessFilename: string;
  private publicKeyAccessFilename: string;
  private privateKeyRefreshFilename: string;
  private publicKeyRefreshFilename: string;

  public privateKeyAccess!: string;
  public publicKeyAccess!: string;
  public privateKeyRefresh!: string;
  public publicKeyRefresh!: string;

  private readonly logger = new Logger(RsaKeyManager.name);

  constructor(private readonly configService: ConfigService) {
    this.keyDirectory = this.configService.get('JWT_KEY_DIRECTORY') || './keys';
    this.privateKeyAccessFilename =
      this.configService.get('JWT_PRIVATE_ACCESS') || 'private_key_access.pem';
    this.publicKeyAccessFilename =
      this.configService.get('JWT_PUBLIC_ACCESS') || 'public_key_access.pem';
    this.privateKeyRefreshFilename =
      this.configService.get('JWT_PRIVATE_REFRESH') ||
      'private_key_refresh.pem';
    this.publicKeyRefreshFilename =
      this.configService.get('JWT_PUBLIC_REFRESH') || 'public_key_refresh.pem';

    this.init().catch((err) => {
      this.logger.error('Lỗi khởi tạo RsaKeyManager:', err);
      throw err;
    });
  }

  private async init() {
    try {
      await this.createKeyDirectoryIfNeeded();

      const privAccessPath = path.join(
        this.keyDirectory,
        this.privateKeyAccessFilename,
      );
      const pubAccessPath = path.join(
        this.keyDirectory,
        this.publicKeyAccessFilename,
      );
      const privRefreshPath = path.join(
        this.keyDirectory,
        this.privateKeyRefreshFilename,
      );
      const pubRefreshPath = path.join(
        this.keyDirectory,
        this.publicKeyRefreshFilename,
      );

      if (
        this.allKeysExist(
          privAccessPath,
          pubAccessPath,
          privRefreshPath,
          pubRefreshPath,
        )
      ) {
        this.logger.log(
          'Đã phát hiện các cặp khóa tồn tại, tiến hành tải khóa...',
        );
        this.loadKeys(
          privAccessPath,
          pubAccessPath,
          privRefreshPath,
          pubRefreshPath,
        );
      } else {
        this.logger.log('Không tìm thấy cặp khóa, tiến hành tạo mới...');
        this.generateAndSaveKeyPair(
          privAccessPath,
          pubAccessPath,
          KeyType.ACCESS_TOKEN,
        );
        this.generateAndSaveKeyPair(
          privRefreshPath,
          pubRefreshPath,
          KeyType.REFRESH_TOKEN,
        );
      }

      this.logger.log('Khởi tạo khóa RSA thành công');
    } catch (err) {
      if (err instanceof Error) {
        throw new BadRequestException('Không thể khởi tạo khóa RSA', err);
      }
      throw err;
    }
  }

  private async createKeyDirectoryIfNeeded() {
    try {
      await fs.promises.access(this.keyDirectory);
    } catch {
      await fs.promises.mkdir(this.keyDirectory, { recursive: true });
      this.logger.log(`Đã tạo thư mục chứa khóa: ${this.keyDirectory}`);
    }
  }

  private allKeysExist(...files: string[]): boolean {
    return files.every((file) => fs.existsSync(file));
  }

  private loadKeys(
    privateKeyAccessPath: string,
    publicKeyAccessPath: string,
    privateKeyRefreshPath: string,
    publicKeyRefreshPath: string,
  ) {
    this.privateKeyAccess = fs.readFileSync(privateKeyAccessPath, 'utf8');
    this.publicKeyAccess = fs.readFileSync(publicKeyAccessPath, 'utf8');
    this.privateKeyRefresh = fs.readFileSync(privateKeyRefreshPath, 'utf8');
    this.publicKeyRefresh = fs.readFileSync(publicKeyRefreshPath, 'utf8');

    this.logger.log('Tải các cặp khóa RSA từ file thành công');
  }

  private generateAndSaveKeyPair(
    privateKeyPath: string,
    publicKeyPath: string,
    type: KeyType,
  ) {
    const { privateKey, publicKey } = generateKeyPairSync(
      RsaKeyManager.RSA_ALGORITHM,
      {
        modulusLength: RsaKeyManager.KEY_SIZE,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      },
    );

    if (type === KeyType.ACCESS_TOKEN) {
      this.privateKeyAccess = privateKey;
      this.publicKeyAccess = publicKey;
    } else {
      this.privateKeyRefresh = privateKey;
      this.publicKeyRefresh = publicKey;
    }

    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);

    this.logger.log(`Đã tạo và lưu cặp khóa RSA cho token loại ${type}`);
  }

  public getPrivateKeyAccess(): string {
    return this.privateKeyAccess;
  }
  public getPublicKeyAccess(): string {
    return this.publicKeyAccess;
  }
  public getPrivateKeyRefresh(): string {
    return this.privateKeyRefresh;
  }
  public getPublicKeyRefresh(): string {
    return this.publicKeyRefresh;
  }
}
