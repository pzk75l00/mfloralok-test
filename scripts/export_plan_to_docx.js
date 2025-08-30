// Simple exporter: convert Markdown plan to .docx
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, HeadingLevel, TextRun } = require('docx');

const INPUT_MD = path.resolve(__dirname, '..', 'doc', 'Plan_Comercial_Licenciamiento.md');
const OUTPUT_DOCX = path.resolve(__dirname, '..', 'doc', 'Plan_Comercial_Licenciamiento.docx');

function parseMarkdownLines(md) {
  const lines = md.split(/\r?\n/);
  const paras = [];
  for (const line of lines) {
    if (!line.trim()) {
      paras.push(new Paragraph(''));
      continue;
    }
    if (line.startsWith('# ')) {
      paras.push(new Paragraph({ text: line.replace('# ', ''), heading: HeadingLevel.TITLE }));
    } else if (line.startsWith('## ')) {
      paras.push(new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_1 }));
    } else if (line.startsWith('- ')) {
      paras.push(new Paragraph({ text: '• ' + line.replace('- ', '') }));
    } else {
      paras.push(new Paragraph({ children: [new TextRun(line)] }));
    }
  }
  return paras;
}

(async function main() {
  try {
    if (!fs.existsSync(INPUT_MD)) {
      console.error('No se encontró el archivo Markdown en', INPUT_MD);
      process.exit(1);
    }
    const md = fs.readFileSync(INPUT_MD, 'utf8');
    const paragraphs = parseMarkdownLines(md);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(OUTPUT_DOCX, buffer);
    console.log('Documento generado en', OUTPUT_DOCX);
  } catch (err) {
    console.error('Error exportando a DOCX:', err);
    process.exit(1);
  }
})();
