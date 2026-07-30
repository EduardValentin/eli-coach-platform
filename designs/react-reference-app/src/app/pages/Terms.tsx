import { WEBSITE_AND_STORE_TERMS_DOCUMENT } from '@content/website-and-store-terms/current';
import { Navbar } from '../components/Navbar';
import { LegalDocumentView } from '../components/legal/LegalDocumentView';
import { LegalFooter } from '../components/legal/LegalNav';

export function Terms() {
  return (
    <div className="w-full min-h-screen bg-surface-page">
      <Navbar theme="dark" />
      <main className="mx-auto w-full max-w-[90rem] px-6 pb-12 pt-28 lg:px-12">
        <LegalDocumentView document={WEBSITE_AND_STORE_TERMS_DOCUMENT} />
      </main>
      <LegalFooter />
    </div>
  );
}
