import { useState } from "react";
import { Download, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

interface VoucherViewerProps {
  paymentId: number;
  fileName?: string;
}

export function VoucherViewer({ paymentId, fileName }: VoucherViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: voucherData, isLoading } = trpc.payments.getVoucher.useQuery(
    { paymentId },
    { enabled: isOpen }
  );

  if (!voucherData?.url) {
    return null;
  }

  const isPdf = voucherData.url?.endsWith(".pdf") ?? false;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comprobante</CardTitle>
          <CardDescription>{fileName || "Comprobante de pago"}</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(true)}
              disabled={isLoading}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!voucherData.url) return;
                const link = document.createElement("a");
                link.href = voucherData.url;
                link.download = fileName || "comprobante";
                link.click();
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{fileName || "Comprobante de pago"}</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : isPdf ? (
            <iframe
              src={voucherData.url || ""}
              className="w-full h-96 border rounded-lg"
              title="PDF Viewer"
            />
          ) : (
            <img
              src={voucherData.url || ""}
              alt="Comprobante"
              className="w-full h-auto rounded-lg border"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
