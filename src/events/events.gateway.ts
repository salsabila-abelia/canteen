import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { role: string; id: number },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `room:${data.role}_${data.id}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} joined ${roomName}`);
    return { event: 'joinedRoom', data: roomName };
  }

  emitPaymentUploaded(tenantId: number, orderId: number) {
    this.server
      .to(`room:tenant_${tenantId}`)
      .emit('payment.uploaded', { orderId });
  }

  emitOrderUpdated(userId: number, orderId: number, status: string) {
    this.server
      .to(`room:user_${userId}`)
      .emit('order.updated', { orderId, status });
  }
}
