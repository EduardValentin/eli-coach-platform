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

import type { InvitationResolution } from "~/features/coaching-sales/public/invitation";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/public/paths";

vi.mock("@clerk/react-router", () => ({
  SignOutButton: vi.fn(({ children }: PropsWithChildren) => children),
}));

import InvitationRoute, { type InvitationLoaderData } from "./invitation";

const TOKEN = "tok_live_invitation_token";
const INVITATION_STORAGE_KEY = "coaching-sales:invitation";
const INVITATION_API_URL = COACHING_SALES_API_PATHS.invitation;
const INVITATION_RETURN_PATH = "/app/invitation";
const SIGN_UP_URL =
  "https://accounts.evoa.example/sign-up?__clerk_ticket=ticket";

const validInvitation: InvitationResolution = {
  state: "valid",
  signUpUrl: SIGN_UP_URL,
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
let handOffToHostedSignUp: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  resolutionRequests = [];
  handOffToHostedSignUp = vi
    .spyOn(window.location, "replace")
    .mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
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
    await waitFor(() => {
      expect(handOffToHostedSignUp).toHaveBeenCalled();
    });
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
    expect(handOffToHostedSignUp).not.toHaveBeenCalled();
    held.answer();
    await waitFor(() => {
      expect(handOffToHostedSignUp).toHaveBeenCalledWith(SIGN_UP_URL);
    });
  });

  it("hands a live invitation straight to the hosted sign-up the server resolved for it, still checking", async () => {
    // arrange
    answerInvitation(validInvitation);

    // act
    renderInvitationWith(`#${TOKEN}`, anonymous);

    // assert
    await waitFor(() => {
      expect(handOffToHostedSignUp).toHaveBeenCalledWith(SIGN_UP_URL);
    });
    expect(handOffToHostedSignUp).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking your invitation…",
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("recalls the invitation kept for this tab when she comes back without the fragment", async () => {
    // arrange
    window.sessionStorage.setItem(INVITATION_STORAGE_KEY, TOKEN);
    answerInvitation(validInvitation);

    // act
    renderInvitationWith("", anonymous);

    // assert
    await waitFor(() => {
      expect(handOffToHostedSignUp).toHaveBeenCalledWith(SIGN_UP_URL);
    });
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
    const backLink = screen.getByRole("link", { name: "Back to home" });
    expect(backLink).toHaveAttribute("href", "/");
    expect(backLink.firstElementChild).toHaveClass("lucide-arrow-left");
    expect(handOffToHostedSignUp).not.toHaveBeenCalled();
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
    expect(handOffToHostedSignUp).not.toHaveBeenCalled();
  });
});
