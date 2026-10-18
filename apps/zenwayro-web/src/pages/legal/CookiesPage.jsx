import { Link } from 'grainlet/route';
import { ROUTE_COOKIES } from '../../routes.js';
import { LegalBlockList } from './legalBlocks.jsx';
import {
  LEGAL_LAST_UPDATED,
  scrollToSectionId,
  sectionHref,
  titledTocItems,
} from './legalShared.js';
import {
  COOKIES_INTRO_PARAGRAPHS,
  COOKIES_INTRO_TITLE,
  COOKIES_SECTIONS,
} from './cookiesContent.js';

const tocItems = titledTocItems(COOKIES_SECTIONS);

export function CookiesPage() {
  return (
    <article class="max-w-3xl mx-auto px-6 py-12">
      <header class="mb-10">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {COOKIES_INTRO_TITLE}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Last updated {LEGAL_LAST_UPDATED}
        </p>
        <div class="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          {COOKIES_INTRO_PARAGRAPHS.map((paragraph, index) => (
            <p key={`intro-${index}`}>{paragraph}</p>
          ))}
        </div>
      </header>

      <nav aria-label="Table of contents" class="mb-10">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          TABLE OF CONTENTS
        </h2>
        <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          {tocItems.map((item) => (
            <li key={item.id}>
              <Link
                href={sectionHref(ROUTE_COOKIES, item.id)}
                activeClass=""
                class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                onClick={() => scrollToSectionId(item.id)}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {COOKIES_SECTIONS.map((section) => (
        <section id={section.id} key={section.id} class="scroll-mt-24 mb-10">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {section.title}
          </h2>
          <LegalBlockList sectionId={section.id} blocks={section.blocks} />
        </section>
      ))}
    </article>
  );
}
