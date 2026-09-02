import { Controller, Get, Patch, Query, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('api/tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async getTenants(@Query('is_open') isOpenStr: string) {
    let isOpen: boolean | undefined;
    if (isOpenStr === 'true') isOpen = true;
    if (isOpenStr === 'false') isOpen = false;
    return this.tenantService.findAll(isOpen);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TENANT)
  @Patch('qris')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async updateQris(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.tenantService.updateQris(req.user.id, file.filename);
  }
}
