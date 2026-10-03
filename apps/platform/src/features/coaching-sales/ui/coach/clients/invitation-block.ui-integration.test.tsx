// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { Toaster } from "@eli-coach-platform/ui/toast";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
} from "react-router";
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

import type { ClientInvitationReading } from "~/features/coaching-sales/contracts/coach-clients";
import {
  COACHING_SALES_API_PATHS,
  coachClientPath,
} from "~/features/coaching-sales/contracts/paths";

import { InvitationBlock } from "./invitation-block";

const RESENDS_URL = COACHING_SALES_API_PATHS.invitationResends;
const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";
const EMAIL = "ana@example.com";

const PENDING: ClientInvitationReading = {
  expiresAt: "2026-10-31T22:30:00.000Z",
  sentAt: "2026-10-01T09:00:00.000Z",
  state: "pending",
};

const REISSUED: ClientInvitationReading = {
  expiresAt: "2026-12-04T09:00:00.000Z",
  sentAt: "2026-11-04T09:00:00.000Z",
  state: "pending",
};

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  coachIsIn("Europe/Bucharest");
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("the invitation block", () => {
  it("heads the block and tells when she was invited and when the link expires", async () => {
    // arrange, act
    await renderBlock({ invitation: PENDING });

    // assert
    expect(
      screen.getByRole("region", { name: "Invitation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Invited 1 October · expires 1 November"),
    ).toBeInTheDocument();
  });

  it("tells the day the invitation expired", async () => {
    // arrange, act
    await renderBlock({ invitation: { ...PENDING, state: "expired" } });

    // assert
    expect(
      screen.getByText("Invitation expired 1 November"),
    ).toBeInTheDocument();
  });

  it("says the invitation email could not be sent", async () => {
    // arrange, act
    await renderBlock({ invitation: { ...PENDING, state: "email-failed" } });

    // assert
    expect(
      screen.getByText("Invitation email could not be sent"),
    ).toBeInTheDocument();
  });

  it("keeps the invitation's state but offers no re-send once her coaching is cancelled or ended", async () => {
    // arrange, act
    await renderBlock({ invitation: PENDING, coachingClosed: true });

    // assert
    expect(
      screen.getByText("Invited 1 October · expires 1 November"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Re-send invitation" }),
    ).not.toBeInTheDocument();
  });

  it("asks before re-sending and warns that her earlier link stops working", async () => {
    // arrange
    const user = await renderBlock({ invitation: PENDING });

    // act
    await user.click(
      screen.getByRole("button", { name: "Re-send invitation" }),
    );

    // assert
    expect(
      screen.getByRole("dialog", {
        description:
          "A fresh invitation goes to ana@example.com. Her earlier link stops working.",
        name: "Re-send invitation?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-send" })).toBeInTheDocument();
  });

  it("warns that his earlier link stops working", async () => {
    // arrange
    const user = await renderBlock({ gender: "male", invitation: PENDING });

    // act
    await user.click(
      screen.getByRole("button", { name: "Re-send invitation" }),
    );

    // assert
    expect(
      screen.getByRole("dialog", {
        description:
          "A fresh invitation goes to ana@example.com. His earlier link stops working.",
        name: "Re-send invitation?",
      }),
    ).toBeInTheDocument();
  });

  it("warns that their earlier link stops working", async () => {
    // arrange
    const user = await renderBlock({
      gender: "prefer_not_to_say",
      invitation: PENDING,
    });

    // act
    await user.click(
      screen.getByRole("button", { name: "Re-send invitation" }),
    );

    // assert
    expect(
      screen.getByRole("dialog", {
        description:
          "A fresh invitation goes to ana@example.com. Their earlier link stops working.",
        name: "Re-send invitation?",
      }),
    ).toBeInTheDocument();
  });

  it("sends nothing when the coach cancels", async () => {
    // arrange
    const requests = recordResendRequests(sentTo(EMAIL));
    const user = await renderBlock({ invitation: PENDING });
    await user.click(
      screen.getByRole("button", { name: "Re-send invitation" }),
    );

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests).toEqual([]);
  });

  it("re-sends her invitation, confirms where it went and shows the fresh dates", async () => {
    // arrange
    const requests = recordResendRequests(sentTo(EMAIL));
    const loaded: { invitation: ClientInvitationReading } = {
      invitation: { ...PENDING, state: "expired" },
    };
    const user = await renderBlock(loaded);
    await user.click(
      screen.getByRole("button", { name: "Re-send invitation" }),
    );
    loaded.invitation = { ...REISSUED, state: "pending" };

    // act
    await user.click(screen.getByRole("button", { name: "Re-send" }));

    // assert
    expect(
      await screen.findByText("Invitation sent to ana@example.com."),
    ).toBeInTheDocument();
    expect(requests).toEqual([{ clientId: CLIENT_ID }]);
    expect(
      await screen.findByText("Invited 4 November · expires 4 December"),
    ).toBeInTheDocument();
  });

  it.each([
    [503, "send-failed"],
    [409, "already-admitted"],
    [404, "not-found"],
  ])(
    "asks her to try again when the re-send fails (%i %s)",
    async (status, error) => {
      // arrange
      recordResendRequests(HttpResponse.json({ error }, { status }));
      const loaded: { invitation: ClientInvitationReading } = {
        invitation: PENDING,
      };
      const user = await renderBlock(loaded);
      await user.click(
        screen.getByRole("button", { name: "Re-send invitation" }),
      );
      loaded.invitation = { ...PENDING, state: "email-failed" };

      // act
      await user.click(screen.getByRole("button", { name: "Re-send" }));

      // assert
      expect(
        await screen.findByText(
          "The invitation email could not be sent. Try again.",
        ),
      ).toBeInTheDocument();
      expect(
        await screen.findByText("Invitation email could not be sent"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Re-send invitation" }),
      ).toBeEnabled();
    },
  );

  it("holds the button busy while the invitation is on its way", async () => {
    // arrange
    let release: () => void = () => {};
    server.use(
      http.post(RESENDS_URL, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });

        return sentTo(EMAIL);
      }),
    );
    const user = await renderBlock({ invitation: PENDING });
    await user.click(
      screen.getByRole("button", { name: "Re-send invitation" }),
    );

    // act
    await user.click(screen.getByRole("button", { name: "Re-send" }));

    // assert
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Re-send invitation" }),
      ).toHaveAttribute("aria-busy", "true");
    });
    expect(
      screen.getByRole("button", { name: "Re-send invitation" }),
    ).toBeDisabled();
    release();
    expect(
      await screen.findByText("Invitation sent to ana@example.com."),
    ).toBeInTheDocument();
  });
});

function coachIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

function sentTo(email: string) {
  return HttpResponse.json({ email, status: "sent" });
}

function recordResendRequests(response: Response): unknown[] {
  const requests: unknown[] = [];

  server.use(
    http.post(RESENDS_URL, async ({ request }) => {
      requests.push(await request.json());

      return response.clone();
    }),
  );

  return requests;
}

async function renderBlock(loaded: {
  gender?: VisitorGender;
  coachingClosed?: boolean;
  invitation: ClientInvitationReading;
}) {
  const user = userEvent.setup();
  const ClientRoute = () => {
    const { invitation } = useLoaderData<{
      invitation: ClientInvitationReading;
    }>();

    return (
      <>
        <InvitationBlock
          client={{
            clientId: CLIENT_ID,
            coachingClosed: loaded.coachingClosed ?? false,
            email: EMAIL,
            gender: loaded.gender ?? "female",
          }}
          invitation={invitation}
        />
        <Toaster />
      </>
    );
  };
  const router = createMemoryRouter(
    [
      {
        Component: ClientRoute,
        loader: () => ({ invitation: loaded.invitation }),
        path: coachClientPath(CLIENT_ID),
      },
      {
        action: ({ request }: { request: Request }) => fetch(request),
        path: RESENDS_URL,
      },
    ],
    { initialEntries: [coachClientPath(CLIENT_ID)] },
  );

  render(<RouterProvider router={router} />);
  await screen.findByRole("region", { name: "Invitation" });

  return user;
}
