import { Compass } from 'lucide-react';
import { ErrorPage, ErrorPageLink } from '../components/ErrorPage';

export function NotFound() {
  return (
    <ErrorPage
      icon={Compass}
      eyebrow="Error 404"
      title="Page not found"
      description="The page you asked for doesn't exist, or it has moved somewhere else."
    >
      <ErrorPageLink direction="back" to="/">
        Back to home
      </ErrorPageLink>
    </ErrorPage>
  );
}
