import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CycleHistory as CycleHistoryType, CycleData } from '../types';
import { cycleService } from '../services/cycle';
import { formatDateForDisplay, normalizeDate } from './dateUtils';

/**
 * Generates and downloads a branded clinical PDF report of the user's cycle history and logs.
 */
export async function exportClinicalReport(
  userId: string, 
  history: CycleHistoryType[], 
  currentCycle: CycleData | null
) {
  try {
    const logs = await cycleService.getRecentLogs(userId, 365);
    
    // 1. Load app logo for PDF injection
    const logoBase64 = await new Promise<string>((resolve) => {
      const img = new Image();
      img.src = '/pwa-512x512.png';
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else resolve('');
      };
      img.onerror = () => resolve('');
    });

    const doc = new jsPDF() as any; 
    
    // 2. Add Branded Header Background
    doc.setFillColor(125, 156, 120); // sage-500
    doc.rect(0, 0, 210, 40, 'F');

    // 3. Add Logo to Header
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 14, 10, 20, 20);
    }

    // 4. Add Header Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('PHASE', logoBase64 ? 38 : 14, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(232, 237, 232); // sage-100
    doc.text('Clinical Cycle Report', logoBase64 ? 38 : 14, 28);

    // 5. Report Meta Data
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: ${formatDateForDisplay(new Date())}`, 14, 50);
    doc.text(`Total Archives: ${history.length} cycles (Last 12 Months)`, 14, 56);
    
    // 6. Add subtle Watermark
    if (logoBase64) {
      doc.setGState(new doc.GState({ opacity: 0.05 }));
      doc.addImage(logoBase64, 'PNG', 55, 100, 100, 100);
      doc.setGState(new doc.GState({ opacity: 1 }));
    }

    // --- 1st TABLE: ARCHIVED CYCLES ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('Archived Cycle History', 14, 70);

    const historyData = history.map((h, i) => {
      const shortDate = (date?: Date | string | null) => {
        if (!date) return '';
        return normalizeDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
      };
      const formatPhase = (start?: Date | string | null, end?: Date | string | null) => {
        if (!start || !end) return '-';
        return `${shortDate(start)} to\n${shortDate(end)}`;
      };

      return [
        `Cycle ${history.length - i}`,
        `${formatDateForDisplay(normalizeDate(h.startDate))} -\n${formatDateForDisplay(normalizeDate(h.endDate))}\n\nLength: ${h.cycleLength} Days`,
        formatPhase(h.menstrualPhaseStart, h.menstrualPhaseEnd),
        formatPhase(h.follicularPhaseStart, h.follicularPhaseEnd),
        formatPhase(h.ovulationPhaseStart, h.ovulationPhaseEnd),
        formatPhase(h.lutealPhaseStart, h.lutealPhaseEnd)
      ];
    });

    if (history.length > 0) {
      autoTable(doc, {
        startY: 75,
        head: [['#', 'Cycle Boundary', 'Menstrual', 'Follicular', 'Ovulation', 'Luteal']],
        body: historyData,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: 255 }, 
        styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 16, fontStyle: 'bold' },
          1: { cellWidth: 44, halign: 'left' },
          2: { cellWidth: 33, fillColor: [250, 235, 235] },
          3: { cellWidth: 33, fillColor: [235, 242, 233] },
          4: { cellWidth: 33, fillColor: [252, 243, 235] },
          5: { cellWidth: 33, fillColor: [242, 239, 234] },
        },
        didParseCell: (data: any) => {
          if (data.section === 'head' && data.column.index >= 2) {
            const headColors = [[196, 143, 143], [125, 156, 120], [212, 165, 116], [160, 142, 115]];
            data.cell.styles.fillColor = headColors[data.column.index - 2];
            data.cell.styles.textColor = 255;
          }
        }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('No archived cycles found in history.', 14, 75);
    }

    // --- 2nd TABLE: CURRENT ACTIVE CYCLE ---
    const startYAfterArchives = (doc as any).lastAutoTable?.finalY + 10 || 85;
    let finalY = startYAfterArchives;

    if (currentCycle) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Current Active Cycle (In Progress)', 14, startYAfterArchives + 5);

      const formatPhase = (start?: Date | string | null, end?: Date | string | null) => {
        if (!start || !end) return '-';
        return `${normalizeDate(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} to\n${normalizeDate(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      };

      const currentData = [[
        'Active',
        `${formatDateForDisplay(normalizeDate(currentCycle.lastPeriodDate))} -\nExp. ${formatDateForDisplay(normalizeDate(currentCycle.nextPeriodDate))}`,
        formatPhase(currentCycle.menstrualPhaseStart, currentCycle.menstrualPhaseEnd),
        formatPhase(currentCycle.follicularPhaseStart, currentCycle.follicularPhaseEnd),
        formatPhase(currentCycle.ovulationPhaseStart, currentCycle.ovulationPhaseEnd),
        formatPhase(currentCycle.lutealPhaseStart, currentCycle.lutealPhaseEnd)
      ]];

      autoTable(doc, {
        startY: startYAfterArchives + 10,
        head: [['Status', 'Cycle Boundary', 'Menstrual', 'Follicular', 'Ovulation', 'Luteal']],
        body: currentData,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: 255 }, 
        styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 16, fontStyle: 'bold' },
          1: { cellWidth: 44, halign: 'left' },
          2: { cellWidth: 33, fillColor: [250, 235, 235] },
          3: { cellWidth: 33, fillColor: [235, 242, 233] },
          4: { cellWidth: 33, fillColor: [252, 243, 235] },
          5: { cellWidth: 33, fillColor: [242, 239, 234] },
        },
        didParseCell: (data: any) => {
          if (data.section === 'head' && data.column.index >= 2) {
            const headColors = [[196, 143, 143], [125, 156, 120], [212, 165, 116], [160, 142, 115]];
            data.cell.styles.fillColor = headColors[data.column.index - 2];
            data.cell.styles.textColor = 255;
          }
        }
      });
      finalY = doc.lastAutoTable.finalY || finalY;
    }

    // --- 3rd TABLE: DAILY LOGS ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Daily Symptom & BBT Logs', 14, finalY + 15);

    const logsData = logs.map(l => {
      const dateStr = formatDateForDisplay(l.date);
      const bbtStr = l.symptoms?.bbt ? `${l.symptoms.bbt} °C` : '-';
      
      const symps = [];
      if (l.symptoms?.cervicalFluid) symps.push(`${l.symptoms.cervicalFluid}`);
      if (l.symptoms?.cramps) symps.push(`Cramps: ${l.symptoms.cramps}`);
      if (l.symptoms?.mood) symps.push(`Mood: ${l.symptoms.mood}`);
      const sympStr = symps.length > 0 ? symps.join(' | ') : '-';
      
      const notesStr = l.notes || '-';
      return [dateStr, bbtStr, sympStr, notesStr];
    });

    if (logsData.length > 0) {
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Date', 'BBT', 'Symptoms', 'Clinical Notes']],
        body: logsData,
        theme: 'grid',
        headStyles: { fillColor: [99, 133, 96], textColor: 255 }, 
        alternateRowStyles: { fillColor: [250, 249, 247] }, 
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 25, fontStyle: 'bold' },
          1: { cellWidth: 20 },
          2: { cellWidth: 60 },
          3: { cellWidth: 'auto' },
        }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('No detailed daily logs found in history.', 14, finalY + 25);
    }

    // 7. Add Branded Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${pageCount} — Phase Health Tracker`, 14, 285);
    }

    doc.save('Phase-Clinical-Cycle-Report.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report. Please try again.');
  }
}
