import { SignOutButton } from "@clerk/react-router";
import type { ReactNode } from "react";

type SignOutControlProps = {
  children: ReactNode;
  redirectUrl: string;
};

export function SignOutControl(props: SignOutControlProps) {
  return (
    <SignOutButton redirectUrl={props.redirectUrl}>
      {props.children}
    </SignOutButton>
  );
}
