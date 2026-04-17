import { Link } from "./link";

export const MAIN_CONTENT_ID = "main-content";

export type NavigationLink = {
  href: string;
  label: string;
};

type SurfaceNavigationProps = {
  className: string;
  links: readonly NavigationLink[];
  navigationLabel: string;
};

export function SurfaceNavigation(props: SurfaceNavigationProps) {
  const { className, links, navigationLabel } = props;

  return (
    <nav aria-label={navigationLabel} className={className}>
      {links.map((link) => (
        <Link key={link.href} to={link.href} variant="pill">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
