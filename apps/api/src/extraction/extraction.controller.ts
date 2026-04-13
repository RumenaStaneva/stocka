import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExtractionService } from './extraction.service';
import { IsString, IsUrl } from 'class-validator';

class ExtractDto {
  @IsString()
  @IsUrl()
  image_url: string;
}

@Controller('extract')
@UseGuards(JwtAuthGuard)
export class ExtractionController {
  constructor(private extractionService: ExtractionService) {}

  @Post()
  async extractInvoice(@Body() extractDto: ExtractDto) {
    const data = await this.extractionService.extractInvoiceData(
      extractDto.image_url,
    );

    return {
      success: true,
      data,
    };
  }
}
