
import React, { useState, useEffect } from "react";
import { RegistroUnidade } from "@/api/entities";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const statusIcons = {
  "Pendente": AlertTriangle,
  "Em Andamento": Clock,
  "Concluído": CheckCircle
};

const statusColors = {
  "Pendente": "bg-orange-100 text-orange-700",
  "Em Andamento": "bg-blue-100 text-blue-700", 
  "Concluído": "bg-green-100 text-green-700"
};

export default function RecentActivity({ theme = 'light' }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDark = theme === 'dark';

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    try {
      const data = await RegistroUnidade.filter(
        { status: "!Obsoleto" }, 
        "-created_date", 
        5
      ).catch(err => {
        console.error("Erro ao carregar atividade recente:", err);
        return [];
      });
      
      setRegistros(data);
    } catch (error) {
      console.error("Erro ao carregar atividade recente:", error);
      setRegistros([]); // Ensure state is cleared on error
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
            <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className="flex-1">
              <div className={`h-4 rounded mb-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <div className={`h-3 rounded w-2/3 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {registros.length === 0 ? (
        <div className="text-center py-8">
          <FileText className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Nenhuma atividade recente</p>
        </div>
      ) : (
        registros.map((registro) => {
          const StatusIcon = statusIcons[registro.status] || FileText;
          return (
            <div key={registro.id} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <StatusIcon className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`} title={registro.item_registro}>
                  {registro.item_registro}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {format(new Date(registro.created_date), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>
              <Badge className={statusColors[registro.status] || (isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700")}>
                {registro.status}
              </Badge>
            </div>
          );
        })
      )}
    </div>
  );
}
