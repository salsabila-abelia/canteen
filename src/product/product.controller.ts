import { Controller, Post, Patch, Param, Body, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('api/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Roles(Role.TENANT)
  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async createProduct(@Request() req, @Body() body: any, @UploadedFile() file: Express.Multer.File) {
    return this.productService.createProduct(req.user.id, body, file?.filename);
  }

  @Roles(Role.TENANT)
  @Patch(':id')
  async updateStock(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { stock: number; is_available: boolean }
  ) {
    return this.productService.updateStock(req.user.id, parseInt(id, 10), body.stock, body.is_available);
  }
}
