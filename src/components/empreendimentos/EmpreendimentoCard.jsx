import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, MapPin, Square, Trash2 } from "lucide-react";
import { Empreendimento } from "@/api/entities";
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

const STATUS_CONFIG = {
  'Execução': {
    cardBg: '#142035',
    badgeClass: 'bg-sky-500 text-white',
    progressColor: '#38bdf8',
    border: 'none',
  },
  'Projeto': {
    cardBg: '#0d2618',
    badgeClass: 'bg-emerald-600 text-white',
    progressColor: '#34d399',
    border: 'none',
  },
  'Pendência': {
    cardBg: '#2a0e0e',
    badgeClass: 'bg-rose-600 text-white',
    progressColor: '#fb7185',
    border: '2px solid #991b1b',
  },
  'Início': {
    cardBg: '#1a2d10',
    badgeClass: 'bg-amber-500 text-white',
    progressColor: '#fbbf24',
    border: 'none',
  },
};

const DEFAULT_CONFIG = {
  cardBg: '#1a2435',
  badgeClass: 'bg-slate-500 text-white',
  progressColor: '#94a3b8',
  border: 'none',
};

const isValidId = (id) => {
  if (id === null || id === undefined) return false;
  const cleanId = String(id).trim();
  if (!cleanId || cleanId === '-' || cleanId === 'null' || cleanId === 'undefined' || cleanId === 'NaN') return false;
  if (/^\d+$/.test(cleanId)) return Number(cleanId) > 0;
  return cleanId.length >= 8;
};

const formatDeadline = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
};

const getInitials = (str) => {
  if (!str) return '?';
  const parts = str.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return str.slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-500', 'bg-cyan-500',
];

export default function EmpreendimentoCard({ empreendimento, onUpdate }) {
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try {
      const role = (localStorage.getItem('appRole') || '').toLowerCase();
      return role ? { role } : null;
    } catch { return null; }
  }, []);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!empreendimento || !isValidId(empreendimento?.id)) return null;

  const status = empreendimento.status_empreendimento || 'Projeto';
  const config = STATUS_CONFIG[status] || DEFAULT_CONFIG;
  const percentual = Math.min(100, Math.max(0, empreendimento.percentual_conclusao ?? 0));
  const deadline = formatDeadline(empreendimento.termino_obra_previsto);
  const address = empreendimento.endereco_empreendimento;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await Empreendimento.delete(empreendimento.id);
      onUpdate();
    } catch (error) {
      console.error("Falha ao apagar empreendimento:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:opacity-95 hover:scale-[1.01]"
      style={{
        backgroundColor: config.cardBg,
        border: config.border,
        minHeight: '220px',
      }}
    >
      <div className="p-5 flex-1 flex flex-col gap-3">
        {/* Status badge */}
        <div className="flex justify-end">
          <span className={`${config.badgeClass} text-xs font-semibold px-3 py-1 rounded-full`}>
            {status}
          </span>
        </div>

        {/* Name + Client */}
        <div className="-mt-1">
          <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">
            {empreendimento.nome_empreendimento}
          </h3>
          <p className="text-white/55 text-sm mt-1 truncate">
            {empreendimento.cli_empreendimento || '—'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex-1 rounded-full h-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <div
              className="rounded-full h-1.5 transition-all duration-500"
              style={{ width: `${percentual}%`, backgroundColor: config.progressColor }}
            />
          </div>
          <span className="text-white/60 text-xs font-medium w-8 text-right shrink-0">{percentual}%</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-0.5">
          {deadline && (
            <div className="flex items-center gap-1.5 text-white/60 text-xs">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{deadline}</span>
            </div>
          )}
          {address && (
            <div className="flex items-center gap-1.5 text-white/60 text-xs">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 pt-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Admin delete */}
          {currentUser?.role === 'admin' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="text-white/30 hover:text-rose-400 transition-colors p-1"
                  title="Apagar empreendimento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja apagar "{empreendimento.nome_empreendimento}"? Esta ação é irreversível.
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

        <Link
          to={createPageUrl(`Empreendimento?empreendimentoId=${empreendimento.id}`)}
          className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
        >
          <Square className="w-3.5 h-3.5" />
          Acessar
        </Link>
      </div>
    </div>
  );
}
