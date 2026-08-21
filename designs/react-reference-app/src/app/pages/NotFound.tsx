import { Link } from 'react-router';
import { ArrowRight, Compass } from 'lucide-react';
import { ERROR_PAGE_ACTION_CLASS, ErrorPage } from '../components/ErrorPage';

export function NotFound() {
  return (
    <ErrorPage
      icon={Compass}
      eyebrow="Error 404"
      title="Page not found"
      description="The page you asked for doesn't exist, or it has moved somewhere else."
    >
      <Link to="/" className={ERROR_PAGE_ACTION_CLASS}>
        Back to home <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </ErrorPage>
  );
}
