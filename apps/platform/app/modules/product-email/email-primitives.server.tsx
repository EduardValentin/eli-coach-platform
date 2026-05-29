import type { CSSProperties, ReactNode } from "react";

type StyleProps = {
  style?: CSSProperties;
};

export function EmailHtml({
  children,
  lang = "en",
}: {
  children: ReactNode;
  lang?: string;
}) {
  return (
    <html dir="ltr" lang={lang}>
      {children}
    </html>
  );
}

export function EmailHead({ children }: { children?: ReactNode }) {
  return (
    <head>
      <meta content="text/html; charset=UTF-8" httpEquiv="Content-Type" />
      <meta name="x-apple-disable-message-reformatting" />
      <meta content="width=device-width" name="viewport" />
      {children}
    </head>
  );
}

export function EmailBody({ children, style }: { children: ReactNode } & StyleProps) {
  return <body style={style}>{children}</body>;
}

const PREVIEW_BASE_STYLE: CSSProperties = {
  color: "transparent",
  display: "none",
  fontSize: "1px",
  lineHeight: "1px",
  maxHeight: 0,
  maxWidth: 0,
  opacity: 0,
  overflow: "hidden",
};

export function EmailPreviewText({ children }: { children: string }) {
  const padded = `${children}${" ‌ ‌".repeat(40)}`;
  return <div style={PREVIEW_BASE_STYLE}>{padded}</div>;
}

const TABLE_RESET_ATTRS = {
  border: 0,
  cellPadding: 0,
  cellSpacing: 0,
  role: "presentation" as const,
};

const TABLE_BASE_STYLE: CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
};

export function EmailContainer({
  children,
  maxWidth = 600,
  style,
}: {
  children: ReactNode;
  maxWidth?: number;
} & StyleProps) {
  const mergedStyle: CSSProperties = {
    ...TABLE_BASE_STYLE,
    maxWidth,
    ...style,
  };

  return (
    <table {...TABLE_RESET_ATTRS} align="center" style={mergedStyle}>
      <tbody>
        <tr>
          <td>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailSection({ children, style }: { children: ReactNode } & StyleProps) {
  return (
    <table {...TABLE_RESET_ATTRS} style={TABLE_BASE_STYLE}>
      <tbody>
        <tr>
          <td style={style}>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailHeading({
  children,
  level = "h1",
  style,
}: {
  children: ReactNode;
  level?: "h1" | "h2" | "h3" | "h4";
} & StyleProps) {
  const Tag = level;
  return <Tag style={style}>{children}</Tag>;
}

export function EmailText({ children, style }: { children: ReactNode } & StyleProps) {
  const mergedStyle: CSSProperties = { margin: "16px 0", ...style };
  return <p style={mergedStyle}>{children}</p>;
}

export function EmailLink({
  children,
  href,
  style,
}: {
  children: ReactNode;
  href: string;
} & StyleProps) {
  const mergedStyle: CSSProperties = { color: "#067df7", ...style };

  return (
    <a href={href} rel="noopener noreferrer" style={mergedStyle} target="_blank">
      {children}
    </a>
  );
}

export function EmailDivider({ style }: StyleProps) {
  const mergedStyle: CSSProperties = {
    border: "none",
    borderTop: "1px solid #eaeaea",
    width: "100%",
    ...style,
  };

  return <hr style={mergedStyle} />;
}
