import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { describe, expect, it } from "vitest";

import type { ExerciseWire } from "~/features/exercises/contracts/exercises";

import ExerciseLibraryRoute from "./exercise-library-page";

const squat: ExerciseWire = {
  id: "a",
  name: "Barbell Back Squat",
  description: "",
  difficulty: "Intermediate",
  equipment: ["Barbell"],
  primaryMuscles: ["Quadriceps"],
  secondaryMuscles: [],
  tags: ["Strength"],
  video: { url: "/api/exercises/videos/exercise-videos%2Fabc.mp4", sizeBytes: 3 },
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

describe("exercise library server rendering", () => {
  it("includes the library rows in the initial HTML", async () => {
    // arrange
    const handler = createStaticHandler([
      {
        Component: ExerciseLibraryRoute,
        loader: () => ({ exercises: [squat] }),
        path: "/coach/training/exercises",
      },
    ]);
    const context = await handler.query(
      new Request("https://eli.example/coach/training/exercises"),
    );

    if (context instanceof Response) {
      throw new Error(`Expected route context, received ${context.status}.`);
    }

    const router = createStaticRouter(handler.dataRoutes, context);

    // act
    const html = renderToString(
      <StaticRouterProvider context={context} router={router} />,
    );

    // assert
    expect(html).toContain("Barbell Back Squat");
    expect(html).toContain("Attached");
    expect(html).toContain('href="/coach/training/exercises/a/edit"');
  });
});
