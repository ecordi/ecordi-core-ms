import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, ContactDocument } from '../schemas/contact.schema';
import { CreateContactDto, UpdateContactDto } from '../dto/contact.dto';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    @InjectModel(Contact.name) private readonly contactModel: Model<ContactDocument>,
  ) {}

  async findOrCreateContact(companyId: string, phoneNumber: string, initialData?: Partial<CreateContactDto>): Promise<ContactDocument> {
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    
    let contact = await this.contactModel.findOne({
      companyId,
      phoneNumber: cleanPhone,
    }).exec();

    if (!contact) {
      this.logger.log(`Creating new contact for phone: ${cleanPhone}`);
      
      // Try to extract name from WhatsApp profile if available
      const contactData: CreateContactDto = {
        companyId,
        phoneNumber: cleanPhone,
        name: initialData?.name || this.generateDisplayName(cleanPhone),
        whatsappName: initialData?.whatsappName,
        email: initialData?.email,
        profilePicture: initialData?.profilePicture,
        metadata: {
          isWhatsAppUser: true,
          lastSeen: new Date(),
          ...initialData?.metadata,
        },
      };

      contact = await this.contactModel.create(contactData);
      this.logger.log(`Contact created with ID: ${contact._id}`);
    } else {
      // Update last seen
      contact.metadata = {
        ...contact.metadata,
        lastSeen: new Date(),
      };
      await contact.save();
    }

    return contact;
  }

  async findByPhoneNumber(companyId: string, phoneNumber: string): Promise<ContactDocument | null> {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    return this.contactModel.findOne({
      companyId,
      phoneNumber: cleanPhone,
    }).exec();
  }

  async findById(contactId: string): Promise<ContactDocument> {
    const contact = await this.contactModel.findById(contactId).exec();
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }
    return contact;
  }

  async updateContact(contactId: string, updateData: UpdateContactDto): Promise<ContactDocument> {
    const contact = await this.contactModel.findByIdAndUpdate(
      contactId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).exec();

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    return contact;
  }

  async updateContactByPhone(companyId: string, phoneNumber: string, updateData: UpdateContactDto): Promise<ContactDocument> {
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    const contact = await this.contactModel.findOneAndUpdate(
      { companyId, phoneNumber: cleanPhone },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).exec();

    if (!contact) {
      throw new NotFoundException(`Contact with phone ${phoneNumber} not found`);
    }

    return contact;
  }

  async listContacts(companyId: string, page = 1, limit = 50): Promise<{ contacts: ContactDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [contacts, total] = await Promise.all([
      this.contactModel
        .find({ companyId })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.contactModel.countDocuments({ companyId }),
    ]);

    return { contacts, total };
  }

  async searchContacts(companyId: string, query: string): Promise<ContactDocument[]> {
    const searchRegex = new RegExp(query, 'i');
    
    return this.contactModel.find({
      companyId,
      $or: [
        { name: searchRegex },
        { phoneNumber: searchRegex },
        { email: searchRegex },
        { whatsappName: searchRegex },
      ],
    }).exec();
  }

  async deleteContact(contactId: string): Promise<void> {
    const result = await this.contactModel.deleteOne({ _id: contactId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }
  }

  // Helper methods
  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    return phoneNumber.replace(/[^\d+]/g, '');
  }

  private generateDisplayName(phoneNumber: string): string {
    // Generate a friendly display name from phone number
    const cleanPhone = this.cleanPhoneNumber(phoneNumber);
    if (cleanPhone.startsWith('+')) {
      return cleanPhone;
    }
    return `+${cleanPhone}`;
  }

  // Method to enrich contact with WhatsApp profile data
  async enrichContactWithWhatsAppData(contactId: string, whatsappData: {
    name?: string;
    profilePicture?: string;
    businessAccount?: boolean;
  }): Promise<ContactDocument> {
    const updateData: UpdateContactDto = {
      metadata: {
        isWhatsAppUser: true,
        businessAccount: whatsappData.businessAccount || false,
        lastSeen: new Date(),
      },
    };

    // Only update name if we don't have one or if WhatsApp name is different
    if (whatsappData.name) {
      updateData.whatsappName = whatsappData.name;
      // If we don't have a name set, use WhatsApp name
      const contact = await this.findById(contactId);
      if (!contact.name || contact.name === contact.phoneNumber) {
        updateData.name = whatsappData.name;
      }
    }

    if (whatsappData.profilePicture) {
      updateData.profilePicture = whatsappData.profilePicture;
    }

    return this.updateContact(contactId, updateData);
  }
}
