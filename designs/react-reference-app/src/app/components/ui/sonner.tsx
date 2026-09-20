import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--surface-base)",
          "--normal-text": "var(--text-primary)",
          "--normal-border": "var(--border)",
          "--success-text": "var(--success)",
          "--error-text": "var(--destructive)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
