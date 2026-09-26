export async function visibleDocument(response: Response): Promise<string> {
  const [rendered] = (await response.text()).split("<script");

  return rendered.replaceAll("<!-- -->", "");
}
