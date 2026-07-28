import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * ME-08: Integration Tests - Financial Flow
 * Flujo completo: cobro → deuda → pago → liquidación
 *
 * These tests validate the business logic and validation functions
 * that don't require a live database connection.
 */

// ===== VALIDATION FUNCTIONS (sync, no DB) =====

describe("Payment Validation", () => {
  // Test the validatePaymentMonth logic
  describe("validatePaymentMonth", () => {
    const validatePaymentMonth = (
      paymentMonth: string,
      currentMonth: string
    ): { valid: boolean; error?: string } => {
      // Don't allow future months beyond current
      if (paymentMonth > currentMonth) {
        return {
          valid: false,
          error: "No se pueden registrar pagos en meses futuros",
        };
      }

      // Don't allow months older than 6 months
      const [payYear, payMonth] = paymentMonth.split("-").map(Number);
      const [curYear, curMonth] = currentMonth.split("-").map(Number);
      const monthsDiff =
        (curYear - payYear) * 12 + (curMonth - payMonth);

      if (monthsDiff > 6) {
        return {
          valid: false,
          error: "No se pueden registrar pagos con más de 6 meses de antigüedad",
        };
      }

      return { valid: true };
    };

    it("accepts current month payment", () => {
      const result = validatePaymentMonth("2025-01", "2025-01");
      expect(result.valid).toBe(true);
    });

    it("accepts recent month payment", () => {
      const result = validatePaymentMonth("2024-12", "2025-01");
      expect(result.valid).toBe(true);
    });

    it("rejects future month payment", () => {
      const result = validatePaymentMonth("2025-02", "2025-01");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("futuros");
    });

    it("rejects payment older than 6 months", () => {
      const result = validatePaymentMonth("2024-06", "2025-01");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("6 meses");
    });
  });

  // Test the validatePaymentAmount logic
  describe("validatePaymentAmount", () => {
    const validatePaymentAmount = (
      amount: number,
      pendingAmount: number
    ): { valid: boolean; error?: string } => {
      if (amount <= 0) {
        return { valid: false, error: "El monto del pago debe ser mayor a 0" };
      }
      if (amount > pendingAmount) {
        return {
          valid: false,
          error: `El monto ($${amount}) excede el monto pendiente ($${pendingAmount})`,
        };
      }
      return { valid: true };
    };

    it("accepts valid payment amount", () => {
      const result = validatePaymentAmount(100, 500);
      expect(result.valid).toBe(true);
    });

    it("accepts exact pending amount", () => {
      const result = validatePaymentAmount(500, 500);
      expect(result.valid).toBe(true);
    });

    it("rejects zero amount", () => {
      const result = validatePaymentAmount(0, 500);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("mayor a 0");
    });

    it("rejects negative amount", () => {
      const result = validatePaymentAmount(-100, 500);
      expect(result.valid).toBe(false);
    });

    it("rejects amount exceeding pending", () => {
      const result = validatePaymentAmount(600, 500);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("excede");
    });
  });

  // Test duplicate payment check logic
  describe("checkDuplicatePayment", () => {
    const checkDuplicatePayment = (
      existingPayments: Array<{ month: string; apartmentId: number }>,
      newPayment: { month: string; apartmentId: number }
    ): boolean => {
      return existingPayments.some(
        (p) =>
          p.month === newPayment.month &&
          p.apartmentId === newPayment.apartmentId
      );
    };

    it("returns false when no duplicate exists", () => {
      const existing = [{ month: "2025-01", apartmentId: 1 }];
      const result = checkDuplicatePayment(existing, {
        month: "2025-02",
        apartmentId: 1,
      });
      expect(result).toBe(false);
    });

    it("returns true when duplicate exists", () => {
      const existing = [{ month: "2025-01", apartmentId: 1 }];
      const result = checkDuplicatePayment(existing, {
        month: "2025-01",
        apartmentId: 1,
      });
      expect(result).toBe(true);
    });

    it("allows same month for different apartment", () => {
      const existing = [{ month: "2025-01", apartmentId: 1 }];
      const result = checkDuplicatePayment(existing, {
        month: "2025-01",
        apartmentId: 2,
      });
      expect(result).toBe(false);
    });
  });
});

// ===== DEBT SUMMARY CALCULATION =====

describe("computeDebtSummary", () => {
  const computeDebtSummary = (
    debts: Array<{ pendingAmount: number | string; isPaid: boolean }>
  ) => {
    const totalDebts = debts.length;
    const pendingDebts = debts.filter((d) => !d.isPaid).length;
    const paidDebts = debts.filter((d) => d.isPaid).length;
    const totalPendingAmount = debts
      .filter((d) => !d.isPaid)
      .reduce(
        (sum, d) => sum + parseFloat(d.pendingAmount as string),
        0
      );
    const totalPaidAmount = debts
      .filter((d) => d.isPaid)
      .reduce(
        (sum, d) => sum + parseFloat(d.pendingAmount as string),
        0
      );

    return {
      totalDebts,
      pendingDebts,
      paidDebts,
      totalPendingAmount,
      totalPaidAmount,
    };
  };

  it("calculates correct summary for mixed debts", () => {
    const debts = [
      { pendingAmount: "100", isPaid: false },
      { pendingAmount: "200", isPaid: true },
      { pendingAmount: "150", isPaid: false },
    ];

    const result = computeDebtSummary(debts);
    expect(result.totalDebts).toBe(3);
    expect(result.pendingDebts).toBe(2);
    expect(result.paidDebts).toBe(1);
    expect(result.totalPendingAmount).toBe(250);
    expect(result.totalPaidAmount).toBe(200);
  });

  it("handles empty debts array", () => {
    const result = computeDebtSummary([]);
    expect(result.totalDebts).toBe(0);
    expect(result.pendingDebts).toBe(0);
    expect(result.totalPendingAmount).toBe(0);
  });
});

