import sys

import pdfplumber


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: extract_pdf_text.py <pdf_path>", file=sys.stderr)
        return 2

    chunks: list[str] = []
    with pdfplumber.open(sys.argv[1]) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
            text = text.strip()
            if text:
                chunks.append(text)

    print("\n\n".join(chunks))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
