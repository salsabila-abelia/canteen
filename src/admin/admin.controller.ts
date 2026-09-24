import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Dashboard metrik admin',
    description: 'Mengembalikan statistik global seperti total pendapatan, total kantin, dan total order (Hanya Admin).',
  })
  @ApiResponse({ status: 200, description: 'Statistik dashboard' })
  async getDashboard() {
    return this.adminService.getDashboardMetrics();
  }
}
