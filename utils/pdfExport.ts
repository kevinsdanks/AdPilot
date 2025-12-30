
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExportOptions {
  accountName: string;
}

export const generateReportPDF = async (containerId: string, options: ExportOptions) => {
  try {
    const container = document.getElementById(containerId);
    if (!container) {
        throw new Error("PDF Container not found in DOM");
    }

    // Target the specific page elements defined in PdfReportTemplate
    const pages = Array.from(container.querySelectorAll('.pdf-page')) as HTMLElement[];
    
    if (pages.length === 0) {
        throw new Error("No pages found to export within the container");
    }

    // A4 dimensions in mm (Portrait)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      try {
        // Capture the page
        const canvas = await html2canvas(page, {
          scale: 2, // Higher scale for better quality
          useCORS: true, // Allow cross-origin images
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1024, // Ensure adequate width for charts
          onclone: (clonedDoc) => {
            const clonedContainer = clonedDoc.getElementById(containerId);
            if (clonedContainer) {
              // Ensure the container is visible in the cloned document for capture
              clonedContainer.style.opacity = '1';
              clonedContainer.style.visibility = 'visible';
              clonedContainer.style.display = 'block';
            }
          }
        });

        const imgData = canvas.toDataURL('image/png');
        
        if (i > 0) pdf.addPage();

        // Calculate dimensions to fit width, maintaining aspect ratio
        const imgProps = pdf.getImageProperties(imgData);
        const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // Render image
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfImgHeight, pdfHeight));
      } catch (pageErr) {
        console.error(`Error processing page ${i + 1}:`, pageErr);
      }
    }

    const cleanName = options.accountName.replace(/[^a-z0-9]/gi, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    pdf.save(`AdPilot_Report_${cleanName}_${timestamp}.pdf`);
    
  } catch (err) {
    console.error("Critical PDF Export Error:", err);
    throw err; // Re-throw to be caught by UI handler
  }
};
