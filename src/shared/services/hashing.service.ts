import { Injectable } from '@nestjs/common';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';

@Injectable()
export class HashingService {
  hash(data: string): string {
    const salt = genSaltSync(10);
    return hashSync(data, salt);
  }

  compare(data: string, hash: string): boolean {
    return compareSync(data, hash);
  }
}
