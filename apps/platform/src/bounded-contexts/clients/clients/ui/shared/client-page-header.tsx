import {
  PortalBackLink,
  PortalPageHeader,
} from "~/shared/design-system/portal";
import type { ReactNode, Ref } from "react";

import { coachClientPath } from "~/bounded-contexts/clients/clients/public/paths";

type ClientLink = { clientId: string; name: string };

type BackLinkGap = "page" | "title";

export function ClientBackLink({
  client,
  gap,
}: {
  client: ClientLink;
  gap: BackLinkGap;
}) {
  return (
    <PortalBackLink gap={gap} to={coachClientPath(client.clientId)}>
      <span className="sr-only">Back to </span>
      {client.name}
    </PortalBackLink>
  );
}

type ClientPageHeaderProps = {
  client: ClientLink;
  title: ReactNode;
  actions?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
};

export function ClientPageHeader({
  client,
  title,
  actions,
  headingRef,
}: ClientPageHeaderProps) {
  return (
    <>
      <ClientBackLink client={client} gap="title" />
      <PortalPageHeader
        actions={actions}
        headingRef={headingRef}
        title={title}
      />
    </>
  );
}
