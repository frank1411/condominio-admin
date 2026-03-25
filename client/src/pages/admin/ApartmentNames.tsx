import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Edit2, Lightbulb } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const PATTERN_EXAMPLES = [
  { name: "Letras por piso", pattern: "{piso_nombre}-{letra}", description: "PB-A, PB-B, Piso 1-A, Piso 1-B" },
  { name: "Número y letra", pattern: "{piso}-{letra}", description: "0-A, 0-B, 1-A, 1-B" },
  { name: "Apt con número y letra", pattern: "Apt-{piso}{letra}", description: "Apt-0A, Apt-0B, Apt-1A" },
  { name: "Unidad con letra", pattern: "U{piso}-{letra}", description: "U0-A, U0-B, U1-A, U1-B" },
  { name: "Solo letras", pattern: "{letra}", description: "A, B, C, D, E, F" },
  { name: "Correlativo", pattern: "{numero}", description: "1, 2, 3, 4, 5, 6" },
];

export default function AdminApartmentNames() {
  const { data: apartments, isLoading, refetch } = trpc.apartments.list.useQuery();
  const { data: config } = trpc.config.get.useQuery();
  const generateNames = trpc.config.generateApartmentNames.useMutation();
  const updateName = trpc.apartments.updateName.useMutation();
  const updateConfig = trpc.config.update.useMutation();
  const getExamples = trpc.config.getPatternExamples.useQuery(
    { pattern: config?.apartmentNamePattern || "Apt-{piso}-{numero}" },
    { enabled: !!config }
  );

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [patternInput, setPatternInput] = useState(config?.apartmentNamePattern || "Apt-{piso}-{numero}");

  useEffect(() => {
    if (config?.apartmentNamePattern) {
      setPatternInput(config.apartmentNamePattern);
    }
  }, [config]);

  const handleGenerateNames = async () => {
    try {
      await generateNames.mutateAsync();
      toast.success("Nombres generados según el patrón");
      refetch();
    } catch (error) {
      toast.error("Error al generar nombres");
    }
  };

  const handleUpdatePattern = async () => {
    try {
      await updateConfig.mutateAsync({ apartmentNamePattern: patternInput });
      toast.success("Patrón actualizado");
    } catch (error) {
      toast.error("Error al actualizar patrón");
    }
  };

  const handleSaveName = async (apartmentId: number) => {
    if (!editValue.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }

    try {
      await updateName.mutateAsync({ apartmentId, name: editValue });
      toast.success("Nombre actualizado");
      setEditingId(null);
      refetch();
    } catch (error) {
      toast.error("Error al actualizar nombre");
    }
  };

  const applyQuickPattern = (pattern: string) => {
    setPatternInput(pattern);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nombres de Apartamentos</h1>
        <p className="text-gray-600 mt-2">Personaliza los nombres de los apartamentos con patrones flexibles</p>
      </div>

      {/* Patrones Rápidos */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            Patrones Rápidos
          </CardTitle>
          <CardDescription>Haz clic en cualquier patrón para usarlo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {PATTERN_EXAMPLES.map((example) => (
              <Button
                key={example.pattern}
                variant="outline"
                className="justify-start h-auto flex-col items-start p-3 hover:bg-blue-100"
                onClick={() => applyQuickPattern(example.pattern)}
              >
                <p className="font-medium text-sm">{example.name}</p>
                <p className="text-xs text-gray-600">{example.description}</p>
                <code className="text-xs bg-white px-2 py-1 rounded mt-1">{example.pattern}</code>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Patrón */}
      <Card>
        <CardHeader>
          <CardTitle>Patrón de Nombres</CardTitle>
          <CardDescription>
            Define un patrón para generar nombres automáticamente. Variables disponibles: {"{piso}"}, {"{piso_nombre}"}, {"{numero}"}, {"{letra}"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Patrón Actual</Label>
            <div className="flex gap-2">
              <Input
                value={patternInput}
                onChange={(e) => setPatternInput(e.target.value)}
                placeholder="Ej: {piso_nombre}-{letra}"
              />
              <Button onClick={handleUpdatePattern} className="bg-blue-600 hover:bg-blue-700">
                Guardar Patrón
              </Button>
            </div>
          </div>

          {/* Vista Previa del Patrón */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium mb-3">Vista Previa del Patrón:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {getExamples.data && getExamples.data.length > 0 ? (
                getExamples.data.map((example, idx) => (
                  <div key={idx} className="bg-white border rounded p-2 text-center text-sm font-medium">
                    {example}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 col-span-full">Ingresa un patrón válido</p>
              )}
            </div>
          </div>

          {/* Información de Variables */}
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm font-medium mb-2">Variables Disponibles:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <code className="bg-white px-2 py-1 rounded">{"{piso}"}</code> = Número del piso (0 = Planta Baja, 1, 2, 3...)</li>
              <li>• <code className="bg-white px-2 py-1 rounded">{"{piso_nombre}"}</code> = Nombre del piso (Planta Baja, Piso 1, Piso 2...)</li>
              <li>• <code className="bg-white px-2 py-1 rounded">{"{numero}"}</code> = Número correlativo (1, 2, 3, 4, 5, 6...)</li>
              <li>• <code className="bg-white px-2 py-1 rounded">{"{letra}"}</code> = Letra (A, B, C, D, E, F...)</li>
            </ul>
          </div>

          <Button
            onClick={handleGenerateNames}
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={generateNames.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {generateNames.isPending ? "Generando..." : "Generar Todos los Nombres"}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Apartamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Apartamentos</CardTitle>
          <CardDescription>Edita los nombres individuales si lo necesitas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {apartments && apartments.length > 0 ? (
              apartments.map((apartment) => (
                <div
                  key={apartment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  {editingId === apartment.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleSaveName(apartment.id)}
                        >
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{apartment.unitName || `Apt-${apartment.apartmentNumber}`}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(apartment.id);
                            setEditValue(apartment.unitName || `Apt-${apartment.apartmentNumber}`);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600">
                        Número: {apartment.apartmentNumber}
                      </p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-gray-600 py-8 col-span-full">
                No hay apartamentos disponibles
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
