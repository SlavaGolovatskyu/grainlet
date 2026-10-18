import {
  ROUTE_CONTACT,
  ROUTE_COOKIES,
  ROUTE_PRIVACY,
  ROUTE_TERMS,
} from '../../routes.js';

export const LEGAL_LAST_UPDATED = 'April 08, 2026';

export const LEGAL_SITE_URL = 'https://zenwayro.com';

export const LEGAL_PRIMARY_EMAIL = 'zenwayro@gmail.com';

export const LEGAL_SECONDARY_EMAIL = 'slavik.golovatskyu@gmail.com';

export const LEGAL_CONTACT_EMAILS = [LEGAL_PRIMARY_EMAIL, LEGAL_SECONDARY_EMAIL];

export const LEGAL_ADDRESS =
  'Taras Shevchenko 23, Monastyryska, Ternopil Region, 48301, Ukraine';

export const PRIVACY_POLICY_URL = `${LEGAL_SITE_URL}${ROUTE_PRIVACY}`;

export const COOKIES_POLICY_URL = `${LEGAL_SITE_URL}${ROUTE_COOKIES}`;

export const TERMS_POLICY_URL = `${LEGAL_SITE_URL}${ROUTE_TERMS}`;

export const CONTACT_PAGE_URL = `${LEGAL_SITE_URL}${ROUTE_CONTACT}`;

export const IN_APP_LEGAL_LINKS = [
  { href: ROUTE_PRIVACY, text: PRIVACY_POLICY_URL },
  { href: ROUTE_COOKIES, text: COOKIES_POLICY_URL },
  { href: ROUTE_TERMS, text: TERMS_POLICY_URL },
  { href: ROUTE_CONTACT, text: CONTACT_PAGE_URL },
];

export function sectionHref(pathname, id) {
  return `${pathname}#${id}`;
}

export function numberedTocItems(sections) {
  return sections.map((section) => ({
    id: section.id,
    number: section.number,
    title: section.title,
  }));
}

export function titledTocItems(sections) {
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
  }));
}

export function mailtoHref(email) {
  return `mailto:${email}`;
}

export function scrollToSectionId(id) {
  const run = () => {
    if (typeof document === 'undefined' || !id) return;
    const node = document.getElementById(id);
    if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView();
  };
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(run));
  } else {
    queueMicrotask(run);
  }
}

export function splitTextByLinks(text, links = IN_APP_LEGAL_LINKS) {
  if (typeof text !== 'string' || text.length === 0) {
    return [{ type: 'text', text: text == null ? '' : String(text) }];
  }

  const parts = [];
  let cursor = 0;

  while (cursor < text.length) {
    let foundAt = -1;
    let found = null;

    for (const link of links) {
      if (!link || typeof link.text !== 'string' || link.text.length === 0) continue;
      const at = text.indexOf(link.text, cursor);
      if (at === -1) continue;
      const earlier = foundAt === -1 || at < foundAt;
      const sameSpotLonger =
        at === foundAt && found != null && link.text.length > found.text.length;
      if (earlier || sameSpotLonger) {
        foundAt = at;
        found = link;
      }
    }

    if (!found) {
      parts.push({ type: 'text', text: text.slice(cursor) });
      break;
    }

    if (foundAt > cursor) {
      parts.push({ type: 'text', text: text.slice(cursor, foundAt) });
    }
    parts.push({ type: 'link', href: found.href, text: found.text });
    cursor = foundAt + found.text.length;
  }

  return parts;
}
