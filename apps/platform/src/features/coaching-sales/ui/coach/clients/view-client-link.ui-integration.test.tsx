// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useParams } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { COACH_ASSESSMENT_CALLS_PATH } from "~/features/assessment-calls/contracts/paths";
import {
  COACH_CLIENTS_PATH,
  coachClientPath,
} from "~/features/coaching-sales/contracts/paths";

import { ViewClientLink } from "./view-client-link";

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

afterEach(() => {
  cleanup();
});

function ClientPageStandIn() {
  const { clientId } = useParams();

  return <h1>{`Client ${clientId}`}</h1>;
}

describe("the View client link on a paid call", () => {
  it("opens the page of the client the call created", async () => {
    // arrange
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [
        {
          element: <ViewClientLink clientId={CLIENT_ID} />,
          path: COACH_ASSESSMENT_CALLS_PATH,
        },
        {
          element: <ClientPageStandIn />,
          path: `${COACH_CLIENTS_PATH}/:clientId`,
        },
      ],
      { initialEntries: [COACH_ASSESSMENT_CALLS_PATH] },
    );
    render(<RouterProvider router={router} />);
    const link = screen.getByRole("link", { name: "View client" });

    // act
    await user.click(link);

    // assert
    expect(link).toHaveAttribute("href", coachClientPath(CLIENT_ID));
    expect(
      await screen.findByRole("heading", { name: `Client ${CLIENT_ID}` }),
    ).toBeInTheDocument();
  });
});
