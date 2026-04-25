import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'transactions',
})
export class TransactionsGateway {
  @WebSocketServer()
  server!: Server;

  emitStatusUpdate(
    transactionId: string,
    status: 'committed' | 'rolled_back',
    balance?: string,
  ) {
    this.server.emit('transaction:updated', { transactionId, status, balance });
  }
}
