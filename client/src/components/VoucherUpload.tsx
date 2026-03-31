import { useState, useRef } from "react";
import { Upload, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";

interface VoucherUploadProps {
  paymentId: number;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: string) => void;
}

export function VoucherUpload({ paymentId, onUploadSuccess, onUploadError }: VoucherUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.payments.uploadVoucher.useMutation();

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: "Tipo de archivo no permitido. Solo: JPG, PNG, WebP, PDF",
      };
    }

    if (file.size > MAX_SIZE) {
      return {
        valid: false,
        error: `Archivo muy grande. Máximo: 5MB (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
      };
    }

    return { valid: true };
  };

  const handleFile = async (file: File) => {
    setError(null);
    setSuccess(null);

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || "Error validando archivo");
      onUploadError?.(validation.error || "Error validando archivo");
      return;
    }

    setFileName(file.name);

    // Mostrar preview para imágenes
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    // Subir archivo
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        if (!base64) {
          throw new Error("Error al procesar archivo");
        }

        const result = await uploadMutation.mutateAsync({
          paymentId,
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
        });

        setSuccess("Comprobante subido exitosamente");
        setFileName(null);
        setPreview(null);
        onUploadSuccess?.(result.url);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error al subir comprobante";
      setError(errorMsg);
      onUploadError?.(errorMsg);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comprobante de Pago</CardTitle>
        <CardDescription>Sube una imagen o PDF del comprobante (máx. 5MB)</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {preview ? (
          <div className="space-y-3">
            <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              <button
                onClick={() => {
                  setPreview(null);
                  setFileName(null);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600">{fileName}</p>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">Arrastra el archivo aquí</p>
            <p className="text-xs text-gray-500 mt-1">o</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              Seleccionar archivo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadMutation.isPending}
            />
          </div>
        )}

        {uploadMutation.isPending && (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Subiendo...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
