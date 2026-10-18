import { mailtoHref } from './legalShared.js';

export const CONTACT_PRIMARY_EMAIL = 'zenwayro@gmail.com';

export const CONTACT_SECONDARY_EMAIL = 'slavik.golovatskyu@gmail.com';

export const CONTACT_SOCIAL_PLATFORM_IDS = ['instagram', 'tiktok'];

export const SOCIAL_LINKS = [
  {
    id: 'facebook',
    href: 'https://www.facebook.com/profile.php?id=61590249628343',
    labelKey: 'footer.facebook',
  },
  {
    id: 'x',
    href: 'https://x.com/zenwayro',
    labelKey: 'footer.x',
  },
  {
    id: 'tiktok',
    href: 'https://www.tiktok.com/@zenwayro',
    labelKey: 'footer.tiktok',
  },
  {
    id: 'instagram',
    href: 'https://www.instagram.com/zenwayro',
    labelKey: 'footer.instagram',
  },
  {
    id: 'linkedin',
    href: 'https://www.linkedin.com/company/zenwayro',
    labelKey: 'footer.linkedin',
  },
];

export const CONTACT_QUICK_INFO_ITEMS = [
  { id: 'response', labelKey: 'contact.quickInfoResponse' },
  { id: 'location', labelKey: 'contact.quickInfoLocation' },
  { id: 'languages', labelKey: 'contact.quickInfoLanguages' },
];

export const CONTACT_FAQ_ITEMS = [
  {
    id: 'started',
    questionKey: 'contact.faqStartedQuestion',
    answerKey: 'contact.faqStartedAnswer',
  },
  {
    id: 'secure',
    questionKey: 'contact.faqSecureQuestion',
    answerKey: 'contact.faqSecureAnswer',
  },
  {
    id: 'offline',
    questionKey: 'contact.faqOfflineQuestion',
    answerKey: 'contact.faqOfflineAnswer',
  },
  {
    id: 'refunds',
    questionKey: 'contact.faqRefundsQuestion',
    answerKey: 'contact.faqRefundsAnswer',
  },
];

export function linksForPlatforms(links, platformIds) {
  const allowed = new Set(platformIds);
  return links.filter((link) => allowed.has(link.id));
}

export function contactMailtoLinks(primaryEmail, secondaryEmail) {
  return [primaryEmail, secondaryEmail].map((email) => ({
    email,
    href: mailtoHref(email),
  }));
}
