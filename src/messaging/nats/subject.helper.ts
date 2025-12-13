export type Channel = 'whatsapp' | 'instagram' | 'linkedin' | 'email' | 'call';

export const subjectFor = {
  received: (companyId: string, channel: Channel) =>
    `company.${companyId}.channel.${channel}.message.received`,
  outbound: (companyId: string, channel: Channel) =>
    `company.${companyId}.channel.${channel}.message.outbound`,
  status: (companyId: string, channel: Channel) =>
    `company.${companyId}.channel.${channel}.message.status`,
};
