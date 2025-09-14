import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';

@WebSocketGateway({
  namespace: 'notification',
})
export class NotificationGateway {
  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    console.log('🚀 ~ NotificationGateway ~ handleMessage ~ payload:', payload);
    return 'Hello world!';
  }
}
