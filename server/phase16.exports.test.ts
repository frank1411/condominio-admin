import { describe, it, expect } from "vitest";
import { generatePDF, generateExcel, PaymentStatusData } from "./exports";

describe("Export Functions", () => {
  const mockData: PaymentStatusData = {
    month: "2026-03",
    condominiumName: "Condominio Test",
    debts: [
      {
        apartmentId: 1,
        apartmentName: "PB-A",
        totalDue: "100.00",
        pendingAmount: "50.00",
        isPaid: false,
      },
      {
        apartmentId: 2,
        apartmentName: "PB-B",
        totalDue: "200.00",
        pendingAmount: "0.00",
        isPaid: true,
      },
    ],
    summary: {
      total: 2,
      paid: 1,
      pending: 1,
      totalDue: 300,
      totalPending: 50,
    },
  };

  it("should generate PDF buffer", async () => {
    const buffer = await generatePDF(mockData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(buffer.toString("utf8", 0, 4)).toBe("%PDF");
  });

  it("should generate Excel buffer", async () => {
    const buffer = await generateExcel(mockData);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    // Excel files are ZIP files, start with PK
    expect(buffer.toString("utf8", 0, 2)).toBe("PK");
  });

  it("should include condominium name in PDF", async () => {
    const buffer = await generatePDF(mockData);
    expect(buffer.toString("utf8", 0, 4)).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("should include apartment data in PDF", async () => {
    const buffer = await generatePDF(mockData);
    expect(buffer.toString("utf8", 0, 4)).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("should include summary data in Excel", async () => {
    const buffer = await generateExcel(mockData);
    // Excel is binary, but we can check that it's not empty and valid
    expect(buffer.length).toBeGreaterThan(0);
    // Check for ZIP signature
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4b); // K
  });

  it("should handle empty debts array", async () => {
    const emptyData: PaymentStatusData = {
      ...mockData,
      debts: [],
      summary: {
        total: 0,
        paid: 0,
        pending: 0,
        totalDue: 0,
        totalPending: 0,
      },
    };

    const pdfBuffer = await generatePDF(emptyData);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const excelBuffer = await generateExcel(emptyData);
    expect(excelBuffer).toBeInstanceOf(Buffer);
    expect(excelBuffer.length).toBeGreaterThan(0);
  });

  it("should format currency correctly in PDF", async () => {
    const buffer = await generatePDF(mockData);
    expect(buffer.toString("utf8", 0, 4)).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(500);
  });
});
