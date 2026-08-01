import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface ManualPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartmentId: number;
  apartmentName: string;
  pendingDebt: number;
  onPaymentRecorded?: () => void;
}

export function ManualPaymentModal({
  open,
  onOpenChange,
  apartmentId,
  apartmentName,
  pendingDebt,
  onPaymentRecorded,
}: ManualPaymentModalProps) {
  // Toast notifications will be handled by the parent component
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const recordPaymentMutation = trpc.payments.recordManualPayment.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      alert("Ingresa un monto válido");
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount > pendingDebt) {
      alert(`El monto no puede exceder la deuda pendiente ($${pendingDebt.toFixed(2)})`);
      return;
    }

    setIsLoading(true);
    try {
      await recordPaymentMutation.mutateAsync({
        apartmentId,
        amount: paymentAmount,
        month,
        notes,
      });

      alert(`Pago de $${paymentAmount.toFixed(2)} registrado para ${apartmentName}`);

      // Reset form
      setAmount("");
      setNotes("");
      onOpenChange(false);
      onPaymentRecorded?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al registrar pago");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago Manual</DialogTitle>
          <DialogDescription>
            Apartamento: <strong>{apartmentName}</strong>
            <br />
            Deuda pendiente: <strong>${pendingDebt.toFixed(2)}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Monto a Pagar *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={pendingDebt}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-gray-500">
              Máximo: ${pendingDebt.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="month">Mes del Pago *</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Input
              id="notes"
              placeholder="Ej: Pago parcial, transferencia bancaria..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
