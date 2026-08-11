import { Fragment } from 'react';
import { Link } from 'react-router';
import type {
  LegalDocument,
  LegalDocumentBlock,
  LegalText,
} from '@content/legal-document';

const INLINE_LINK_CLASS =
  'font-medium text-brand underline-offset-4 hover:text-brand-hover hover:underline';

const effectiveDateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <article className="mx-auto max-w-reading overflow-hidden rounded-panel border border-border-subtle bg-surface-base shadow-soft">
      <header className="border-b border-border-subtle px-6 py-10 sm:px-8 lg:px-12">
        <h1 className="font-serif text-display-lg text-text-primary">{document.title}</h1>
        <p className="mt-4 text-lg text-text-secondary">{document.description}</p>
        <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-border-subtle pt-4 text-sm text-text-secondary">
          <div>
            <dt className="sr-only">Version</dt>
            <dd>Version {document.version}</dd>
          </div>
          <div>
            <dt className="sr-only">Effective date</dt>
            <dd>
              <time dateTime={document.effectiveDate}>
                {formatEffectiveDate(document.effectiveDate)}
              </time>
            </dd>
          </div>
        </dl>
      </header>

      <div className="grid gap-10 px-6 py-10 sm:px-8 lg:px-12">
        {document.sections.map((section) => (
          <section className="grid gap-4" key={section.id}>
            <h2 className="font-serif text-display-sm text-text-primary">{section.heading}</h2>
            {section.blocks.map((block, blockIndex) => (
              <Fragment key={`${section.id}-${block.kind}-${blockIndex}`}>
                {renderLegalDocumentBlock(block)}
              </Fragment>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}

function renderLegalDocumentBlock(block: LegalDocumentBlock) {
  switch (block.kind) {
    case 'paragraph':
      return (
        <p className="text-base leading-relaxed text-text-secondary">
          <LegalTextContent content={block.content} />
        </p>
      );
    case 'list':
      return (
        <ul className="grid list-disc gap-2 pl-6 text-base leading-relaxed text-text-secondary">
          {block.items.map((item, itemIndex) => (
            <li key={`list-item-${itemIndex}`}>
              <LegalTextContent content={item} />
            </li>
          ))}
        </ul>
      );
    case 'definition-list':
      return (
        <dl className="grid gap-5">
          {block.items.map((item) => (
            <div className="grid gap-1" key={item.term}>
              <dt className="text-base font-semibold text-text-primary">{item.term}</dt>
              <dd className="text-base leading-relaxed text-text-secondary">
                <LegalTextContent content={item.description} />
              </dd>
            </div>
          ))}
        </dl>
      );
  }
}

function LegalTextContent({ content }: { content: LegalText }) {
  return content.map((fragment, fragmentIndex) => {
    const key =
      typeof fragment === 'string'
        ? `text-${fragmentIndex}`
        : `${fragment.scope}-${fragment.href}-${fragmentIndex}`;

    if (typeof fragment === 'string') {
      return <Fragment key={key}>{fragment}</Fragment>;
    }

    if (fragment.scope === 'internal') {
      return (
        <Link key={key} to={fragment.href} className={INLINE_LINK_CLASS}>
          {fragment.label}
        </Link>
      );
    }

    const opensNewTab = !fragment.href.startsWith('mailto:');

    return (
      <a
        className={INLINE_LINK_CLASS}
        href={fragment.href}
        key={key}
        rel={opensNewTab ? 'noopener noreferrer' : undefined}
        target={opensNewTab ? '_blank' : undefined}
      >
        {fragment.label}
      </a>
    );
  });
}

function formatEffectiveDate(effectiveDate: string) {
  return effectiveDateFormatter.format(new Date(`${effectiveDate}T00:00:00Z`));
}
