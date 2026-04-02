import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { UnidadeEmpreendimento } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Eye, Loader2, Trash2 } from "lucide-react";
import StatusChart from "./StatusChart";
import EditarUnidadeDialog from "./EditarUnidadeDialog";

const translations = {
  pt: {
    area: "Área",
    access: "Acessar",
    client: "Cliente",
    delete: "Excluir",
    deleting: "Excluindo...",
    deleteConfirm: "Deseja excluir esta unidade? Esta ação não pode ser desfeita.",
    deleteError: "Não foi possível excluir a unidade."
  },
  en: {
    area: "Area",
    access: "Access",
    client: "Client",
    delete: "Delete",
    deleting: "Deleting...",
    deleteConfirm: "Do you want to delete this unit? This action cannot be undone.",
    deleteError: "Could not delete the unit."
  }
};

export default function UnidadeCard({ unidade, stats, empreendimentoId, language, theme }) {
  const t = translations[language] ?? translations.pt;
  const isDark = theme === 'dark';
  const [deleting, setDeleting] = useState(false);

  const isValidId = (id) => {
    if (id === null || id === undefined) return false;
    const cleanId = String(id).trim();
    // Válido se não é vazio, nem marcador inválido ("-", "null", "undefined").
    // Remove a exigência de comprimento mínimo para permitir IDs numéricos curtos.
    const invalidMarkers = ['-', 'null', 'undefined'];
    if (cleanId === '' || invalidMarkers.includes(cleanId.toLowerCase())) return false;
    return true;
  };

  const isLinkValid = isValidId(unidade?.id) && isValidId(empreendimentoId);

  if (!isLinkValid) {
    console.error("CRITICAL: UnidadeCard renderizado com IDs inválidos.", {
      unidadeId: unidade?.id,
      empreendimentoId: empreendimentoId,
      unidade: unidade,
    });
  }

  const linkToUnidade = isLinkValid
    ? createPageUrl(
      `Unidade?unidadeId=${encodeURIComponent(unidade.id)}&empreendimentoId=${encodeURIComponent(empreendimentoId)}`
    )
    : '#';

  const handleAccessClick = (e) => {
    if (!isLinkValid) {
      e.preventDefault();
      console.error("Tentativa de navegar com IDs inválidos bloqueada:", {
        unidadeId: unidade?.id,
        empreendimentoId: empreendimentoId
      });
      alert("Erro: Não foi possível carregar os detalhes desta unidade devido a dados incompletos. Por favor, recarregue a página.");
    }
  };

  const handleDeleteClick = async () => {
    if (!isValidId(unidade?.id)) return;
    if (!window.confirm(t.deleteConfirm)) return;

    try {
      setDeleting(true);
      await UnidadeEmpreendimento.delete(unidade.id);
      window.location.reload();
    } catch (error) {
      console.error("Erro ao excluir unidade:", error);
      window.alert(t.deleteError);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className={`flex flex-col h-full ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
          <Building2 className="w-5 h-5" />
          {unidade?.unidade_empreendimento || 'Unidade'}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-grow space-y-4">
        <div className="space-y-2">
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <strong>{t.client}:</strong> {unidade?.cliente_unidade || 'N/A'}
          </p>
          {unidade?.metragem_unidade && (
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <strong>{t.area}:</strong> {unidade.metragem_unidade}m²
            </p>
          )}
        </div>

        {stats && <StatusChart stats={stats} theme={theme} />}
      </CardContent>

      <CardFooter className="flex gap-2">
        <Link to={linkToUnidade} className="flex-1" onClick={handleAccessClick}>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={!isLinkValid}
          >
            <Eye className="w-4 h-4 mr-2" />

        <Button
          type="button"
          variant="outline"
          onClick={handleDeleteClick}
          disabled={!isValidId(unidade?.id) || deleting}
          className={`px-3 ${isDark ? 'border-red-800 text-red-300 hover:bg-red-950' : 'text-red-600 hover:text-red-700'}`}
          title={t.delete}
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </Button>
            {t.access}
          </Button>
        </Link>

        <EditarUnidadeDialog
          unidade={unidade}
          empreendimentoId={empreendimentoId}
          onSuccess={() => window.location.reload()}
          language={language}
          theme={theme}
          isDataValid={isLinkValid}
        />
      </CardFooter>
    </Card>
  );
}