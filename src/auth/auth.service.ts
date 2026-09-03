import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password_hash))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(data: any) {
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new BadRequestException('Email already exists');
    }
    const hashed = await bcrypt.hash(data.password, 10);
    const roleToCreate = data.role || Role.BUYER;
    const user = await this.usersService.create({
      email: data.email,
      name: data.name,
      password_hash: hashed,
      role: roleToCreate,
      ...(roleToCreate === Role.TENANT
        ? {
            tenant: {
              create: {
                name: data.name, // Gunakan nama user sebagai nama tenant default
              },
            },
          }
        : {}),
    });
    return this.login(user);
  }
}
