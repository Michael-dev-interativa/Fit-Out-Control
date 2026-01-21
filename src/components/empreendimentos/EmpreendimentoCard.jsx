
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Eye, Edit, Users, Trash2 } from "lucide-react";
import { Empreendimento } from "@/api/entities";
import { User } from "@/api/entities";
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

// Validação de ID compatível com banco: aceita inteiros positivos e strings não vazias
const isValidId = (id) => {
  if (id === null || id === undefined) return false;
  const cleanId = String(id).trim();
  if (!cleanId || cleanId === '-' || cleanId === 'null' || cleanId === 'undefined' || cleanId === 'NaN') return false;
  // Aceita IDs numéricos positivos (ex.: "1", "2")
  if (/^\d+$/.test(cleanId)) {
    return Number(cleanId) > 0;
  }
  // Para IDs não numéricos (UUID/ULID), exige pelo menos 8 caracteres
  return cleanId.length >= 8;
};

export default function EmpreendimentoCard({ empreendimento, onUpdate }) {
  const navigate = useNavigate();
  const defaultImage = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop";
  const [currentUser, setCurrentUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Resolve uma URL de imagem segura: evita blob: e strings inválidas
  const resolveImageUrl = (url) => {
    const v = (url ?? "").toString().trim();
    if (!v) return defaultImage;
    if (v.startsWith("blob:")) return defaultImage;
    if (/^https?:\/\//i.test(v)) return v;
    return defaultImage;
  };

  const isEmpreendimentoValid = isValidId(empreendimento?.id);

  // Debug log melhorado
  React.useEffect(() => {
    if (empreendimento) {
      if (!isEmpreendimentoValid) {
        console.error("EmpreendimentoCard - ID inválido detectado:", {
          id: empreendimento.id,
          nome: empreendimento.nome_empreendimento,
          tipo: typeof empreendimento.id,
          rawEmpreendimento: empreendimento // Log the whole object for context
        });
      }
    }
  }, [empreendimento, isEmpreendimentoValid]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        console.error("Failed to fetch user", e);
      }
    };
    fetchUser();
  }, []);

  const handleEditClick = () => {
    if (!isEmpreendimentoValid) {
      console.warn("Tentativa de editar empreendimento com ID inválido:", empreendimento?.id);
      return;
    }
    navigate(createPageUrl(`EditarEmpreendimento?empreendimentoId=${empreendimento.id}`));
  };

  const handleDelete = async () => {
    if (!isEmpreendimentoValid) {
      console.warn("Tentativa de apagar empreendimento com ID inválido:", empreendimento?.id);
      return;
    }

    setIsDeleting(true);
    try {
      // Aqui você precisaria de uma lógica mais complexa para apagar em cascata:
      // 1. Listar todas as unidades do empreendimento.
      // 2. Para cada unidade, listar todos os registros e documentos e apagá-los.
      // 3. Apagar a unidade.
      // 4. Depois de apagar todas as unidades, apagar o empreendimento.
      // A API atual do .delete() não suporta deleção em cascata.
      // Por enquanto, apenas o empreendimento será apagado.
      await Empreendimento.delete(empreendimento.id);
      onUpdate();
    } catch (error) {
      console.error("Falha ao apagar empreendimento:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Não renderizar o card se o empreendimento for inválido
  if (!empreendimento || !isEmpreendimentoValid) {
    console.warn("EmpreendimentoCard - Empreendimento inválido não será renderizado:", {
      empreendimentoName: empreendimento?.nome_empreendimento, // Renamed for clarity
      id: empreendimento?.id,
      isValid: isEmpreendimentoValid
    });
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
            <Link
              to={createPageUrl(`Empreendimento?empreendimentoId=${empreendimento.id}`)}
              className="flex-1"
            >
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Eye className="w-4 h-4 mr-2" />
                Acessar
              </Button>
            </Link>
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
