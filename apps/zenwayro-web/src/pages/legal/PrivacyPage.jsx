import { Link } from 'grainlet/route';
import { ROUTE_PRIVACY } from '../../routes.js';
import { LegalBlockList } from './legalBlocks.jsx';
import {
  LEGAL_LAST_UPDATED,
  numberedTocItems,
  scrollToSectionId,
  sectionHref,
} from './legalShared.js';
import {
  PRIVACY_INTRO_CLOSING,
  PRIVACY_INTRO_LEAD,
  PRIVACY_INTRO_LIST_ITEMS,
  PRIVACY_INTRO_TITLE,
  PRIVACY_SECTIONS,
  PRIVACY_SUMMARY_PARAGRAPHS,
  PRIVACY_SUMMARY_TITLE,
} from './privacyContent.js';

const tocItems = numberedTocItems(PRIVACY_SECTIONS);

export function PrivacyPage() {
  return (
    <article class="max-w-3xl mx-auto px-6 py-12">
      <header class="mb-10">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {PRIVACY_INTRO_TITLE}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated {LEGAL_LAST_UPDATED}
        </p>
        <div class="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>{PRIVACY_INTRO_LEAD}</p>
          <ul class="list-disc pl-6 space-y-2">
            {PRIVACY_INTRO_LIST_ITEMS.map((item, index) => (
              <li key={`intro-list-${index}`}>{item}</li>
            ))}
          </ul>
          <p>{PRIVACY_INTRO_CLOSING}</p>
        </div>
      </header>

      <section class="mb-10">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {PRIVACY_SUMMARY_TITLE}
        </h2>
        <div class="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          {PRIVACY_SUMMARY_PARAGRAPHS.map((paragraph, index) => (
            <p key={`summary-${index}`}>{paragraph}</p>
          ))}
        </div>
      </section>

      <nav aria-label="Table of contents" class="mb-10">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          TABLE OF CONTENTS
        </h2>
        <ol class="list-decimal pl-6 space-y-1 text-sm text-gray-600 dark:text-gray-400">
          {tocItems.map((item) => (
            <li key={item.id}>
              <Link
                href={sectionHref(ROUTE_PRIVACY, item.id)}
                activeClass=""
                class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                onClick={() => scrollToSectionId(item.id)}
              >
                {item.number}. {item.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      {PRIVACY_SECTIONS.map((section) => (
        <section id={section.id} key={section.id} class="scroll-mt-24 mb-10">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {section.number}. {section.title}
          </h2>
          <LegalBlockList sectionId={section.id} blocks={section.blocks} />
        </section>
      ))}
    </article>
  );
}
