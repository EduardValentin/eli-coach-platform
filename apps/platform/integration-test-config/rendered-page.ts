export async function visibleDocument(response: Response): Promise<string> {
  const [rendered] = (await response.text()).split("<script");

  return rendered.replaceAll("<!-- -->", "");
}

export function textNodesOf(page: string): string[] {
  return [...page.matchAll(/>([^<>]+)</g)].map(([, text = ""]) => text.trim());
}
