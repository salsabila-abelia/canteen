import { Controller, Post, Patch, Param, Body, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, OrderStatus } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('api/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(Role.BUYER)
  @Post()
  async createOrder(@Request() req, @Body() body: { tenant_id: number, items: { productId: number, quantity: number }[], pickup_time: string }) {
    return this.ordersService.createOrder(req.user.id, body.tenant_id, body.items, body.pickup_time);
  }

  @Roles(Role.BUYER)
  @Post(':id/payment-proof')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadPaymentProof(@Request() req, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.ordersService.uploadPaymentProof(req.user.id, parseInt(id, 10), file.filename);
  }

  @Roles(Role.TENANT)
  @Patch(':id/verify-payment')
  async verifyPayment(@Request() req, @Param('id') id: string, @Body('is_valid') isValid: boolean) {
    return this.ordersService.verifyPayment(req.user.id, parseInt(id, 10), isValid);
  }

  @Roles(Role.TENANT)
  @Patch(':id/status')
  async updateStatus(@Request() req, @Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.ordersService.updateOrderStatus(req.user.id, parseInt(id, 10), status);
  }
}
