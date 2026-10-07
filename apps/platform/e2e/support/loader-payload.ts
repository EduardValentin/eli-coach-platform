import { expect, type Page } from "@playwright/test";

export async function readLoaderPayloadOf(
  page: Page,
  path: string,
): Promise<string> {
  const html = await page.request.get(path);
  const data = await page.request.get(`${path}.data`);

  expect(html.status()).toBe(200);
  expect(data.status()).toBe(200);

  return `${await html.text()}\n${await data.text()}`;
}
