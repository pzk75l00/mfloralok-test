// Exportador simple: convierte el Manual MD a .docx
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, HeadingLevel, TextRun, Media } = require('docx');

const INPUT_MD = path.resolve(__dirname, '..', 'doc', 'Manual_Usuario_MundoFloral.md');
const OUTPUT_DOCX = path.resolve(__dirname, '..', 'doc', 'Manual_Usuario_MundoFloral.docx');

function parseMarkdownLines(md, doc) {
  const lines = md.split(/\r?\n/);
  const paras = [];
  for (const line of lines) {
    if (!line.trim()) {
      paras.push(new Paragraph(''));
      continue;
    }
    // Imágenes Markdown: ![alt](path)
    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1] || '';
      let imgPath = imgMatch[2] || '';
      // Resolver ruta relativa al archivo Markdown
      if (!path.isAbsolute(imgPath)) {
        imgPath = path.resolve(path.dirname(INPUT_MD), imgPath);
      }
      try {
        if (fs.existsSync(imgPath)) {
          const buffer = fs.readFileSync(imgPath);
          // Ancho sugerido para Word (px a pt aprox): docx usa pixels virtuales, podemos dejar auto
          const image = Media.addImage(doc, buffer);
          paras.push(new Paragraph(image));
          if (alt) paras.push(new Paragraph({ children: [new TextRun({ text: alt, italics: true })] }));
        } else {
          paras.push(new Paragraph({ children: [new TextRun(`[Imagen pendiente: ${alt}]`)] }));
        }
      } catch (e) {
        paras.push(new Paragraph({ children: [new TextRun(`[No se pudo cargar la imagen: ${alt}]`)] }));
      }
      continue;
    }
    if (line.startsWith('# ')) {
      paras.push(new Paragraph({ text: line.replace('# ', ''), heading: HeadingLevel.TITLE }));
    } else if (line.startsWith('## ')) {
      paras.push(new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_1 }));
    } else if (line.startsWith('- ')) {
      paras.push(new Paragraph({ text: '• ' + line.replace('- ', '') }));
    } else if (line.match(/^\d+\)\s/)) {
      paras.push(new Paragraph({ text: line }));
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
  const doc = new Document({ sections: [] });
    const paragraphs = parseMarkdownLines(md, doc);

    doc.addSection({ properties: {}, children: paragraphs });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(OUTPUT_DOCX, buffer);
    console.log('Manual generado en', OUTPUT_DOCX);
  } catch (err) {
    console.error('Error exportando manual a DOCX:', err);
    process.exit(1);
  }
})();
