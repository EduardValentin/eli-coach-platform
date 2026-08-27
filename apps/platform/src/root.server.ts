import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import type { LoaderFunctionArgs } from "react-router";

export const middleware = [clerkMiddleware()];

export function loader(args: LoaderFunctionArgs) {
  return rootAuthLoader(args);
}
