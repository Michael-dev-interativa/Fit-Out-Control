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
        status: "Status",
        discipline: "Disciplina",
        issue: "Emissão"
    },
    en: {
        edit: "Edit",
        description: "Description",
        comment: "Comment",
        reply: "Reply",
        finalReply: "Final Reply",
        status: "Status",
        discipline: "Discipline",
        issue: "Issue"
    }
};

export default function AnaliseCard({ analise, empreendimentoId, onUpdate, language = 'pt', theme = 'light' }) {
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
    
    const canEdit = analise && analise.id && empreendimentoId;

    return (
        <Card className={`${isDark ? 'bg-gray-800 border-gray-700' : ''} transition-shadow hover:shadow-md`}>
            <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{analise.item_ap}</h4>
                        {analise.descricao_ap && <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className="font-semibold">{t.description}:</span> {analise.descricao_ap}</p>}
                        {analise.comentario_ap && <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className="font-semibold">{t.comment}:</span> {analise.comentario_ap}</p>}
                        {analise.replica_ap && <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className="font-semibold">{t.reply}:</span> {analise.replica_ap}</p>}
                        {analise.treplica_ap && <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className="font-semibold">{t.finalReply}:</span> {analise.treplica_ap}</p>}
                        
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                             <Badge variant="outline" className={isDark ? 'border-gray-600' : ''}><span className="font-semibold mr-1">{t.status}:</span> {analise.status}</Badge>
                             <Badge variant="secondary" className={isDark ? 'bg-gray-700' : ''}><span className="font-semibold mr-1">{t.discipline}:</span> {analise.disciplina_ap}</Badge>
                             <Badge variant="secondary" className={isDark ? 'bg-gray-700' : ''}><span className="font-semibold mr-1">{t.issue}:</span> {analise.emissao_ap}</Badge>
                        </div>
                    </div>
                    <Link to={canEdit ? createPageUrl(`EditarRegistro?id=${analise.id}&tipo=Análise de Projetos&empreendimentoId=${empreendimentoId}`) : '#'}>
                        <Button variant="outline" size="icon" disabled={!canEdit} className={isDark ? 'border-gray-600 hover:bg-gray-700' : ''}>
                            <Edit className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}