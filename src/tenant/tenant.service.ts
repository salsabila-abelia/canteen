import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Tenant } from '@prisma/client';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async findAll(isOpen?: boolean): Promise<Tenant[]> {
    if (isOpen !== undefined) {
      return this.prisma.tenant.findMany({ where: { is_open: isOpen } });
    }
    return this.prisma.tenant.findMany();
  }

  async updateQris(userId: number, filename: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { user_id: userId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { qris_image_url: `/uploads/${filename}` },
    });
  }

  async warnTenant(tenantId: number, message: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { warnings: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const warning = await this.prisma.tenantWarning.create({
      data: { tenant_id: tenantId, message }
    });

    if (tenant.warnings.length + 1 >= 3 && !tenant.is_suspended) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { is_suspended: true }
      });
    }

    return warning;
  }

  async getIncome(userId: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { user_id: userId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const result = await this.prisma.order.aggregate({
      _sum: { total_amount: true },
      where: {
        tenant_id: tenant.id,
        status: 'COMPLETED'
      }
    });

    return { total_income: result._sum.total_amount || 0 };
  }
}
