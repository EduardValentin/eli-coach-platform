import type { CSSProperties, ReactNode } from 'react';

type StyleProps = { style?: CSSProperties };

export function EmailHtml({
  lang = 'en',
  children,
}: {
  lang?: string;
  children: ReactNode;
}) {
  return (
    <html lang={lang} dir="ltr">
      {children}
    </html>
  );
}

export function EmailHead({ children }: { children?: ReactNode }) {
  return (
    <head>
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="x-apple-disable-message-reformatting" />
      <meta name="viewport" content="width=device-width" />
      {children}
    </head>
  );
}

export function EmailBody({
  children,
  style,
}: { children: ReactNode } & StyleProps) {
  return <body style={style}>{children}</body>;
}

const PREVIEW_BASE_STYLE: CSSProperties = {
  display: 'none',
  overflow: 'hidden',
  lineHeight: '1px',
  opacity: 0,
  maxHeight: 0,
  maxWidth: 0,
  fontSize: '1px',
  color: 'transparent',
};

export function EmailPreviewText({ children }: { children: string }) {
  const padded = `${children}${' ‌ ‌'.repeat(40)}`;
  return <div style={PREVIEW_BASE_STYLE}>{padded}</div>;
}

const TABLE_RESET_ATTRS = {
  cellPadding: 0,
  cellSpacing: 0,
  border: 0,
  role: 'presentation' as const,
};

const TABLE_BASE_STYLE: CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
};

export function EmailContainer({
  children,
  style,
  maxWidth = 600,
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
    <table
      {...TABLE_RESET_ATTRS}
      align="center"
      style={mergedStyle}
    >
      <tbody>
        <tr>
          <td>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailSection({
  children,
  style,
}: { children: ReactNode } & StyleProps) {
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
  style,
  level = 'h1',
}: {
  children: ReactNode;
  level?: 'h1' | 'h2' | 'h3' | 'h4';
} & StyleProps) {
  const Tag = level;
  return <Tag style={style}>{children}</Tag>;
}

export function EmailText({
  children,
  style,
}: { children: ReactNode } & StyleProps) {
  const mergedStyle: CSSProperties = { margin: '16px 0', ...style };
  return <p style={mergedStyle}>{children}</p>;
}

export function EmailLink({
  href,
  children,
  style,
}: {
  href: string;
  children: ReactNode;
} & StyleProps) {
  const mergedStyle: CSSProperties = { color: '#067df7', ...style };
  return (
    <a href={href} style={mergedStyle} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function EmailDivider({ style }: StyleProps) {
  const mergedStyle: CSSProperties = {
    border: 'none',
    borderTop: '1px solid #eaeaea',
    width: '100%',
    ...style,
  };
  return <hr style={mergedStyle} />;
}
