type FieldErrorProps = {
  id: string;
  message: string | undefined;
};

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm font-medium text-feedback-danger" id={id}>
      {message}
    </p>
  );
}
