import { AlertCircle } from "lucide-react";

interface FormValidationErrorProps {
  message?: string;
  details?: string[];
}

export function FormValidationError({
  message = "Hay errores en el formulario",
  details = [],
}: FormValidationErrorProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-red-900">{message}</p>
          {details.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-red-800">
              {details.map((detail, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-red-600">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
