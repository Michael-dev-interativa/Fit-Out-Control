import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X } from 'lucide-react';

export default function TabelaInformacoesTecnicas({ informacoes, theme }) {
    const isDark = theme === 'dark';
    
    if (!informacoes || informacoes.length === 0) return null;
    
    // Agrupar por 'documento_informacao' para criar a estrutura desejada
    const groupedInfo = informacoes.reduce((acc, item) => {
        const key = item.documento_informacao;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {});

    return (
        <Card className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className={`${isDark ? 'hover:bg-gray-700' : ''}`}>
                            <TableHead 
                                className={`font-bold text-white text-center p-3 w-32 ${isDark ? 'bg-gray-700' : 'bg-gray-800'}`}
                                style={{ backgroundColor: isDark ? '#374151' : '#1f2937' }}
                            >
                                ANO DE ENTREGA DO EMPREENDIMENTO
                            </TableHead>
                            <TableHead 
                                className={`font-bold text-white text-center p-3 w-40 ${isDark ? 'bg-gray-700' : 'bg-gray-800'}`}
                                style={{ backgroundColor: isDark ? '#374151' : '#1f2937' }}
                            >
                                DOCUMENTO / INFORMAÇÃO
                            </TableHead>
                            <TableHead 
                                className={`font-bold text-white text-center p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-800'}`}
                                style={{ backgroundColor: isDark ? '#374151' : '#1f2937' }}
                            >
                                DESCRITIVO
                            </TableHead>
                            <TableHead 
                                className={`font-bold text-white text-center p-3 w-32 ${isDark ? 'bg-gray-700' : 'bg-gray-800'}`}
                                style={{ backgroundColor: isDark ? '#374151' : '#1f2937' }}
                            >
                                ANO DE EMISSÃO/VALIDADE
                            </TableHead>
                            <TableHead 
                                className={`font-bold text-white text-center p-3 w-24 ${isDark ? 'bg-gray-700' : 'bg-gray-800'}`}
                                style={{ backgroundColor: isDark ? '#374151' : '#1f2937' }}
                            >
                                STATUS
                            </TableHead>
                            <TableHead 
                                className={`font-bold text-white text-center p-3 ${isDark ? 'bg-gray-700' : 'bg-gray-800'}`}
                                style={{ backgroundColor: isDark ? '#374151' : '#1f2937' }}
                            >
                                OBS
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(groupedInfo).map(([docInfo, items], groupIndex) => {
                            const descritivos = items.flatMap(item => (item.descritivos || []).map(desc => ({ ...desc, ano_entrega_item: item.ano_entrega_item, documento_informacao: item.documento_informacao })));

                            return descritivos.map((desc, descIndex) => (
                                <TableRow key={`${groupIndex}-${descIndex}`} className={`${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                    {descIndex === 0 && (
                                        <>
                                            <TableCell 
                                                rowSpan={descritivos.length} 
                                                className="font-medium text-center p-3 border-r vertical-center"
                                                style={{ 
                                                    backgroundColor: isDark ? '#475569' : '#64748b', 
                                                    color: 'white',
                                                    verticalAlign: 'middle'
                                                }}
                                            >
                                                {desc.ano_entrega_item}
                                            </TableCell>
                                            <TableCell 
                                                rowSpan={descritivos.length} 
                                                className="font-medium text-center p-3 border-r vertical-center"
                                                style={{ 
                                                    backgroundColor: isDark ? '#4b5563' : '#e5e7eb',
                                                    verticalAlign: 'middle'
                                                }}
                                            >
                                                {desc.documento_informacao}
                                            </TableCell>
                                        </>
                                    )}
                                    
                                    {desc.documento_informacao === 'Informações Técnicas' ? (
                                        <>
                                            <TableCell className="p-3 border-r">{desc.area_descritivo}</TableCell>
                                            <TableCell className="p-3 border-r">{desc.informacao_descritivo}</TableCell>
                                            <TableCell className="p-3 border-r text-center">-</TableCell>
                                        </>
                                    ) : (
                                        <>
                                            <TableCell className="p-3 border-r">{desc.descricao}</TableCell>
                                            <TableCell className="p-3 border-r text-center">{desc.ano_emissao_validade}</TableCell>
                                            <TableCell className="p-3 border-r text-center">
                                                {desc.status_ok ? 
                                                    <span className="inline-flex items-center gap-1 text-green-600 font-medium"><Check size={16}/> OK</span> : 
                                                    <span className="inline-flex items-center gap-1 text-red-600 font-medium"><X size={16}/> Pendente</span>
                                                }
                                            </TableCell>
                                        </>
                                    )}
                                    <TableCell className="p-3">{desc.obs}</TableCell>
                                </TableRow>
                            ));
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}