import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async createReview(
    userId: number,
    orderId: number,
    rating: number,
    comment?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.user_id !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Can only review completed orders');
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { order_id: orderId },
    });
    if (existingReview) {
      throw new BadRequestException('Order has already been reviewed');
    }

    return this.prisma.review.create({
      data: {
        order_id: orderId,
        user_id: userId,
        tenant_id: order.tenant_id,
        rating,
        comment,
      },
    });
  }

  async getTenantReviews(tenantUserId: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { user_id: tenantUserId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.review.findMany({
      where: { tenant_id: tenant.id },
      include: {
        user: {
          select: { id: true, name: true },
        },
        order: {
          include: {
            order_items: {
              include: { product: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
