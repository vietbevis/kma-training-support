import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { BackupStatus } from 'src/shared/enums/backup.enum';
import { RsaKeyManager } from 'src/shared/utils/RsaKeyManager';

@Injectable()
@WebSocketGateway({ namespace: '/backup' })
export class BackupGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly EVENT_KEY = {
    BACKUP_STATUS: 'backup_status',
    BACKUP_COMPLETE: 'backup_complete',
    BACKUP_ERROR: 'backup_error',
  };

  @WebSocketServer() server: Server;
  private readonly logger = new Logger(BackupGateway.name);

  constructor(private readonly keyManager: RsaKeyManager) {}

  // map userId -> set of socketIds
  private userSocketMap = new Map<string, Set<string>>();

  /** after init: attach auth middleware to namespace */
  afterInit(server: Server) {
    // attach middleware to namespace so connect can be rejected with connect_error
    server.use((socket: Socket & { data: any }, next) => {
      try {
        // Prefer auth token from handshake.auth (browser)
        let token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization ||
          null;

        // if header like "Bearer <token>"
        if (typeof token === 'string' && token.startsWith('Bearer ')) {
          token = token.split(' ')[1];
        }

        if (!token) {
          this.logger.warn('Missing token in handshake');
          return next(new Error('AUTHENTICATION_ERROR: Missing token'));
        }

        const payload = jwt.verify(
          token,
          this.keyManager.getPublicKeyAccess(),
          { algorithms: ['RS256'] },
        ) as JwtPayload;

        const userId = payload?.sub as string | undefined;
        if (!userId) {
          this.logger.warn('Token does not contain sub (userId)');
          return next(new Error('AUTHENTICATION_ERROR: Invalid token payload'));
        }

        // store userId in socket.data để dùng sau này
        socket.data.userId = userId;
        return next();
      } catch (err) {
        this.logger.warn(
          'Token verification failed in namespace middleware',
          err,
        );
        return next(new Error('AUTHENTICATION_ERROR: Token invalid/expired'));
      }
    });

    this.logger.log('Backup namespace initialized with auth middleware');
  }

  /********** Connection lifecycle **********/

  handleConnection(client: Socket & { data: any }) {
    const userId: string | undefined = client.data?.userId;
    if (!userId) {
      // nếu không có userId (lý thuyết không xảy ra nếu middleware chạy ok)
      this.logger.warn(
        `Connection without userId, disconnecting socket ${client.id}`,
      );
      client.disconnect(true);
      return;
    }

    // add socket id to map
    this.addSocketToUser(userId, client.id);

    this.logger.log(`User ${userId} connected socket ${client.id}`);
  }

  handleDisconnect(client: Socket & { data: any }) {
    const userId: string | undefined = client.data?.userId;
    if (!userId) {
      this.logger.log(`Socket ${client.id} disconnected (no userId present)`);
      return;
    }

    this.removeSocketFromUser(userId, client.id);

    this.logger.log(`User ${userId} disconnected socket ${client.id}`);
  }

  /********** Helper to manage map **********/
  private addSocketToUser(userId: string, socketId: string) {
    if (!this.userSocketMap.has(userId)) {
      this.userSocketMap.set(userId, new Set<string>());
    }
    this.userSocketMap.get(userId)!.add(socketId);
  }

  private removeSocketFromUser(userId: string, socketId: string) {
    const set = this.userSocketMap.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) {
      this.userSocketMap.delete(userId);
    } else {
      this.userSocketMap.set(userId, set);
    }
  }

  private getSocketIdsForUser(userId: string): string[] {
    const set = this.userSocketMap.get(userId);
    if (!set) return [];
    return Array.from(set);
  }

  /********** Notify methods (emit safe, per-socket) **********/

  // Format payload theo chuẩn bạn dùng
  private formatSuccessPayload(data: any) {
    return {
      code: 200,
      status: 'success',
      message: 'OK',
      timestamp: new Date().toISOString(),
      data,
    };
  }

  private formatErrorPayload(
    code: number,
    message: string,
    errors: any = null,
  ) {
    return {
      code,
      status: 'error',
      message,
      timestamp: new Date().toISOString(),
      errors,
    };
  }

  notifyBackupStatus(userId: string, backupId: string, status: BackupStatus) {
    if (!userId) return;

    const socketIds = this.getSocketIdsForUser(userId);
    if (socketIds.length === 0) return;

    const payload = this.formatSuccessPayload({ backupId, status });

    for (const sid of socketIds) {
      // if socket no longer exists in server, cleanup mapping
      // const s = this.server.sockets.sockets.get(sid);
      // if (!s) {
      //   this.logger.debug(
      //     `Socket ${sid} not found, cleaning mapping for user ${userId}`,
      //   );
      //   this.removeSocketFromUser(userId, sid);
      //   continue;
      // }
      this.server.to(sid).emit(this.EVENT_KEY.BACKUP_STATUS, payload);
    }

    this.logger.log(`Backup status notification sent to user ${userId}`);
  }

  notifyBackupComplete(userId: string, backupId: string, details: any) {
    if (!userId) return;

    const socketIds = this.getSocketIdsForUser(userId);
    if (socketIds.length === 0) return;

    const payload = this.formatSuccessPayload({ backupId, details });

    for (const sid of socketIds) {
      // const s = this.server.sockets.sockets.get(sid);
      // if (!s) {
      //   this.removeSocketFromUser(userId, sid);
      //   continue;
      // }
      this.server.to(sid).emit(this.EVENT_KEY.BACKUP_COMPLETE, payload);
    }

    this.logger.log(`Backup completion notification sent to user ${userId}`);
  }

  notifyBackupError(userId: string, backupId: string, errorMessage: string) {
    if (!userId) return;

    const socketIds = this.getSocketIdsForUser(userId);
    if (socketIds.length === 0) return;

    const payload = this.formatErrorPayload(500, errorMessage);

    for (const sid of socketIds) {
      // const s = this.server.sockets.sockets.get(sid);
      // if (!s) {
      //   this.removeSocketFromUser(userId, sid);
      //   continue;
      // }
      this.server.to(sid).emit(this.EVENT_KEY.BACKUP_ERROR, payload);
    }

    this.logger.log(`Backup error notification sent to user ${userId}`);
  }
}
