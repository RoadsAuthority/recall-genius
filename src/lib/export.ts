// Export utilities for notes

export interface ExportOptions {
  format: "markdown" | "text";
  includeQuestions?: boolean;
}

export const exportNote = async (
  noteId: string,
  title: string,
  content: string,
  options: ExportOptions = { format: "markdown" }
): Promise<string> => {
  let exported = `# ${title}\n\n`;

  if (options.format === "markdown") {
    // Split content into blocks (same logic as editor)
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    paragraphs.forEach((paragraph, index) => {
      exported += `## Block ${index + 1}\n\n${paragraph}\n\n`;
    });
  } else {
    exported += content;
  }

  return exported;
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportNoteToMarkdown = async (
  noteId: string,
  title: string,
  content: string
) => {
  const markdown = await exportNote(noteId, title, content, { format: "markdown" });
  const filename = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
  downloadFile(markdown, filename, "text/markdown");
};

export const exportNoteToText = async (
  noteId: string,
  title: string,
  content: string
) => {
  const text = await exportNote(noteId, title, content, { format: "text" });
  const filename = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
  downloadFile(text, filename, "text/plain");
};
