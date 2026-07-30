import { Link } from 'react-router';
import { Navbar } from '../components/Navbar';
import { useAppState } from '../context/AppContext';
import { Download, FileText, LinkIcon, ArrowRight } from 'lucide-react';

type GrantedResource = {
  title: string;
  type: string;
};

const GRANTED_RESOURCES: GrantedResource[] = [
  { title: 'Hormone Harmony E-Book', type: 'E-Books' },
  { title: 'Nutrition Tips & Myths PDF', type: 'Nutrition Plans' },
  { title: '10-Day Core Challenge', type: 'Workouts' },
];

function downloadPlaceholderFile() {
  const blob = new Blob(
    ['Evoa Fitness — placeholder for the granted resource files.'],
    { type: 'text/plain' },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'evoa-fitness-resources.zip';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function DownloadPage() {
  const { appState } = useAppState();

  return (
    <main className="w-full min-h-screen pb-24 bg-surface-page">
      <Navbar theme="dark" />

      <div className="max-w-2xl mx-auto px-6 pt-32">
        {appState.isDownloadUnavailable ? (
          <div className="flex flex-col items-center gap-4 text-center py-16">
            <div className="w-20 h-20 bg-surface-subtle text-copy-muted rounded-full flex items-center justify-center mb-2">
              <LinkIcon size={36} aria-hidden="true" />
            </div>
            <h1 className="font-serif text-4xl text-foreground tracking-tight">
              This link is no longer available
            </h1>
            <p className="text-copy-muted max-w-md leading-relaxed">
              Download links stay active for seven days after each request. You
              can request your resources again from the store.
            </p>
            <Link
              to="/store"
              className="mt-6 px-8 py-4 bg-surface-inverted text-surface-inverted-foreground font-medium rounded-sm inline-flex items-center justify-center gap-2 hover:bg-brand transition-colors"
            >
              Back to the Store <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="py-8">
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4 tracking-tight">
              Your resources
            </h1>
            <p className="text-lg text-copy-muted mb-10">
              Everything you requested is ready. Your download stays available
              for seven days after each request.
            </p>

            <ul className="bg-card rounded-2xl border border-stroke-faint shadow-sm divide-y divide-stroke-faint mb-10">
              {GRANTED_RESOURCES.map((resource) => (
                <li key={resource.title} className="flex items-center gap-4 p-5">
                  <span className="w-11 h-11 shrink-0 bg-brand-soft text-brand rounded-lg flex items-center justify-center">
                    <FileText size={20} aria-hidden="true" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {resource.title}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-copy-muted">
                      {resource.type}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={downloadPlaceholderFile}
              className="w-full py-4 bg-brand text-brand-foreground text-lg font-medium rounded-sm flex items-center justify-center gap-2 hover:bg-brand-hover transition-colors shadow-md hover:shadow-lg"
            >
              <Download size={22} aria-hidden="true" /> Download your resources
            </button>

            <p className="text-sm text-copy-muted text-center mt-6">
              Need something else?{' '}
              <Link to="/store" className="text-brand hover:underline">
                Browse the store
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
