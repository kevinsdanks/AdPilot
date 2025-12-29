
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  accountName: string;
}

export const generateReportPDF = async (containerId: string, options: ExportOptions) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageHeight = pdf.internal.pageSize.getHeight(); // ~297mm
  const pageWidth = pdf.internal.pageSize.getWidth();   // ~210mm
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = margin;

  const container = document.getElementById(containerId);
  if (!container) return;

  const elements = Array.from(container.children) as HTMLElement[];

  for (const element of elements) {
    // 1. Capture the element
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    // 2. Orphan Protection Logic
    // If it's a Header (marked via data-type="header"), needs more space (e.g. 40mm) to avoid being lonely at bottom
    const threshold = element.getAttribute('data-type') === 'header' ? 40 : imgHeight;

    // 3. Page Break Check
    if (currentY + threshold > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }

    // 4. Draw
    pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, imgHeight);
    currentY += imgHeight + 3; // 3mm spacing
  }

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`AdPilot Intelligence • ${options.accountName} • Page ${i} of ${totalPages}`, margin, pageHeight - 5);
  }

  const cleanName = options.accountName.replace(/[^a-z0-9]/gi, '_');
  pdf.save(`AdPilot_Report_${cleanName}.pdf`);
};
