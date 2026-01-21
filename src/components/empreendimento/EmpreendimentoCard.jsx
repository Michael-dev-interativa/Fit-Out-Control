import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { Empreendimento } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, Eye, Edit, Trash2 } from "lucide-react";

export default function EmpreendimentoCard({ empreendimento, onUpdate }) {
  const navigate = useNavigate();
  const defaultImage = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop";
  const [currentUser, setCurrentUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resolveImageUrl = (url) => {
    const v = (url ?? "").toString().trim();
    if (!v) return defaultImage;
    if (v.startsWith("blob:")) return defaultImage;
    if (/^https?:\/\//i.test(v)) return v;
    return defaultImage;
  };

  // Função melhorada para validar IDs
  const isValidId = (id) => {
    if (id === null || id === undefined) return false;
    const cleanId = String(id).trim();
    if (!cleanId || cleanId === '-' || cleanId === 'null' || cleanId === 'undefined' || cleanId === 'NaN') return false;
    if (/^\d+$/.test(cleanId)) {
      return Number(cleanId) > 0;
    }
    return cleanId.length >= 8;
  };

  const isEmpreendimentoValid = isValidId(empreendimento?.id);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const handleEditClick = (e) => {
    e.preventDefault();
    if (!isEmpreendimentoValid) {
      console.warn("Tentativa de editar empreendimento com ID inválido:", empreendimento?.id);
      return;
    }
    navigate(createPageUrl(`EditarEmpreendimento?empreendimentoId=${empreendimento.id}`));
  };

  const handleDelete = async () => {
    if (!isEmpreendimentoValid) {
      console.warn("Tentativa de deletar empreendimento com ID inválido:", empreendimento?.id);
      return;
    }

    setIsDeleting(true);
    try {
      await Empreendimento.delete(empreendimento.id);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erro ao deletar empreendimento:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewClick = (e) => {
    e.preventDefault();

    if (!isEmpreendimentoValid) {
      console.warn("Tentativa de visualizar empreendimento com ID inválido:", empreendimento?.id);
      return;
    }

    navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimento.id}`));
  };

  // Não renderizar o card se o empreendimento for inválido
  if (!empreendimento || !isEmpreendimentoValid) {
    console.warn("EmpreendimentoCard - Empreendimento inválido não será renderizado:", empreendimento);
    return null;
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="relative h-48 overflow-hidden">
        <img
          src={resolveImageUrl(empreendimento.foto_empreendimento)}
          alt={empreendimento.nome_empreendimento}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => { e.currentTarget.src = defaultImage; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 text-white">
          <h3 className="font-bold text-lg">{empreendimento.nome_empreendimento}</h3>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Cliente:</span>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700">
              {empreendimento.cli_empreendimento}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleViewClick}>
              <Eye className="w-4 h-4 mr-2" />
              Acessar
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleEditClick}
              title="Editar empreendimento"
            >
              <Edit className="w-4 h-4" />
            </Button>
            {currentUser?.role === 'admin' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon"
                    title="Apagar empreendimento"
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja apagar o empreendimento "{empreendimento.nome_empreendimento}"? Esta ação é irreversível e apagará todas as unidades e registros associados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeleting ? "Apagando..." : "Apagar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}