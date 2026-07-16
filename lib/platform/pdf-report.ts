import { jsPDF } from "jspdf";
import type { MarketplaceProduct } from "./types";

export interface PdfReportInput {
  problem: string;
  answer: string;
  cropName?: string;
  products?: MarketplaceProduct[];
  imageDataUrls?: string[];
}

export async function exportAgronomPdf(input: PdfReportInput): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;
  const maxW = 515;

  const add = (text: string, size = 11, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    for (const line of lines) {
      if (y > 780) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += size + 6;
    }
  };

  add("Я AI Дехқон — Professional Report", 16, true);
  y += 6;
  add(`Sana: ${new Date().toLocaleString("uz-UZ")}`, 10);
  if (input.cropName) add(`Ekin: ${input.cropName}`, 11, true);
  y += 8;
  add("1. Muammo / Savol", 13, true);
  add(input.problem || "—");
  y += 8;
  add("2. Я AI Дехқон tahlili va tavsiya", 13, true);
  add(input.answer.replace(/---AGRO_META---[\s\S]*?---END---/gi, "").trim() || "—");
  y += 8;

  if (input.products?.length) {
    add("3. Marketplace mahsulotlari", 13, true);
    for (const p of input.products) {
      add(`• ${p.name} — ${p.price} (${p.category})`);
      add(`  ${p.description}`, 10);
    }
    y += 6;
  }

  add("4. Sug'orish / O'g'it / Oldini olish", 13, true);
  add(
    "Javobdagi sug'orish, o'g'it va profilaktika bandlariga amal qiling. Xavfli preparatlarda doza uchun mahsulot yo'riqnomasini tekshiring."
  );

  if (input.imageDataUrls?.length) {
    y += 10;
    add("5. Rasmlar", 13, true);
    for (const url of input.imageDataUrls.slice(0, 4)) {
      try {
        if (y > 620) {
          doc.addPage();
          y = margin;
        }
        doc.addImage(url, "JPEG", margin, y, 160, 120);
        y += 130;
      } catch {
        // skip invalid
      }
    }
  }

  doc.save(`agro-olam-report-${Date.now()}.pdf`);
}
