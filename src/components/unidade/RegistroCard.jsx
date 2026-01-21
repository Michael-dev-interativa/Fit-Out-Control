import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit } from 'lucide-react';

const translations = {
    pt: {
        edit: "Editar",
        description: "Descrição",
        comment: "Comentário",
        reply: "Réplica",
        finalReply: "Tréplica",
        status: "Status"
    },
    en: {
        edit: "Edit",
        description: "Description",
        comment: "Comment",
        reply: "Reply",
        finalReply: "Final Reply",
        status: "Status"
    }
};

export default function RegistroCard({ registro, empreendimentoId, language = 'pt', theme = 'light' }) {
    const t = translations[language];
    const isDark = theme === 'dark';

    const getStatusColor = (status) => {
        switch(status) {
            case "Pendente": return "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300";
            case "Em Andamento": return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
            case "Concluído": return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
            default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
        }
    };
    
    const canEdit = registro && registro.id && empreendimentoId;

    return (
        <Card className={`${isDark ? 'bg-gray-800 border-gray-700' : ''} transition-shadow hover:shadow-md`}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{registro.item_registro}</h4>
                        {registro.descricao_registro && <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className="font-semibold">{t.description}:</span> {registro.descricao_registro}</p>}
                        {registro.comentario_registro && <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className="font-semibold">{t.comment}:</span> {registro.comentario_registro}</p>}
                        {registro.replica_registro && <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className="font-semibold">{t.reply}:</span> {registro.replica_registro}</p>}
                        {registro.treplica_registro && <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className="font-semibold">{t.finalReply}:</span> {registro.treplica_registro}</p>}
                        <div className="flex items-center gap-2 pt-2">
                            <span className={`font-semibold text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{t.status}:</span>
                            <Badge className={getStatusColor(registro.status)}>{registro.status}</Badge>
                        </div>
                    </div>
                    <Link to={canEdit ? createPageUrl(`EditarRegistro?registroId=${registro.id}&tipo=${registro.tipo_registro}&empreendimentoId=${empreendimentoId}`) : '#'}>
                        <Button variant="outline" size="icon" disabled={!canEdit} className={isDark ? 'border-gray-600 hover:bg-gray-700' : ''}>
                            <Edit className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}