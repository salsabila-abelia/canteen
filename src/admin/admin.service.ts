import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics() {
    const totalUsers = await this.prisma.user.count();
    const totalTenants = await this.prisma.tenant.count();
    
    const orders = await this.prisma.order.findMany();
    const totalOrders = orders.length;
    
    let totalRevenue = 0;
    const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED);
    totalRevenue = completedOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);

    return {
      totalUsers,
      totalTenants,
      totalOrders,
      totalRevenue,
      completedOrders: completedOrders.length,
    };
  }
}
