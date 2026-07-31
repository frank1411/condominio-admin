import PDFDocument from "pdfkit";
import ExcelJS, { Worksheet, Workbook, Cell } from "exceljs";

export interface PaymentStatusData {
  month: string;
  condominiumName: string;
  debts: Array<{
    apartmentId: number;
    apartmentName: string;
    totalDue: string;
    pendingAmount: string;
    isPaid: boolean;
  }>;
  summary: {
    total: number;
    paid: number;
    pending: number;
    totalDue: number;
    totalPending: number;
  };
}

export async function generatePDF(data: PaymentStatusData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageHeight = doc.page.height;
      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - 2 * margin;

      // Función para agregar encabezado en cada página
      const addHeader = () => {
        doc.fontSize(16).font("Helvetica-Bold").text(data.condominiumName, { align: "center" });
        doc.fontSize(11).font("Helvetica").text("Estado de Pagos por Apartamento", { align: "center" });
        doc.fontSize(9).text(`Mes: ${data.month}`, { align: "center" });
        doc.moveDown(0.5);
      };

      // Primera página con encabezado y resumen
      addHeader();

      doc.fontSize(10).font("Helvetica-Bold").text("Resumen:");
      doc.fontSize(9).font("Helvetica");
      doc.text(`Total de Apartamentos: ${data.summary.total}`);
      doc.text(`Pagados: ${data.summary.paid}`);
      doc.text(`Pendientes: ${data.summary.pending}`);
      doc.text(`Total Adeudado: $${data.summary.totalDue.toFixed(2)}`);
      doc.text(`Total Pendiente: $${data.summary.totalPending.toFixed(2)}`);
      doc.moveDown(0.5);

      // Tabla de apartamentos
      doc.fontSize(10).font("Helvetica-Bold").text("Detalle de Apartamentos:");
      doc.moveDown(0.3);

      // Configuración de tabla
      const colWidths = [80, 90, 90, 90];
      const rowHeight = 20;
      const headerHeight = 20;
      let currentY = doc.y;

      // Función para dibujar encabezados de tabla
      const drawTableHeader = () => {
        const headers = ["Apartamento", "Deuda Total", "Pendiente", "Estado"];
        let x = margin;
        const y = doc.y;

        doc.fontSize(8).font("Helvetica-Bold");
        headers.forEach((header, i) => {
          doc.text(header, x, y, { width: colWidths[i], align: "left" });
          x += colWidths[i];
        });

        doc.moveTo(margin, y + headerHeight - 5)
          .lineTo(pageWidth - margin, y + headerHeight - 5)
          .stroke();

        doc.moveDown(1.2);
      };

      // Dibujar primer encabezado de tabla
      drawTableHeader();

      // Dibujar filas de datos
      doc.fontSize(8).font("Helvetica");
      data.debts.forEach((debt, index) => {
        // Verificar si necesitamos una nueva página
        if (doc.y + rowHeight > pageHeight - margin - 30) {
          doc.addPage();
          addHeader();
          doc.moveDown(0.3);
          drawTableHeader();
        }

        let x = margin;
        const y = doc.y;

        // Dibujar cada celda
        doc.text(debt.apartmentName, x, y, { width: colWidths[0], align: "left" });
        x += colWidths[0];

        doc.text(`$${parseFloat(debt.totalDue).toFixed(2)}`, x, y, { width: colWidths[1], align: "right" });
        x += colWidths[1];

        doc.text(`$${parseFloat(debt.pendingAmount).toFixed(2)}`, x, y, { width: colWidths[2], align: "right" });
        x += colWidths[2];

        const status = debt.isPaid ? "Pagado" : "Pendiente";
        doc.text(status, x, y, { width: colWidths[3], align: "left" });

        doc.moveDown(1);
      });

      // Pie de página
      doc.moveDown();
      doc.fontSize(7).font("Helvetica").text(
        `Generado: ${new Date().toLocaleString("es-ES")}`,
        { align: "right" }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateExcel(data: PaymentStatusData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Estado de Pagos");

  // Encabezado
  worksheet.mergeCells("A1:D1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = data.condominiumName;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A2:D2");
  const subtitleCell = worksheet.getCell("A2");
  subtitleCell.value = "Estado de Pagos por Apartamento";
  subtitleCell.font = { size: 12, bold: true };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("A3:D3");
  const monthCell = worksheet.getCell("A3");
  monthCell.value = `Mes: ${data.month}`;
  monthCell.alignment = { horizontal: "center" };

  worksheet.addRow([]); // Fila vacía

  // Resumen
  worksheet.getCell("A5").value = "Resumen:";
  worksheet.getCell("A5").font = { bold: true };

  worksheet.getCell("A6").value = "Total de Apartamentos:";
  worksheet.getCell("B6").value = data.summary.total;

  worksheet.getCell("A7").value = "Pagados:";
  worksheet.getCell("B7").value = data.summary.paid;

  worksheet.getCell("A8").value = "Pendientes:";
  worksheet.getCell("B8").value = data.summary.pending;

  worksheet.getCell("A9").value = "Total Adeudado:";
  worksheet.getCell("B9").value = data.summary.totalDue;
  worksheet.getCell("B9").numFmt = "$#,##0.00";

  worksheet.getCell("A10").value = "Total Pendiente:";
  worksheet.getCell("B10").value = data.summary.totalPending;
  worksheet.getCell("B10").numFmt = "$#,##0.00";

  worksheet.addRow([]); // Fila vacía

  // Encabezados de tabla
  const headerRow = worksheet.addRow(["Apartamento", "Deuda Total", "Pendiente", "Estado"]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD3D3D3" },
  };

  // Datos
  data.debts.forEach((debt) => {
    const row = worksheet.addRow([
      debt.apartmentName,
      parseFloat(debt.totalDue),
      parseFloat(debt.pendingAmount),
      debt.isPaid ? "Pagado" : "Pendiente",
    ]);

    row.getCell(2).numFmt = "$#,##0.00";
    row.getCell(3).numFmt = "$#,##0.00";
  });

  // Ajustar ancho de columnas
  worksheet.columns = [
    { width: 20 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];

  // Convertir a buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}
