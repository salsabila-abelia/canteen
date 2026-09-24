import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleOrderExpiry() {
    this.logger.debug('Running order expiry check...');
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        created_at: { lt: fifteenMinutesAgo },
      },
      include: { order_items: true },
    });

    for (const order of expiredOrders) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.order_items) {
          await tx.product.update({
            where: { id: item.product_id },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.payment.update({
          where: { order_id: order.id },
          data: { status: PaymentStatus.REJECTED },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELED },
        });
      });

      this.events.emitOrderUpdated(
        order.user_id,
        order.id,
        OrderStatus.CANCELED,
      );
      this.logger.log(`Order ${order.id} canceled due to payment expiry`);
    }
  }

  @Cron('59 23 * * *')
  async handleForfeitedOrders() {
    this.logger.debug('Menjalankan pengecekan pesanan lupa pickup...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const forgottenOrders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.READY, OrderStatus.PROCESSING] },
        created_at: { gte: today },
      },
    });

    for (const order of forgottenOrders) {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.EXPIRED },
        });

        if (order.payment_method === 'CASH') {
          const user = await tx.user.findUnique({ where: { id: order.user_id } });
          if (user) {
            const newStrike = user.cash_strike + 1;
            await tx.user.update({
              where: { id: order.user_id },
              data: {
                cash_strike: newStrike,
                is_cash_banned: newStrike >= 3,
              },
            });
            this.logger.log(`User ${user.id} cash strike incremented to ${newStrike}`);
          }
        }
      });
      
      this.events.emitOrderUpdated(
        order.user_id,
        order.id,
        OrderStatus.EXPIRED,
      );
      this.logger.log(
        `Order ${order.id} diubah jadi EXPIRED karena lupa di-pickup`,
      );
    }
  }
}
