export async function exportMarketRows(rows, filename, format) {
  let blob;
  if (format === 'xlsx') {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    const relationships = (kind, target) => '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/' + kind + '" Target="' + target + '"/></Relationships>';
    zip.file('_rels/.rels', relationships('officeDocument', 'xl/workbook.xml'));
    zip.file('xl/_rels/workbook.xml.rels', relationships('worksheet', 'worksheets/sheet1.xml'));
    zip.file('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Market data" sheetId="1" r:id="rId1"/></sheets></workbook>');
    const cells = rows.map(row => '<row>' + row.map(value => typeof value === 'number'
      ? '<c><v>' + value + '</v></c>'
      : '<c t="inlineStr"><is><t xml:space="preserve">' + escape(value) + '</t></is></c>').join('') + '</row>').join('');
    zip.file('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + cells + '</sheetData></worksheet>');
    blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } else {
    const quote = value => '"' + String(value).replaceAll('"', '""') + '"';
    blob = new Blob([rows.map(row => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename + '.' + format;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
