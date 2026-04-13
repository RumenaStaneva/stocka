import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FoldersService, CreateFolderData, UpdateFolderData } from './folders.service';
import { IsString, IsOptional } from 'class-validator';

class CreateFolderDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  parent_id?: string | null;
}

class UpdateFolderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  parent_id?: string | null;
}

interface AuthRequest {
  user: { id: string; email: string; name: string };
}

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private foldersService: FoldersService) {}

  @Post()
  async create(@Body() createDto: CreateFolderDto, @Request() req: AuthRequest) {
    const data: CreateFolderData = {
      name: createDto.name,
      parent_id: createDto.parent_id,
      user_id: req.user.id,
    };

    const folder = await this.foldersService.create(data);
    return { success: true, data: folder };
  }

  @Get()
  async findAll(@Request() req: AuthRequest) {
    const folders = await this.foldersService.findAll(req.user.id);
    return { success: true, data: folders };
  }

  @Get('children')
  async findChildren(
    @Query('parent_id') parentId: string | undefined,
    @Request() req: AuthRequest,
  ) {
    const folders = await this.foldersService.findChildren(
      parentId || null,
      req.user.id,
    );
    return { success: true, data: folders };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    const folder = await this.foldersService.findById(id, req.user.id);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return { success: true, data: folder };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFolderDto,
    @Request() req: AuthRequest,
  ) {
    const folder = await this.foldersService.update(id, req.user.id, updateDto as UpdateFolderData);
    return { success: true, data: folder };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.foldersService.delete(id, req.user.id);
    return { success: true };
  }
}
