export async function visibleDocument(response: Response): Promise<string> {
  const [rendered] = (await response.text()).split("<script");

  return rendered.replaceAll("<!-- -->", "");
}

export function textNodesOf(page: string): string[] {
  return [...page.matchAll(/>([^<>]+)</g)].map(([, text = ""]) => text.trim());
}

export function tableBodyRowsIn(page: string, caption: string): string[][] {
  return bodyRowsOf(tableCaptioned(page, caption)).map(cellTextsOf);
}

function tableCaptioned(page: string, caption: string): string {
  const tables = [...page.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)].map(
    ([, content = ""]) => content,
  );

  return tables.find((table) => table.includes(`>${caption}</caption>`)) ?? "";
}

function bodyRowsOf(table: string): string[] {
  const body = /<tbody[^>]*>([\s\S]*?)<\/tbody>/.exec(table)?.[1] ?? "";

  return [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(
    ([, row = ""]) => row,
  );
}

function cellTextsOf(row: string): string[] {
  return [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(([, cell = ""]) =>
    cell.replace(/<[^>]+>/g, "").trim(),
  );
}
