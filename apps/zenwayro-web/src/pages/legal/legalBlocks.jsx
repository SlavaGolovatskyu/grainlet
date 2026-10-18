import { Link } from 'grainlet/route';
import { splitTextByLinks } from './legalShared.js';

function read(value) {
  return typeof value === 'function' ? value() : value;
}

export function LegalBlockList(props) {
  const sectionId = read(props.sectionId);
  const blocks = read(props.blocks);

  return (
    <div class="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
      {blocks.map((block, index) =>
        block.type === 'subheading' ? (
          <h3
            key={`${sectionId}-sub-${index}`}
            class="text-base font-semibold text-gray-800 dark:text-gray-200 pt-2"
          >
            {block.text}
          </h3>
        ) : block.type === 'list' ? (
          <ul key={`${sectionId}-list-${index}`} class="list-disc pl-6 space-y-2">
            {block.items.map((item, itemIndex) => (
              <li key={`${sectionId}-item-${itemIndex}`}>{item}</li>
            ))}
          </ul>
        ) : block.type === 'table' ? (
          <div
            key={`${sectionId}-table-${index}`}
            class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <table class="min-w-full text-sm text-left">
              <thead class="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {block.headers.map((header) => (
                    <th
                      key={header}
                      scope="col"
                      class="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr
                    key={`${sectionId}-row-${rowIndex}`}
                    class="border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${sectionId}-cell-${rowIndex}-${cellIndex}`}
                        class="px-4 py-3 align-top whitespace-pre-line"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p key={`${sectionId}-p-${index}`} class="whitespace-pre-line">
            {splitTextByLinks(block.text).map((part, partIndex) =>
              part.type === 'link' ? (
                <Link
                  key={`${sectionId}-link-${index}-${partIndex}`}
                  href={part.href}
                  activeClass=""
                  class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {part.text}
                </Link>
              ) : (
                part.text
              )
            )}
          </p>
        )
      )}
    </div>
  );
}
