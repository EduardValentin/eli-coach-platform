import { matchPath } from "react-router";
import { describe, expect, it } from "vitest";

import {
  CLIENT_RESOURCES_API_PATHS,
  clientResourcesPath,
  COACH_CLIENT_RESOURCES_ROUTE_SEGMENT,
  coachClientResourcesPath,
  resourceDownloadPath,
  resourcePagePath,
  resourceThumbnailPath,
} from "./paths";

const CLIENT_ID = "8f9a2c41-3b7e-4d55-9c1a-6e2f0b7d4c02";
const RESOURCE_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("client resources paths", () => {
  it("links the coach to the page the coach portal registers for a client's resources", () => {
    // arrange
    const link = coachClientResourcesPath(CLIENT_ID);

    // act
    const match = matchPath(
      `/coach/${COACH_CLIENT_RESOURCES_ROUTE_SEGMENT}`,
      link,
    );

    // assert
    expect(link).toBe(`/coach/clients/${CLIENT_ID}/resources`);
    expect(match?.params).toEqual({ clientId: CLIENT_ID });
  });

  it("builds each API link so the route registered for it reads the same ids back", () => {
    // arrange
    const links = [
      {
        pattern: CLIENT_RESOURCES_API_PATHS.clientResources,
        link: clientResourcesPath(CLIENT_ID),
        params: { clientId: CLIENT_ID },
      },
      {
        pattern: CLIENT_RESOURCES_API_PATHS.resourcePage,
        link: resourcePagePath(RESOURCE_ID, 3),
        params: { resourceId: RESOURCE_ID, pageNumber: "3" },
      },
      {
        pattern: CLIENT_RESOURCES_API_PATHS.resourceThumbnail,
        link: resourceThumbnailPath(RESOURCE_ID),
        params: { resourceId: RESOURCE_ID },
      },
      {
        pattern: CLIENT_RESOURCES_API_PATHS.resourceDownload,
        link: resourceDownloadPath(RESOURCE_ID),
        params: { resourceId: RESOURCE_ID },
      },
    ];

    // act
    const matches = links.map(
      ({ pattern, link }) => matchPath(pattern, link)?.params,
    );

    // assert
    expect(matches).toEqual(links.map(({ params }) => params));
  });

  it("keeps an id that is not a plain segment inside its own segment", () => {
    // arrange
    const strangeId = "../a b";

    // act
    const link = resourceDownloadPath(strangeId);

    // assert
    expect(link).toBe("/api/client-resources/..%2Fa%20b/download");
  });
});
