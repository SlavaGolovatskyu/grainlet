import { useI18n } from 'grainlet/i18n';
import { Link } from 'grainlet/route';
import { translateApp } from '../../i18n.js';
import { ROUTE_QUIZ } from '../../routes.js';
import {
  CONTACT_FAQ_ITEMS,
  CONTACT_PRIMARY_EMAIL,
  CONTACT_QUICK_INFO_ITEMS,
  CONTACT_SECONDARY_EMAIL,
  CONTACT_SOCIAL_PLATFORM_IDS,
  SOCIAL_LINKS,
  contactMailtoLinks,
  linksForPlatforms,
} from './contactContent.js';

export function ContactPage() {
  const i18n = useI18n();
  const t = (key) => translateApp(i18n, key);
  const socialLinks = linksForPlatforms(SOCIAL_LINKS, CONTACT_SOCIAL_PLATFORM_IDS);
  const emailLinks = contactMailtoLinks(CONTACT_PRIMARY_EMAIL, CONTACT_SECONDARY_EMAIL);

  return (
    <div class="min-h-dvh bg-white dark:bg-gray-950">
      <section class="py-16 md:py-24 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div class="max-w-3xl mx-auto text-center space-y-4">
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {t('contact.heroTitle')}
          </h1>
          <p class="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('contact.heroSubtitle')}
          </p>
        </div>
      </section>

      <div class="max-w-3xl mx-auto px-6 py-12">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">
          {t('contact.contactInfoTitle')}
        </h2>

        <div class="grid gap-6 md:grid-cols-2 mb-12">
          <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111111] p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {t('contact.emailTitle')}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('contact.emailSubtitle')}
            </p>
            {emailLinks.map((link, index) => (
              <a
                key={link.email}
                href={link.href}
                class={
                  index === 0
                    ? 'block text-indigo-600 dark:text-indigo-400 font-medium hover:underline'
                    : 'block mt-2 text-indigo-600 dark:text-indigo-400 font-medium hover:underline'
                }
              >
                {link.email}
              </a>
            ))}
          </div>

          <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111111] p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {t('contact.followTitle')}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('contact.followSubtitle')}
            </p>
            <ul class="space-y-2">
              {socialLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    {t(link.labelKey)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section class="mb-12">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('contact.quickInfoTitle')}
          </h2>
          <ul class="space-y-2 text-gray-700 dark:text-gray-300">
            {CONTACT_QUICK_INFO_ITEMS.map((item) => (
              <li key={item.id} class="flex gap-2">
                <span class="text-indigo-600 dark:text-indigo-400" aria-hidden="true">
                  •
                </span>
                {t(item.labelKey)}
              </li>
            ))}
          </ul>
        </section>

        <section class="mb-16">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('contact.faqTitle')}
          </h2>
          <div class="space-y-4">
            {CONTACT_FAQ_ITEMS.map((item) => (
              <details
                key={item.id}
                class="group rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#111111] overflow-hidden"
              >
                <summary class="cursor-pointer list-none px-5 py-4 font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors [&::-webkit-details-marker]:hidden">
                  {t(item.questionKey)}
                </summary>
                <p class="px-5 pb-4 text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-200 dark:border-gray-800 pt-4">
                  {t(item.answerKey)}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section class="py-12 text-center space-y-6 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 border border-gray-200 dark:border-gray-800 px-6">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">
            {t('contact.ctaTitle')}
          </h2>
          <p class="text-gray-600 dark:text-gray-400">{t('contact.ctaSubtitle')}</p>
          <Link
            href={ROUTE_QUIZ}
            activeClass=""
            class="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-indigo-600/25"
          >
            {t('common.getStartedFree')}
          </Link>
        </section>
      </div>
    </div>
  );
}
