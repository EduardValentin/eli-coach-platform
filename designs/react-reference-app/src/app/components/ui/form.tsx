"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { InlineProblem } from "./inline-problem";
import { cn } from "./utils";
import { Label, type LabelProps } from "./label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id, hasDescription } = itemContext;

  return {
    id,
    hasDescription,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
  hasDescription: boolean;
  setHasDescription: (present: boolean) => void;
};

const FormItemContext = React.createContext<FormItemContextValue>({
  id: "",
  hasDescription: false,
  setHasDescription: () => {},
});

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  const [hasDescription, setHasDescription] = React.useState(false);
  const itemContext = React.useMemo(
    () => ({ id, hasDescription, setHasDescription }),
    [id, hasDescription],
  );

  return (
    <FormItemContext.Provider value={itemContext}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }: LabelProps) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, hasDescription, formItemId, formDescriptionId, formMessageId } =
    useFormField();
  const describedBy = [
    hasDescription && formDescriptionId,
    error?.message && formMessageId,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={describedBy || undefined}
      aria-invalid={!!error}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();
  const { setHasDescription } = React.useContext(FormItemContext);

  React.useLayoutEffect(() => {
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function FormMessage({ className, ...props }: Omit<React.ComponentProps<"p">, "children">) {
  const { error, formMessageId } = useFormField();
  const message = error?.message ? String(error.message) : "";

  if (!message) {
    return null;
  }

  return (
    <InlineProblem data-slot="form-message" id={formMessageId} role="alert" className={className} {...props}>
      {message}
    </InlineProblem>
  );
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
