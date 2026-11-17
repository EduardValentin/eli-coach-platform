import type { ReactNode, Ref } from 'react';
import { PortalBackLink } from '../PortalBackLink';
import { PortalPageHeader } from '../PortalPageHeader';

type ClientLink = { name: string; path: string };

export function ClientBackLink({ client, gap }: { client: ClientLink; gap: 'page' | 'title' }) {
  return (
    <PortalBackLink to={client.path} gap={gap}>
      <span className="sr-only">Back to </span>
      {client.name}
    </PortalBackLink>
  );
}

type ClientPageHeaderProps = {
  client: ClientLink;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
};

export function ClientPageHeader({ client, title, subtitle, actions, headingRef }: ClientPageHeaderProps) {
  return (
    <>
      <ClientBackLink client={client} gap="title" />
      <PortalPageHeader title={title} subtitle={subtitle} actions={actions} headingRef={headingRef} />
    </>
  );
}
