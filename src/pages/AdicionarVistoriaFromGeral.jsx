import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { RegistroGeral } from "@/api/entities";
import { VO_unidade } from "@/api/entities";
import { DisciplinaGeral } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Check, AlertTriangle, FilePlus } from "lucide-react";
import _ from 'lodash';

export default function AdicionarVistoriaFromGeral() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [registrosGerais, setRegistrosGerais] = useState([]);
    const [disciplinas, setDisciplinas] = useState([]);
    const [disciplinaPrefixMap, setDisciplinaPrefixMap] = useState({});
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [disciplinaFilter, setDisciplinaFilter] = useState("all");

    const urlParams = new URLSearchParams(location.search);
    const unidadeId = urlParams.get('unidade');
    const empreendimentoId = urlParams.get('emp');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [geraisData, disciplinasData, vistoriasExistentes] = await Promise.all([
                RegistroGeral.filter({ tipo_registro: "Vistoria de Obras" }),
                DisciplinaGeral.list("prefixo_disciplina"),
                VO_unidade.filter({ id_unidade: unidadeId })
            ]);

            const prefixMap = disciplinasData.reduce((acc, d) => {
                acc[d.descricao_disciplina] = d.prefixo_disciplina;
                return acc;
            }, {});
            setDisciplinaPrefixMap(prefixMap);

            const existingItems = new Set(vistoriasExistentes.map(v => `${prefixMap[v.disciplina_vo]}.${v.numeracao}`));
            
            const availableItems = geraisData.filter(g => {
                const itemIdentifier = `${prefixMap[g.disciplina]}.${g.numeracao}`;
                return !existingItems.has(itemIdentifier);
            });

            setRegistrosGerais(availableItems);
            setDisciplinas(disciplinasData);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    };
    
    const filteredRegistros = useMemo(() => {
        if (disciplinaFilter === 'all') return registrosGerais;
        return registrosGerais.filter(r => r.disciplina === disciplinaFilter);
    }, [registrosGerais, disciplinaFilter]);

    const handleSelect = (itemId) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedItems.size === filteredRegistros.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredRegistros.map(r => r.id)));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const itemsToAdd = registrosGerais.filter(r => selectedItems.has(r.id));
            const newVistorias = itemsToAdd.map(item => ({
                id_unidade: unidadeId,
                item_vo: `${disciplinaPrefixMap[item.disciplina] || '?'}.${item.numeracao || 0}`,
                numeracao: item.numeracao,
                descricao_vo: item.descricao_registro,
                disciplina_vo: item.disciplina,
                emissao_vo: item.emissao_registro,
                status: "Pendente",
                data_inclusao_vo: new Date().toISOString()
            }));

            if (newVistorias.length > 0) {
                await VO_unidade.bulkCreate(newVistorias);
            }
            navigate(createPageUrl(`UnidadeVistoriaObras?unidade=${unidadeId}&emp=${empreendimentoId}`));
        } catch (error) {
            console.error("Erro ao salvar novas vistorias:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    return (
        <div className="p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl(`UnidadeVistoriaObras?unidade=${unidadeId}&emp=${empreendimentoId}`))}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Adicionar Vistorias da Lista Mestra</h1>
                        <p className="text-gray-500">Selecione os itens que deseja adicionar a esta unidade.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Itens Padrão de Vistoria de Obras</CardTitle>
                            <Select value={disciplinaFilter} onValueChange={setDisciplinaFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filtrar por disciplina..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Disciplinas</SelectItem>
                                    {_.uniq(registrosGerais.map(r => r.disciplina)).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredRegistros.length === 0 ? (
                            <div className="text-center py-10">
                                <Check className="mx-auto w-12 h-12 text-green-500" />
                                <h3 className="mt-2 text-lg font-medium">Nenhum item novo para adicionar.</h3>
                                <p className="mt-1 text-sm text-gray-500">Todos os itens de vistoria padrão já foram adicionados a esta unidade.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="select-all" checked={selectedItems.size === filteredRegistros.length && filteredRegistros.length > 0} onCheckedChange={handleSelectAll} />
                                        <Label htmlFor="select-all">Selecionar Todos ({selectedItems.size}/{filteredRegistros.length})</Label>
                                    </div>
                                    <Button onClick={handleSave} disabled={saving || selectedItems.size === 0}>
                                        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : `Adicionar ${selectedItems.size} Itens`}
                                    </Button>
                                </div>
                                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                                    {Object.entries(_.groupBy(filteredRegistros, 'disciplina')).map(([disciplina, items]) => (
                                        <div key={disciplina}>
                                            <h4 className="font-bold text-blue-600 mt-4 mb-2">{disciplina}</h4>
                                            {items.map(item => (
                                                <div key={item.id} className="flex items-center p-3 border rounded-md hover:bg-gray-50">
                                                    <Checkbox id={item.id} checked={selectedItems.has(item.id)} onCheckedChange={() => handleSelect(item.id)} className="mr-4"/>
                                                    <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                                                        <p className="font-medium">{`${disciplinaPrefixMap[item.disciplina] || '?'}.${item.numeracao || 0} - ${item.descricao_registro}`}</p>
                                                        <p className="text-xs text-gray-500">{item.emissao_registro}</p>
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}