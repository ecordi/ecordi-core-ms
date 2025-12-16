import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ContactsService } from '../services/contacts.service';
import { CreateContactDto, UpdateContactDto, ContactResponseDto } from '../dto/contact.dto';

@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get(':companyId')
  @ApiOperation({ summary: 'List all contacts for a company' })
  @ApiResponse({ status: 200, description: 'Contacts retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listContacts(
    @Param('companyId') companyId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const result = await this.contactsService.listContacts(companyId, Number(page), Number(limit));
    return {
      success: true,
      data: result.contacts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
        pages: Math.ceil(result.total / Number(limit)),
      },
    };
  }

  @Get(':companyId/search')
  @ApiOperation({ summary: 'Search contacts' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiQuery({ name: 'q', required: true, type: String })
  async searchContacts(
    @Param('companyId') companyId: string,
    @Query('q') query: string,
  ) {
    const contacts = await this.contactsService.searchContacts(companyId, query);
    return {
      success: true,
      data: contacts,
    };
  }

  @Get(':companyId/phone/:phoneNumber')
  @ApiOperation({ summary: 'Get contact by phone number' })
  @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async getContactByPhone(
    @Param('companyId') companyId: string,
    @Param('phoneNumber') phoneNumber: string,
  ) {
    const contact = await this.contactsService.findByPhoneNumber(companyId, phoneNumber);
    if (!contact) {
      return {
        success: false,
        message: 'Contact not found',
      };
    }
    return {
      success: true,
      data: contact,
    };
  }

  @Get('id/:contactId')
  @ApiOperation({ summary: 'Get contact by ID' })
  @ApiResponse({ status: 200, description: 'Contact retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async getContactById(@Param('contactId') contactId: string) {
    const contact = await this.contactsService.findById(contactId);
    return {
      success: true,
      data: contact,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  @HttpCode(HttpStatus.CREATED)
  async createContact(@Body() createContactDto: CreateContactDto) {
    const contact = await this.contactsService.findOrCreateContact(
      createContactDto.companyId,
      createContactDto.phoneNumber,
      createContactDto,
    );
    return {
      success: true,
      data: contact,
    };
  }

  @Put(':contactId')
  @ApiOperation({ summary: 'Update contact by ID' })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async updateContact(
    @Param('contactId') contactId: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    const contact = await this.contactsService.updateContact(contactId, updateContactDto);
    return {
      success: true,
      data: contact,
    };
  }

  @Put(':companyId/phone/:phoneNumber')
  @ApiOperation({ summary: 'Update contact by phone number' })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async updateContactByPhone(
    @Param('companyId') companyId: string,
    @Param('phoneNumber') phoneNumber: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    const contact = await this.contactsService.updateContactByPhone(companyId, phoneNumber, updateContactDto);
    return {
      success: true,
      data: contact,
    };
  }

  @Delete(':contactId')
  @ApiOperation({ summary: 'Delete contact' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async deleteContact(@Param('contactId') contactId: string) {
    await this.contactsService.deleteContact(contactId);
    return {
      success: true,
      message: 'Contact deleted successfully',
    };
  }

  @Post(':contactId/enrich')
  @ApiOperation({ summary: 'Enrich contact with WhatsApp profile data' })
  @ApiResponse({ status: 200, description: 'Contact enriched successfully' })
  async enrichContact(
    @Param('contactId') contactId: string,
    @Body() whatsappData: {
      name?: string;
      profilePicture?: string;
      businessAccount?: boolean;
    },
  ) {
    const contact = await this.contactsService.enrichContactWithWhatsAppData(contactId, whatsappData);
    return {
      success: true,
      data: contact,
    };
  }
}
