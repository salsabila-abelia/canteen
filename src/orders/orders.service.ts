import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private events: EventsGateway) {}

  async createOrder(userId: number, tenantId: number, items: { productId: number, quantity: number }[], pickupTime: string) {
    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        // Pessimistic Lock
        const products: any[] = await tx.$queryRaw`SELECT price, stock FROM Product WHERE id = ${item.productId} AND tenant_id = ${tenantId} FOR UPDATE`;
        
        if (!products.length) {
          throw new NotFoundException(`Product ${item.productId} not found for this tenant`);
        }
        
        const product = products[0];
        if (product.stock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
        }

        // Deduct stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });

        const subtotal = Number(product.price) * item.quantity;
        totalAmount += subtotal;

        orderItems.push({
          product_id: item.productId,
          quantity: item.quantity,
          subtotal: subtotal
        });
      }

      const order = await tx.order.create({
        data: {
          user_id: userId,
          tenant_id: tenantId,
          total_amount: totalAmount,
          pickup_time: new Date(pickupTime),
          status: OrderStatus.PENDING,
          order_items: {
            create: orderItems
          },
          payment: {
            create: {
              amount: totalAmount,
              status: PaymentStatus.PENDING
            }
          }
        },
        include: { payment: true, order_items: true }
      });

      return order;
    });
  }

  async uploadPaymentProof(userId: number, orderId: number, filename: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order || order.user_id !== userId) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in PENDING state');
    }

    await this.prisma.payment.update({
      where: { order_id: orderId },
      data: { proof_image_url: `/uploads/${filename}` }
    });

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.VERIFYING },
      include: { payment: true }
    });

    this.events.emitPaymentUploaded(order.tenant_id, orderId);
    return updatedOrder;
  }

  async verifyPayment(tenantUserId: number, orderId: number, isValid: boolean) {
    const tenant = await this.prisma.tenant.findUnique({ where: { user_id: tenantUserId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { order_items: true, payment: true }
    });

    if (!order || order.tenant_id !== tenant.id) {
      throw new NotFoundException('Order not found or not owned by you');
    }

    if (order.status !== OrderStatus.VERIFYING) {
      throw new BadRequestException('Order is not in VERIFYING state');
    }

    if (isValid) {
      await this.prisma.payment.update({
        where: { order_id: orderId },
        data: { status: PaymentStatus.SUCCESS }
      });
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PROCESSING }
      });
      this.events.emitOrderUpdated(order.user_id, orderId, OrderStatus.PROCESSING);
      return updatedOrder;
    } else {
      // Reject and rollback stock
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { order_id: orderId },
          data: { status: PaymentStatus.REJECTED }
        });

        for (const item of order.order_items) {
          await tx.product.update({
            where: { id: item.product_id },
            data: { stock: { increment: item.quantity } }
          });
        }

        return tx.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.CANCELED }
        });
      });
      this.events.emitOrderUpdated(order.user_id, orderId, OrderStatus.CANCELED);
      return result;
    }
  }

  async updateOrderStatus(tenantUserId: number, orderId: number, status: OrderStatus) {
    const tenant = await this.prisma.tenant.findUnique({ where: { user_id: tenantUserId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.tenant_id !== tenant.id) {
      throw new NotFoundException('Order not found or not owned by you');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status }
    });
    this.events.emitOrderUpdated(order.user_id, orderId, status);
    return updatedOrder;
  }
}
