
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  accountName: string;
  dateRange: string;
  language: string;
  style: 'dark' | 'light';
}

/**
 * Generates a high-quality PDF by capturing strictly defined .pdf-page elements.
 * The React component handles the pagination logic (chunking content into pages),
 * so this utility simply acts as a "screenshot" tool for each page.
 */
export const generateReportPDF = async (containerId: string, options: ExportOptions) => {
  const container = document.getElementById(containerId);
  if (!container) {
      console.error("PDF Container not found");
      return;
  }

  // Find all pre-paginated pages
  const pages = Array.from(container.querySelectorAll('.pdf-page')) as HTMLElement[];
  if (pages.length === 0) {
      console.error("No PDF pages found. Ensure PdfReportTemplate is rendering.");
      return;
  }

  // A4 size in mm
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  const timestamp = new Date().toISOString().split('T')[0];
  const cleanAccountName = options.accountName.replace(/[^a-z0-9]/gi, '_');
  const fileName = `AdPilot_Audit_${cleanAccountName}_${timestamp}.pdf`;

  for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      // If not the first page, add a new one
      if (i > 0) {
          pdf.addPage();
      }

      try {
        const canvas = await html2canvas(page, {
            scale: 2, // High resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 794 // Exact print width
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgProps = pdf.getImageProperties(imgData);
        const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfImgHeight);

      } catch (err) {
          console.error(`Error capturing page ${i + 1}:`, err);
      }
  }

  pdf.save(fileName);
};
