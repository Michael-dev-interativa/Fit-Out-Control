
import React, { useState } from 'react';
import { FormularioVistoria } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const novasOpcoes = [
    { texto: 'Novo', cor: 'green' },
    { texto: 'Instalado', cor: 'blue' },
    { texto: 'Não se Aplica', cor: 'gray' },
    { texto: 'Possui avarias', cor: 'red' },
    { texto: 'Ok', cor: 'green' }
];

export default function AtualizarFormularioEmMassa() {
    const navigate = useNavigate();
    const [nomeFormulario, setNomeFormulario] = useState('Relatório de Entrada de Locatário Padrão');
    const [formulario, setFormulario] = useState(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [resultado, setResultado] = useState(null);

    const buscarFormulario = async () => {
        setLoading(true);
        setFormulario(null);
        setResultado(null);
        try {
            const formularios = await FormularioVistoria.list();
            const encontrado = formularios.find(f => 
                f.nome_formulario.toLowerCase().includes(nomeFormulario.toLowerCase())
            );
            
            if (encontrado) {
                setFormulario(encontrado);
                
                // Contar perguntas do tipo select
                let totalSelect = 0;
                if (encontrado.secoes) {
                    encontrado.secoes.forEach(secao => {
                        if (secao.perguntas) {
                            totalSelect += secao.perguntas.filter(p => p.tipo === 'select').length;
                        }
                    });
                }
                
                toast.success(`Formulário encontrado! ${totalSelect} perguntas do tipo seleção.`);
            } else {
                toast.error('Formulário não encontrado. Tente outro nome.');
            }
        } catch (error) {
            console.error('Erro ao buscar formulário:', error);
            toast.error('Erro ao buscar formulário.');
        }
        setLoading(false);
    };

    const atualizarOpcoes = async () => {
        if (!formulario) return;
        
        setUpdating(true);
        setResultado(null);
        
        try {
            const secoesAtualizadas = formulario.secoes.map(secao => ({
                ...secao,
                perguntas: secao.perguntas.map(pergunta => {
                    if (pergunta.tipo === 'select') {
                        return {
                            ...pergunta,
                            opcoes: [...novasOpcoes]
                        };
                    }
                    return pergunta;
                })
            }));

            await FormularioVistoria.update(formulario.id, {
                secoes: secoesAtualizadas
            });

            // Contar perguntas atualizadas
            let totalAtualizado = 0;
            secoesAtualizadas.forEach(secao => {
                totalAtualizado += secao.perguntas.filter(p => p.tipo === 'select').length;
            });

            setResultado({
                sucesso: true,
                totalAtualizado
            });
            
            toast.success(`Formulário atualizado com sucesso! ${totalAtualizado} perguntas modificadas.`);
        } catch (error) {
            console.error('Erro ao atualizar formulário:', error);
            setResultado({
                sucesso: false,
                erro: error.message
            });
            toast.error('Erro ao atualizar formulário.');
        }
        
        setUpdating(false);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <Button variant="outline" onClick={() => navigate(createPageUrl('GerenciarFormularios'))}>
                    ← Voltar para Formulários
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5" />
                        Atualizar Opções de Formulário em Massa
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 mb-2">O que este utilitário faz:</h3>
                        <ul className="list-disc pl-5 text-sm text-blue-800 space-y-1">
                            <li>Busca o formulário pelo nome</li>
                            <li>Atualiza TODAS as perguntas do tipo "Seleção"</li>
                            <li>Aplica as novas opções: <strong>Novo, Instalado, Não se Aplica, Possui avarias, Ok</strong></li>
                            <li>Mantém todas as outras configurações intactas</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nomeFormulario">Nome do Formulário</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="nomeFormulario"
                                    value={nomeFormulario}
                                    onChange={(e) => setNomeFormulario(e.target.value)}
                                    placeholder="Digite o nome do formulário..."
                                    className="flex-1"
                                />
                                <Button onClick={buscarFormulario} disabled={loading || !nomeFormulario.trim()}>
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {formulario && (
                            <Card className="bg-green-50 border-green-200">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-green-900">Formulário Encontrado:</h4>
                                            <p className="text-sm text-green-800 mt-1">{formulario.nome_formulario}</p>
                                            <p className="text-sm text-green-700 mt-2">
                                                {formulario.secoes?.length || 0} seções •{' '}
                                                {formulario.secoes?.reduce((total, secao) => 
                                                    total + (secao.perguntas?.filter(p => p.tipo === 'select').length || 0), 0
                                                )} perguntas de seleção serão atualizadas
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-green-200">
                                        <h5 className="font-medium text-green-900 mb-2">Novas Opções:</h5>
                                        <div className="flex flex-wrap gap-2">
                                            {novasOpcoes.map((opcao, idx) => (
                                                <span
                                                    key={idx}
                                                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                        opcao.cor === 'green' ? 'bg-green-100 text-green-800' :
                                                        opcao.cor === 'blue' ? 'bg-blue-100 text-blue-800' :
                                                        opcao.cor === 'gray' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}
                                                >
                                                    {opcao.texto}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={atualizarOpcoes}
                                        disabled={updating}
                                        className="w-full mt-4 bg-green-600 hover:bg-green-700"
                                    >
                                        {updating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Atualizando...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Atualizar Formulário
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {resultado && (
                            <Card className={resultado.sucesso ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-3">
                                        {resultado.sucesso ? (
                                            <>
                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-semibold text-green-900">Atualização Concluída!</h4>
                                                    <p className="text-sm text-green-800 mt-1">
                                                        {resultado.totalAtualizado} perguntas foram atualizadas com as novas opções.
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-semibold text-red-900">Erro na Atualização</h4>
                                                    <p className="text-sm text-red-800 mt-1">{resultado.erro}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
