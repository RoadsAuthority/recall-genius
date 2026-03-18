export type PdfExtractOptions = {
  maxPages?: number;
  maxChars?: number;
};

function normalizeWhitespace(s: string) {
  return s
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function extractTextFromPdf(
  file: File,
  opts: PdfExtractOptions = {},
): Promise<{ text: string; pagesExtracted: number; totalPages: number }> {
  const maxPages = opts.maxPages ?? 50;
  const maxChars = opts.maxChars ?? 200_000;

  // Lazy-load pdfjs + worker only when needed (keeps initial bundle smaller).
  const [{ getDocument, GlobalWorkerOptions }, { default: workerSrc }] =
    await Promise.all([
      import("pdfjs-dist"),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - `?url` import isn't typed in all setups
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]);
  GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const totalPages = pdf.numPages;
  const pagesToRead = Math.min(totalPages, Math.max(1, maxPages));

  const chunks: string[] = [];
  for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
      .join(" ");
    chunks.push(pageText);

    const current = chunks.join("\n\n");
    if (current.length >= maxChars) break;
  }

  const text = normalizeWhitespace(chunks.join("\n\n"));
  return { text, pagesExtracted: pagesToRead, totalPages };
}