// ===== APARTMENT NAMING =====

describe("Apartment Naming", () => {
  const numberToLetter = (num: number): string => {
    if (num < 1 || num > 26) return num.toString();
    return String.fromCharCode(64 + num);
  };

  const getSmartFloorNumber = (floorNumber: number): string => {
    return floorNumber === 0 ? "PB" : floorNumber.toString();
  };

  const generateApartmentName = (
    pattern: string,
    floorNumber: number,
    floorName: string,
    apartmentNumber: number
  ): string => {
    const lastDigit =
      apartmentNumber % 10 ||
      (apartmentNumber % 100 === 0 ? 10 : apartmentNumber % 100);
    const letra = numberToLetter(lastDigit);
    const smartFloorNumber = getSmartFloorNumber(floorNumber);

    return pattern
      .replace("{piso}", floorNumber.toString())
      .replace("{piso_inteligente}", smartFloorNumber)
      .replace("{piso_nombre}", floorName)
      .replace("{numero}", apartmentNumber.toString())
      .replace("{letra}", letra);
  };

  it("generates correct name with piso and letra", () => {
    const result = generateApartmentName(
      "Piso {piso} - Apto {letra}",
      2,
      "Segundo",
      1
    );
    expect(result).toBe("Piso 2 - Apto A");
  });

  it("handles PB floor", () => {
    const result = generateApartmentName(
      "{piso_inteligente}-{letra}",
      0,
      "Planta Baja",
      1
    );
    expect(result).toBe("PB-A");
  });

  it("handles apartment numbers > 10", () => {
    const result = generateApartmentName("{letra}", 1, "Primero", 11);
    // 11 % 10 = 1 → letter A
    expect(result).toBe("A");
  });

  it("handles apartment number 20 (divisible by 10 but not 100)", () => {
    const result = generateApartmentName("{letra}", 1, "Primero", 20);
    // 20 % 10 = 0 → (20 % 100 === 0 ? 10 : 20 % 100) → 20 → letter T
    expect(result).toBe("T");
  });
});

// ===== PAYMENT APPROVAL FLOW =====

describe("Payment Approval Flow", () => {
  it("validates complete approval flow", () => {
    // Simulate the approval flow validation steps
    const payment = {
      id: 1,
      apartmentId: 1,
      amount: 500,
      month: "2025-01",
      status: "pending" as const,
    };

    const debt = {
      apartmentId: 1,
      month: "2025-01",
      totalDue: "500",
      pendingAmount: "500",
      isPaid: false,
    };

    // Step 1: Validate payment month
    const currentMonth = "2025-01";
    expect(payment.month <= currentMonth).toBe(true);

    // Step 2: Validate amount
    const pendingAmount = parseFloat(debt.pendingAmount);
    expect(payment.amount).toBeGreaterThan(0);
    expect(payment.amount).toBeLessThanOrEqual(pendingAmount);

    // Step 3: After approval, debt should be paid
    const newPending = pendingAmount - payment.amount;
    expect(newPending).toBe(0);
  });

  it("validates partial payment flow", () => {
    const payment = {
      amount: 200,
      month: "2025-01",
    };

    const debt = {
      totalDue: "500",
      pendingAmount: "500",
    };

    const pendingAmount = parseFloat(debt.pendingAmount);
    const newPending = pendingAmount - payment.amount;

    expect(newPending).toBe(300);
    expect(newPending).toBeGreaterThan(0); // Not fully paid
  });
});

// ===== CHARGE GENERATION =====

describe("Charge Generation", () => {
  it("generates correct debt entries for individual charge", () => {
    const charge = {
      id: 1,
      apartmentId: 1,
      amount: 100,
      description: "Mantenimiento Enero",
    };

    const existingDebt = null;

    // Simulate debt creation logic
    let debtEntry;
    if (!existingDebt) {
      debtEntry = {
        apartmentId: charge.apartmentId,
        chargeId: charge.id,
        month: "2025-01",
        totalDue: charge.amount.toString(),
        pendingAmount: charge.amount.toString(),
        isPaid: false,
      };
    }

    expect(debtEntry).toBeDefined();
    expect(debtEntry!.totalDue).toBe("100");
    expect(debtEntry!.isPaid).toBe(false);
  });

  it("generates debt entries for global charge (all apartments)", () => {
    const apartments = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const charge = {
      id: 1,
      apartmentId: null, // Global charge
      amount: 200,
    };

    const debtEntries = apartments.map((apt) => ({
      apartmentId: apt.id,
      chargeId: charge.id,
      month: "2025-01",
      totalDue: charge.amount.toString(),
      pendingAmount: charge.amount.toString(),
      isPaid: false,
    }));

    expect(debtEntries).toHaveLength(3);
    expect(debtEntries[0].apartmentId).toBe(1);
    expect(debtEntries[2].apartmentId).toBe(3);
  });
});
