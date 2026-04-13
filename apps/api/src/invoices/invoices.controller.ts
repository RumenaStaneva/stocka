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
import { InvoicesService, CreateInvoiceData, UpdateInvoiceData, InvoiceQueryParams } from './invoices.service';
import { IsString, IsOptional, IsUrl, IsNumber, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class CreateInvoiceDto {
  @IsString()
  @IsUrl()
  image_url: string;

  @IsString()
  image_filename: string;

  @IsOptional()
  @IsString()
  folder_id?: string;
}

class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  folder_id?: string | null;

  @IsOptional()
  @IsString()
  invoice_number?: string | null;

  @IsOptional()
  @IsString()
  vendor_name?: string | null;

  @IsOptional()
  @IsString()
  vendor_address?: string | null;

  @IsOptional()
  @IsString()
  invoice_date?: string | null;

  @IsOptional()
  @IsString()
  due_date?: string | null;

  @IsOptional()
  @IsNumber()
  subtotal?: number | null;

  @IsOptional()
  @IsNumber()
  tax_amount?: number | null;

  @IsOptional()
  @IsNumber()
  total_amount?: number | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsEnum(['pending', 'reviewed', 'confirmed'])
  status?: string;

  @IsOptional()
  raw_extraction?: Record<string, unknown> | null;

  @IsOptional()
  @IsArray()
  line_items?: {
    description?: string | null;
    quantity?: number | null;
    unit_price?: number | null;
    total_price?: number | null;
  }[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tag_ids?: string[];
}

class QueryInvoicesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  folder_id?: string;

  @IsOptional()
  @IsString()
  tag_id?: string;

  @IsOptional()
  @IsString()
  vendor_name?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

interface AuthRequest {
  user: { id: string; email: string; name: string };
}

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Post()
  async create(@Body() createDto: CreateInvoiceDto, @Request() req: AuthRequest) {
    const data: CreateInvoiceData = {
      user_id: req.user.id,
      folder_id: createDto.folder_id,
      image_url: createDto.image_url,
      image_filename: createDto.image_filename,
    };

    const invoice = await this.invoicesService.create(data);
    return { success: true, data: invoice };
  }

  @Get()
  async findAll(@Query() query: QueryInvoicesDto, @Request() req: AuthRequest) {
    const params: InvoiceQueryParams = {
      page: query.page,
      limit: query.limit,
      folder_id: query.folder_id,
      tag_id: query.tag_id,
      vendor_name: query.vendor_name,
      status: query.status,
      date_from: query.date_from,
      date_to: query.date_to,
      search: query.search,
    };

    const result = await this.invoicesService.findAll(req.user.id, params);

    return {
      success: true,
      data: result.data,
      total: result.total,
      page: query.page || 1,
      limit: query.limit || 20,
      total_pages: Math.ceil(result.total / (query.limit || 20)),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    const invoice = await this.invoicesService.findByIdWithDetails(id, req.user.id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return { success: true, data: invoice };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInvoiceDto,
    @Request() req: AuthRequest,
  ) {
    const invoice = await this.invoicesService.update(id, req.user.id, updateDto as UpdateInvoiceData);
    return { success: true, data: invoice };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.invoicesService.delete(id, req.user.id);
    return { success: true };
  }
}
