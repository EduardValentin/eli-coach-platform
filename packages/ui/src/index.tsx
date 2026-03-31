import type { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router";

type NavigationLink = {
  href: string;
  label: string;
};

type AppShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  links: readonly NavigationLink[];
  footer?: ReactNode;
}>;

export function AppShell(props: AppShellProps) {
  const { eyebrow, title, description, links, footer, children } = props;

  return (
    <div style={shellStyle}>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>{eyebrow}</p>
        <h1 style={titleStyle}>{title}</h1>
        <p style={descriptionStyle}>{description}</p>
        <nav style={navStyle}>
          {links.map((link) => (
            <Link key={link.href} to={link.href} style={linkStyle}>
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main style={mainStyle}>{children}</main>
      {footer ? <footer style={footerStyle}>{footer}</footer> : null}
    </div>
  );
}

type PanelProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function Panel(props: PanelProps) {
  const { title, description, children } = props;

  return (
    <section style={panelStyle}>
      <h2 style={panelTitleStyle}>{title}</h2>
      <p style={panelDescriptionStyle}>{description}</p>
      <div style={panelContentStyle}>{children}</div>
    </section>
  );
}

export function Badge(props: PropsWithChildren) {
  return <span style={badgeStyle}>{props.children}</span>;
}

const shellStyle = {
  margin: "0 auto",
  maxWidth: "1120px",
  padding: "48px 20px 72px",
};

const headerStyle = {
  display: "grid",
  gap: "16px",
  marginBottom: "32px",
};

const eyebrowStyle = {
  color: "var(--color-accent-deep)",
  fontSize: "0.875rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  margin: 0,
  textTransform: "uppercase" as const,
};

const titleStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
  lineHeight: 1,
  margin: 0,
};

const descriptionStyle = {
  fontSize: "1.05rem",
  lineHeight: 1.7,
  margin: 0,
  maxWidth: "720px",
};

const navStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "12px",
};

const linkStyle = {
  color: "inherit",
  border: "1px solid var(--color-line)",
  borderRadius: "999px",
  padding: "10px 16px",
  backgroundColor: "rgba(255, 255, 255, 0.72)",
};

const mainStyle = {
  display: "grid",
  gap: "24px",
};

const footerStyle = {
  color: "rgba(23, 33, 47, 0.74)",
  fontSize: "0.95rem",
  marginTop: "32px",
};

const panelStyle = {
  backgroundColor: "var(--color-paper-strong)",
  border: "1px solid var(--color-line)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-soft)",
  padding: "28px",
};

const panelTitleStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "1.6rem",
  margin: "0 0 8px",
};

const panelDescriptionStyle = {
  lineHeight: 1.7,
  margin: "0 0 16px",
};

const panelContentStyle = {
  display: "grid",
  gap: "12px",
};

const badgeStyle = {
  alignItems: "center",
  backgroundColor: "rgba(198, 111, 78, 0.12)",
  borderRadius: "999px",
  color: "var(--color-accent-deep)",
  display: "inline-flex",
  fontSize: "0.875rem",
  fontWeight: 700,
  padding: "6px 12px",
};
