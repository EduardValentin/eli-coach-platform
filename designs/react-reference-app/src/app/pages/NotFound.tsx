import { Compass } from 'lucide-react';
import { ErrorPage, DeadEndLink } from '../components/ErrorPage';

export function NotFound() {
  return (
    <ErrorPage
      icon={Compass}
      eyebrow="Error 404"
      title="Page not found"
      description="The page you asked for doesn't exist, or it has moved somewhere else."
    >
      <DeadEndLink direction="back" to="/">
        Back to home
      </DeadEndLink>
    </ErrorPage>
  );
}
