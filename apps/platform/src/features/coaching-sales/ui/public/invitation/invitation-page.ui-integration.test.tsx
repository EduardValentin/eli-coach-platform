// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { SignOutButton } from "@clerk/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { PropsWithChildren } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { InvitationResolution } from "~/features/coaching-sales/contracts/client-journey";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";

vi.mock("@clerk/react-router", () => ({
  SignOutButton: vi.fn(({ children }: PropsWithChildren) => children),
}));

import InvitationRoute, { type InvitationLoaderData } from "./invitation-page";

const TOKEN = "tok_live_invitation_token";
const INVITATION_STORAGE_KEY = "coaching-sales:invitation";
const INVITATION_API_URL = COACHING_SALES_API_PATHS.invitation;
const INVITATION_RETURN_PATH = "/app/invitation";
const CONTINUE_URL =
  "https://accounts.evoa.example/sign-up?__clerk_ticket=ticket";

const validInvitation: InvitationResolution = {
  state: "valid",
  email: "ana@example.com",
  continueUrl: CONTINUE_URL,
};

const anonymous: InvitationLoaderData = {
  invitationPath: INVITATION_RETURN_PATH,
  signedIn: false,
};

const signedIn: InvitationLoaderData = {
  invitationPath: INVITATION_RETURN_PATH,
  signedIn: true,
};

const server = setupServer();

let resolutionRequests: unknown[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  resolutionRequests = [];
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.clearAllMocks();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterAll(() => {
  server.close();
});

function answerInvitation(resolution: InvitationResolution) {
  server.use(
    http.post(INVITATION_API_URL, async ({ request }) => {
      resolutionRequests.push(await request.json());

      return HttpResponse.json(resolution);
    }),
  );
}

function holdInvitationAnswer(): { answer: () => void } {
  const held = { answer: () => {} };
  server.use(
    http.post(INVITATION_API_URL, async ({ request }) => {
      resolutionRequests.push(await request.json());
      await new Promise<void>((resolve) => {
        held.answer = resolve;
      });

      return HttpResponse.json(validInvitation);
    }),
  );

  return held;
}

function renderInvitationWith(
  fragment: string,
  loaderData: InvitationLoaderData,
) {
  window.history.replaceState(null, "", `/invitation${fragment}`);
  const router = createMemoryRouter(
    [
      {
        Component: InvitationRoute,
        loader: () => loaderData,
        path: "/invitation",
      },
      {
        action: ({ request }: { request: Request }) => fetch(request),
        path: INVITATION_API_URL,
      },
    ],
    { initialEntries: [`/invitation${fragment}`] },
  );
  render(<RouterProvider router={router} />);

  return router;
}

describe("InvitationRoute", () => {
  it("reads the invitation from the fragment, takes it out of the address and keeps it for this tab", async () => {
    // arrange
    answerInvitation(validInvitation);

    // act
    renderInvitationWith(`#${TOKEN}`, anonymous);

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Create your account",
      }),
    ).toBeInTheDocument();
    expect(resolutionRequests).toEqual([{ token: TOKEN }]);
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/invitation");
    expect(window.sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBe(TOKEN);
  });

  it("tells her the invitation is being checked until the answer arrives", async () => {
    // arrange
    const held = holdInvitationAnswer();

    // act
    renderInvitationWith(`#${TOKEN}`, anonymous);

    // assert
    const checking = await screen.findByRole("status");
    expect(checking).toHaveTextContent("Checking your invitation…");
    expect(checking).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByRole("main", { name: "Invitation" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(resolutionRequests).toEqual([{ token: TOKEN }]);
    });
    held.answer();
    expect(
      await screen.findByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
  });

  it("shows her email fixed and hands her to the hosted sign-up for a live invitation", async () => {
    // arrange
    answerInvitation(validInvitation);

    // act
    renderInvitationWith(`#${TOKEN}`, anonymous);

    // assert
    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Create your account",
    });
    expect(screen.getByRole("main", { name: "Invitation" })).toContainElement(
      heading,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Your invitation")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your email is already confirmed by this invitation — there's no code to type. You'll create your account on Evoa's secure sign-up page and land straight in your account.",
      ),
    ).toBeInTheDocument();
    const email = screen.getByRole("textbox", { name: "Email" });
    expect(email).toHaveValue("ana@example.com");
    expect(email).toHaveAttribute("readonly");
    expect(
      screen.getByText("Your account uses this email"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue to create my account" }),
    ).toHaveAttribute("href", CONTINUE_URL);
  });

  it("recalls the invitation kept for this tab when she comes back without the fragment", async () => {
    // arrange
    window.sessionStorage.setItem(INVITATION_STORAGE_KEY, TOKEN);
    answerInvitation(validInvitation);

    // act
    renderInvitationWith("", anonymous);

    // assert
    expect(
      await screen.findByRole("link", {
        name: "Continue to create my account",
      }),
    ).toBeInTheDocument();
    expect(resolutionRequests).toEqual([{ token: TOKEN }]);
  });

  it("tells her an invitation that cannot be used isn't available and offers the way home", async () => {
    // arrange
    answerInvitation({ state: "unavailable" });

    // act
    renderInvitationWith(`#${TOKEN}`, anonymous);

    // assert
    const main = await screen.findByRole("main", { name: "Error" });
    expect(main).toContainElement(
      screen.getByRole("heading", {
        level: 1,
        name: "This invitation isn't available",
      }),
    );
    expect(screen.getByText("Invitation")).toBeInTheDocument();
    expect(
      screen.getByText(
        "It may have expired or already been used. Ask your coach for a new one.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.queryByRole("link", { name: "Continue to create my account" }),
    ).not.toBeInTheDocument();
  });

  it("shows the unavailable page without asking the server when she arrives with no invitation at all", async () => {
    // arrange
    answerInvitation(validInvitation);

    // act
    renderInvitationWith("", anonymous);

    // assert
    expect(
      await screen.findByRole("heading", {
        name: "This invitation isn't available",
      }),
    ).toBeInTheDocument();
    expect(resolutionRequests).toEqual([]);
  });

  it("shows the unavailable page without asking the server for a fragment too long to be an invitation", async () => {
    // arrange
    answerInvitation(validInvitation);

    // act
    renderInvitationWith(`#${"a".repeat(300)}`, anonymous);

    // assert
    expect(
      await screen.findByRole("heading", {
        name: "This invitation isn't available",
      }),
    ).toBeInTheDocument();
    expect(resolutionRequests).toEqual([]);
  });

  it("asks a signed-in visitor to sign out first, keeps the invitation for her return and never resolves it", async () => {
    // arrange
    answerInvitation(validInvitation);

    // act
    renderInvitationWith(`#${TOKEN}`, signedIn);

    // assert
    const main = await screen.findByRole("main", { name: "Error" });
    expect(main).toContainElement(
      screen.getByRole("heading", {
        level: 1,
        name: "You're already signed in",
      }),
    );
    expect(
      screen.getByText(
        "This invitation creates a new account. Sign out first, then open the link again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(vi.mocked(SignOutButton)).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUrl: INVITATION_RETURN_PATH }),
      undefined,
    );
    await waitFor(() => {
      expect(window.sessionStorage.getItem(INVITATION_STORAGE_KEY)).toBe(TOKEN);
    });
    expect(window.location.hash).toBe("");
    expect(resolutionRequests).toEqual([]);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Continue to create my account" }),
    ).not.toBeInTheDocument();
  });
});
