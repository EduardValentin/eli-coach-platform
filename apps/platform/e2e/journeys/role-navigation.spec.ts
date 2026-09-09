import { expect, test } from "../support/fixtures";

const PORTAL_PATH_BY_ROLE = { CLIENT: "/client", COACH: "/coach" } as const;
const PORTAL_HEADING_BY_ROLE = {
  CLIENT: "Client portal",
  COACH: "Coach portal",
} as const;

for (const role of ["CLIENT", "COACH"] as const) {
  test(`a ${role} account sees its portal pill and can open its portal`, async ({
    page,
    publicNav,
    provisionAccount,
    signIn,
  }) => {
    // arrange
    await provisionAccount(role);
    await page.goto("/store");

    // act
    await signIn();

    // assert
    await publicNav.expectPortalPillVisible(role);
    await publicNav.openPortal(role);
    await expect(page).toHaveURL(new RegExp(`${PORTAL_PATH_BY_ROLE[role]}$`));
    await expect(
      page.getByRole("heading", { name: PORTAL_HEADING_BY_ROLE[role] }),
    ).toBeVisible();
  });
}
