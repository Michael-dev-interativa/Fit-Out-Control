import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function InfoGeral({ empreendimento, theme }) {
    const isDark = theme === 'dark';
    const logoUrl = isDark 
    ? "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png"
    : "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/f1e898ee3_logo_Interativa_versao_final_sem_fundo_0002.png";

    return (
        <Card className={`w-full ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <CardContent className="p-0">
                {/* Header com logo, título e OS */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b p-3 sm:p-4 gap-3">
                    <img src={logoUrl} alt="Logo Interativa" className="h-10 sm:h-14"/>
                    <div className="text-left sm:text-right flex-1">
                        <p className={`font-bold text-base sm:text-lg md:text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {empreendimento?.nome_empreendimento || 'Nome do Empreendimento'}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            OS: {empreendimento?.os_number || 'N/A'}
                        </p>
                    </div>
                </div>
                
                {/* Informações centralizadas em fundo azul claro */}
                <div className="p-3 sm:p-4 md:p-6 text-center text-gray-800" style={{ backgroundColor: '#e0e8f0' }}>
                    <div className="space-y-1 sm:space-y-2">
                        <p className="text-xs sm:text-sm md:text-base"><strong>Nome:</strong> {empreendimento?.nome_empreendimento || 'N/A'}</p>
                        <p className="text-xs sm:text-sm md:text-base"><strong>Endereço:</strong> {empreendimento?.endereco_empreendimento || 'N/A'}</p>
                        <p className="text-xs sm:text-sm md:text-base"><strong>Ano de entrega do empreendimento:</strong> {empreendimento?.ano_entrega || 'N/A'}</p>
                        <p className="text-xs sm:text-sm md:text-base"><strong>Idade do empreendimento:</strong> {empreendimento?.idade_imovel || 'N/A'} anos</p>
                        <p className="text-xs sm:text-sm md:text-base"><strong>Estilo arquitetônico do empreendimento:</strong> {empreendimento?.estilo_arquitetonico || 'N/A'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}