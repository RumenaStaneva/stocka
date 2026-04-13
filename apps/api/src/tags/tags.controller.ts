import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TagsService, CreateTagData, UpdateTagData } from './tags.service';
import { IsString, IsOptional, Matches } from 'class-validator';

class CreateTagDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color' })
  color?: string;
}

class UpdateTagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color' })
  color?: string;
}

interface AuthRequest {
  user: { id: string; email: string; name: string };
}

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Post()
  async create(@Body() createDto: CreateTagDto, @Request() req: AuthRequest) {
    const data: CreateTagData = {
      name: createDto.name,
      color: createDto.color,
      user_id: req.user.id,
    };

    const tag = await this.tagsService.create(data);
    return { success: true, data: tag };
  }

  @Get()
  async findAll(@Request() req: AuthRequest) {
    const tags = await this.tagsService.findAll(req.user.id);
    return { success: true, data: tags };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    const tag = await this.tagsService.findById(id, req.user.id);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return { success: true, data: tag };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTagDto,
    @Request() req: AuthRequest,
  ) {
    const tag = await this.tagsService.update(id, req.user.id, updateDto as UpdateTagData);
    return { success: true, data: tag };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.tagsService.delete(id, req.user.id);
    return { success: true };
  }
}
