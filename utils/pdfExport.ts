
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  accountName: string;
  dateRange: string;
  language: string;
  style: 'dark' | 'light';
}

/**
 * Generates a high-quality multi-page PDF report.
 * Each child element of the target container is captured as a distinct block.
 */
export const generateReportPDF = async (sectionIds: string[], options: ExportOptions) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  const timestamp = new Date().toISOString().split('T')[0];
  const cleanAccountName = options.accountName.replace(/[^a-z0-9]/gi, '_');
  const fileName = `AdPilot_Audit_${cleanAccountName}_${timestamp}.pdf`;

  let totalPagesProcessed = 0;

  for (const id of sectionIds) {
    const parent = document.getElementById(id);
    if (!parent) continue;

    const elements = Array.from(parent.children) as HTMLElement[];

    for (const element of elements) {
      // Temporarily reveal if hidden (though container is usually hidden off-screen)
      const originalVisibility = element.style.visibility;
      const originalPosition = element.style.position;

      element.style.visibility = 'visible';

      const canvas = await html2canvas(element, {
        scale: 2.5, // High resolution for text readability
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Restore
      element.style.visibility = originalVisibility;

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      const elementHeightInPdf = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = elementHeightInPdf;
      let position = 0;

      // Handle multi-page elements (like long Q&A or long pillars)
      while (heightLeft > 0) {
        if (totalPagesProcessed > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(
          imgData, 
          'JPEG', 
          0, 
          -(position * pdfHeight), 
          pdfWidth, 
          elementHeightInPdf,
          undefined,
          'FAST'
        );
        
        totalPagesProcessed++;
        heightLeft -= pdfHeight;
        position += 1;
      }
    }
  }

  pdf.save(fileName);
};
