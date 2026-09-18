#!/usr/bin/env bash
# Export docs/云洁智享平台功能文档.md to Word (and optionally PDF).
#
#   ./export-doc.sh          # only .docx
#   ./export-doc.sh --pdf    # .docx + .pdf
#
# Word output gets grid borders on every table; PDF keeps the per-chapter page break
# defined in assets/pdf-export.css.

set -euo pipefail

DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOC_NAME="云洁智享平台功能文档"
MD="$DOCS_DIR/$DOC_NAME.md"
HTML="$DOCS_DIR/$DOC_NAME.html"
DOCX="$DOCS_DIR/$DOC_NAME.docx"
PDF="$DOCS_DIR/$DOC_NAME.pdf"
CSS="assets/pdf-export.css"
VENV="$HOME/.cache/dayangyunjie-doc-venv"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

WITH_PDF=0
[[ "${1:-}" == "--pdf" ]] && WITH_PDF=1

command -v pandoc >/dev/null || { echo "pandoc not found: brew install pandoc"; exit 1; }

if [[ ! -x "$VENV/bin/python" ]]; then
  echo "creating python venv for python-docx ..."
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet python-docx
fi

cd "$DOCS_DIR"
trap 'rm -f "$HTML"' EXIT

echo "building html ..."
pandoc "$MD" -o "$HTML" --resource-path=. --standalone --embed-resources -c "$CSS"

echo "building docx ..."
rm -f "$DOCX"
pandoc "$HTML" -o "$DOCX" --resource-path=.

"$VENV/bin/python" - "$DOCX" <<'PY'
import sys
from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

path = sys.argv[1]
doc = Document(path)

for table in doc.tables:
    tblPr = table._tbl.tblPr
    for old in tblPr.findall(qn('w:tblBorders')):
        tblPr.remove(old)
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        el = OxmlElement(f'w:{edge}')
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), '6')
        el.set(qn('w:space'), '0')
        el.set(qn('w:color'), '999999')
        borders.append(el)
    tblPr.append(borders)

doc.save(path)
print(f"table borders applied: {len(doc.tables)}")
PY

if [[ $WITH_PDF -eq 1 ]]; then
  [[ -x "$CHROME" ]] || { echo "Chrome not found, skipping pdf"; exit 0; }
  echo "building pdf ..."
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$PDF" "file://$HTML" 2>/dev/null
fi

echo "done:"
ls -la "$DOCX"
[[ $WITH_PDF -eq 1 ]] && ls -la "$PDF"
