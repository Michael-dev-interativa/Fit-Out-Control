
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function UnidadeHeader({ empreendimento, unidade, stats, theme = 'light', showBackButton = false, backToUrl = '' }) {
  const defaultImage = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=300&fit=crop";
  const isDark = theme === 'dark';
  
  const completionPercentage = stats?.total > 0 
    ? Math.round((stats.concluido / stats.total) * 100) 
    : 0;

  return (
    <Card className={`overflow-hidden ${isDark ? 'bg-gray-800' : ''}`}>
      <div className="relative h-48">
        <img
          src={empreendimento?.foto_empreendimento || defaultImage}
          alt={empreendimento?.nome_empreendimento}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        {showBackButton && backToUrl && (
             <Link to={backToUrl} className="absolute top-4 left-4">
                <Button variant="outline" size="icon" className="bg-black/20 text-white border-white/50 hover:bg-black/50">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </Link>
        )}
        <div className="absolute inset-0 flex items-end p-4 md:p-6">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm opacity-90">{empreendimento?.nome_empreendimento}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold mb-1">{unidade?.unidade_empreendimento}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{unidade?.cliente_unidade}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Cliente: {empreendimento?.cli_empreendimento}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {stats && (
        <CardContent className={`p-4 md:p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-blue-900/50' : 'bg-blue-50'}`}>
              <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className={`text-xl font-bold ${isDark ? 'text-blue-200' : 'text-blue-900'}`}>{stats.total}</p>
              <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Total</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-orange-900/50' : 'bg-orange-50'}`}>
              <FileText className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className={`text-xl font-bold ${isDark ? 'text-orange-200' : 'text-orange-900'}`}>{stats.pendente}</p>
              <p className={`text-sm ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Pendente</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-purple-900/50' : 'bg-purple-50'}`}>
              <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className={`text-xl font-bold ${isDark ? 'text-purple-200' : 'text-purple-900'}`}>{stats.andamento}</p>
              <p className={`text-sm ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Andamento</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${isDark ? 'bg-green-900/50' : 'bg-green-50'}`}>
              <FileText className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className={`text-xl font-bold ${isDark ? 'text-green-200' : 'text-green-900'}`}>{stats.concluido}</p>
              <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>Concluído</p>
            </div>
            <div className={`text-center p-4 rounded-lg col-span-2 lg:col-span-1 ${isDark ? 'bg-gray-700' : 'bg-gradient-to-r from-blue-50 to-green-50'}`}>
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent mb-1">
                {completionPercentage}%
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Progresso</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
