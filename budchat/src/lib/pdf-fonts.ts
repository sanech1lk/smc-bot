import path from "path";

// dejavu-fonts-ttf ships plain .ttf files with full Cyrillic coverage —
// pdfkit's built-in fonts (Helvetica etc.) are Latin-only, so PDFs with
// Russian text need an embedded font.
export const PDF_FONT_REGULAR = path.join(
  process.cwd(),
  "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf"
);
export const PDF_FONT_BOLD = path.join(
  process.cwd(),
  "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf"
);
