// React Router's single-fetch encoding of undefined and null.
const UNDEFINED = -7;
const NULL = -5;

/**
 * Each matched route's loader data from a `<page>.data` answer, the request
 * the browser sends on a client-side visit. It decodes the first line of the
 * stream: plain objects, arrays, strings, numbers, booleans, null and
 * undefined; a typed value such as a date comes back in its raw encoding.
 */
export async function routeLoaderData(response: Response): Promise<unknown[]> {
  const [firstLine = "[]"] = (await response.text()).split("\n");
  const values = JSON.parse(firstLine) as unknown[];
  const routes = hydrate(values, 0) as Record<string, { data?: unknown }>;

  return Object.values(routes).map((route) => route.data);
}

function hydrate(values: unknown[], index: number): unknown {
  if (index === UNDEFINED) return undefined;
  if (index === NULL) return null;

  const value = values[index];

  if (Array.isArray(value)) {
    return typeof value[0] === "string"
      ? value
      : value.map((item: number) => hydrate(values, item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, number>).map(([key, item]) => [
        values[Number(key.slice(1))],
        hydrate(values, item),
      ]),
    );
  }

  return value;
}
