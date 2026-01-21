import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TabelaContatos({ contatos, theme }) {
    const isDark = theme === 'dark';
    
    if (!contatos || contatos.length === 0) return null;

    return (
        <Card className={`w-full ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className={`${isDark ? 'hover:bg-gray-700' : ''}`}>
                                <TableHead 
                                    className={`font-bold text-white text-center p-2 text-xs sm:text-sm ${isDark ? 'bg-gray-700' : 'bg-gray-800'}`}
                                    style={{ backgroundColor: isDark ? '#374151' : '#1f2937' }}
                                >
                                    PROPRIETÁRIO HIRE
                                </TableHead>
                                <TableHead 
                                    className={`font-bold text-white text-center p-2 text-xs sm:text-sm ${isDark ? 'bg-gray-700' : 'bg-gray-800'}`}
                                    style={{ backgroundColor: isDark ? '#374151' : '#1f2937' }}
                                >
                                    NOME
                                </TableHead>
                                <TableHead 
                                    className={`font-bold text-white text-center p-2 text-xs sm:text-sm ${isDark ? 'bg-gray-700' : 'bg-gray-800'}`}
                                    style={{ backgroundColor: isDark ? '#374151' : '#1f2937' }}
                                >
                                    TELEFONE
                                </TableHead>
                                <TableHead 
                                    className={`font-bold text-white text-center p-2 text-xs sm:text-sm ${isDark ? 'bg-gray-700' : 'bg-gray-800'}`}
                                    style={{ backgroundColor: isDark ? '#374151' : '#1f2937' }}
                                >
                                    EMAIL
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contatos.map((contato, index) => (
                                <TableRow key={index} className={`${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                    <TableCell 
                                        className="font-medium text-center p-2 text-xs sm:text-sm"
                                        style={{ backgroundColor: isDark ? '#374151' : '#334155', color: 'white' }}
                                    >
                                        {contato.tipo}
                                    </TableCell>
                                    <TableCell className={`text-center p-2 text-xs sm:text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {contato.nome}
                                    </TableCell>
                                    <TableCell className={`text-center p-2 text-xs sm:text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {contato.telefone}
                                    </TableCell>
                                    <TableCell className={`text-center p-2 text-xs sm:text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        <a href={`mailto:${contato.email}`} className="text-blue-600 hover:underline break-all">
                                            {contato.email}
                                        </a>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}