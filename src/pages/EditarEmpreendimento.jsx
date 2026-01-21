import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Empreendimento } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { createPageUrl } from '@/utils';
import { addDays, format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Building2, Users, Calendar, Phone, HardHat, Layers, Home, X, Info, MapPin, AlertTriangle, FileText } from 'lucide-react';
import TabelaContatos from '../components/empreendimento/TabelaContatos';

// Translation object based on the outline and existing labels
const t = {
    // Labels inferred from existing code or common usage for the main card title and fields
    editProject: "Editar Empreendimento",
    projectName: "Nome do Empreendimento",
    client: "Cliente",
    projectAddress: "Endereço",
    osNumber: "Contrato (OS) Nº",
    projectAcronym: "Sigla da Obra",
    contractStartDate: "Data de Início do Contrato",
    contractEndDate: "Data de Término do Contrato",
    contractTermDays: "Prazo Contratual (dias)",
    deliveryYear: "Ano de Entrega", // New field label

    // Specific new labels from the outline
    valorContratual: "Valor Contratual",
    terminoObraPrevisto: "Término da Obra (Previsto)",
    dataSemEntrega: "Data Sem Entrega",
};

export default function EditarEmpreendimento() {
    const location = useLocation();
    const navigate = useNavigate();
    const [empreendimento, setEmpreendimento] = useState(null);
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [error, setError] = useState(null);

    const isValidId = (id) => {
        if (id === undefined || id === null) return false;
        const cleanId = String(id).trim();
        if (cleanId === '' || cleanId === '-') return false;
        // Aceita IDs numéricos positivos (Postgres) e strings não numéricas
        if (/^\d+$/.test(cleanId)) {
            return parseInt(cleanId, 10) > 0;
        }
        // Para IDs não numéricos, mantenha a validação básica
        return cleanId.length >= 1;
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const empreendimentoId = params.get('empreendimentoId');

        if (!isValidId(empreendimentoId)) {
            setError(`ID do empreendimento inválido: "${empreendimentoId}"`);
            setLoading(false);
            return;
        }

        const loadEmpreendimento = async () => {
            try {
                const data = await Empreendimento.get(empreendimentoId);
                if (data) {
                    setEmpreendimento(data);
                    const correctDate = (dateStr) => {
                        if (!dateStr) return '';
                        // Treat the date string as UTC to prevent timezone shifts
                        const date = new Date(dateStr);
                        const year = date.getUTCFullYear();
                        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                        const day = String(date.getUTCDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    };

                    setFormData({
                        ...data,
                        fotos_empreendimento: data.fotos_empreendimento || [],
                        contatos_proprietario: data.contatos_proprietario || [],
                        informacoes_tecnicas: data.informacoes_tecnicas || [],
                        // Initialize existing contract fields if they don't exist
                        os_number: data.os_number || '',
                        prazo_contratual_dias: data.prazo_contratual_dias || '',
                        data_inicio_contrato: correctDate(data.data_inicio_contrato),
                        data_termino_contrato: correctDate(data.data_termino_contrato),
                        // Existing field for report cover footer
                        texto_capa_rodape: data.texto_capa_rodape || '',
                        // New fields for weekly report header from the outline
                        sigla_obra: data.sigla_obra || '',
                        termino_obra_previsto: correctDate(data.termino_obra_previsto),
                        data_sem_entrega: correctDate(data.data_sem_entrega),
                        valor_contratual: data.valor_contratual || '',
                        ano_entrega: data.ano_entrega || '',
                    });
                } else {
                    setError(`Empreendimento com ID "${empreendimentoId}" não encontrado.`);
                }
            } catch (err) {
                console.error("Erro ao carregar empreendimento:", err);
                setError("Não foi possível carregar os dados do empreendimento.");
            } finally {
                setLoading(false);
            }
        };

        loadEmpreendimento();
    }, [location.search]);

    // This useEffect calculates 'prazo_contratual_dias' based on 'data_inicio_contrato' and 'data_termino_contrato'.
    // 'prazo_contratual_dias' is now a derived field.
    useEffect(() => {
        if (formData && formData.data_inicio_contrato && formData.data_termino_contrato) {
            try {
                // Ensure dates are parsed consistently (e.g., as UTC to avoid local timezone issues)
                // For type="date" inputs, values are 'YYYY-MM-DD'. Parsing them directly as UTC is safe.
                const startDate = new Date(`${formData.data_inicio_contrato}T00:00:00Z`); // Treat as UTC start of day
                const endDate = new Date(`${formData.data_termino_contrato}T00:00:00Z`);   // Treat as UTC start of day

                // Ensure valid dates before calculating difference
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    if (endDate >= startDate) {
                        const diff = differenceInDays(endDate, startDate);
                        // Only update if the calculated difference is different from current state
                        // to prevent unnecessary re-renders or potential loops.
                        if (String(diff) !== formData.prazo_contratual_dias) {
                            // Programmatically update prazo_contratual_dias
                            setFormData(prev => ({ ...prev, prazo_contratual_dias: String(diff) }));
                        }
                    } else {
                        // If end date is before start date, clear the duration
                        if (formData.prazo_contratual_dias !== '') {
                            setFormData(prev => ({ ...prev, prazo_contratual_dias: '' }));
                        }
                    }
                } else {
                    // If dates are invalid, clear prazo_contratual_dias
                    if (formData.prazo_contratual_dias !== '') {
                        setFormData(prev => ({ ...prev, prazo_contratual_dias: '' }));
                    }
                }
            } catch (e) {
                console.error("Error calculating duration", e);
                // If there's an error in date parsing, clear the duration
                if (formData.prazo_contratual_dias !== '') {
                    setFormData(prev => ({ ...prev, prazo_contratual_dias: '' }));
                }
            }
        } else if (formData && formData.prazo_contratual_dias !== '') {
            // If either start or end date is missing, clear the duration
            setFormData(prev => ({ ...prev, prazo_contratual_dias: '' }));
        }
    }, [formData?.data_inicio_contrato, formData?.data_termino_contrato]);


    // Refactored handleInputChange to work with event object and input name attribute
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const { file_url } = await UploadFile({ file });
            setFormData(prev => ({ ...prev, foto_empreendimento: file_url }));
        } catch (err) {
            console.error("Erro no upload da foto principal:", err);
        }
        setUploading(false);
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const { file_url } = await UploadFile({ file });
            setFormData(prev => ({ ...prev, logo_responsavel: file_url }));
        } catch (err) {
            console.error("Erro no upload da logo:", err);
        }
        setUploadingLogo(false);
    };

    const handleGalleryUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploadingGallery(true);
        try {
            const newPhotos = await Promise.all(
                files.map(async (file) => {
                    const { file_url } = await UploadFile({ file });
                    return { url: file_url, legenda: "" };
                })
            );
            setFormData(prev => ({
                ...prev,
                fotos_empreendimento: [...(prev.fotos_empreendimento || []), ...newPhotos]
            }));
        } catch (err) {
            console.error("Erro no upload da galeria:", err);
        }
        setUploadingGallery(false);
    };

    const handleRemovePhoto = (index) => {
        setFormData(prev => ({
            ...prev,
            fotos_empreendimento: prev.fotos_empreendimento.filter((_, i) => i !== index)
        }));
    };

    const handlePhotoLegendChange = (index, legenda) => {
        setFormData(prev => ({
            ...prev,
            fotos_empreendimento: prev.fotos_empreendimento.map((foto, i) =>
                i === index ? { ...foto, legenda } : foto
            )
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { id, created_date, updated_date, created_by, ...updateData } = formData;
            const dataToSave = {
                ...updateData,
                // Existing number parsing
                idade_imovel: updateData.idade_imovel ? parseInt(updateData.idade_imovel) : null,
                quantidade_pavimentos: updateData.quantidade_pavimentos ? parseInt(updateData.quantidade_pavimentos) : null,
                quantidade_conjuntos: updateData.quantidade_conjuntos ? parseInt(updateData.quantidade_conjuntos) : null,
                prazo_contratual_dias: updateData.prazo_contratual_dias ? parseInt(updateData.prazo_contratual_dias) : null,
            };
            await Empreendimento.update(empreendimento.id, dataToSave);
            navigate(createPageUrl("Empreendimentos"));
        } catch (err) {
            console.error("Erro ao salvar empreendimento:", err);
            setError("Erro ao salvar o empreendimento. Por favor, tente novamente."); // Provide user feedback
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-gray-50">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-red-600 mb-4">Erro ao Carregar</h2>
                <p className="text-gray-700 mb-6 max-w-md">{error}</p>
                <Button onClick={() => navigate(createPageUrl("Empreendimentos"))}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos Empreendimentos
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6">
            <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
            </Button>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Consolidated Card for Basic and Contract Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Building2 /> {t.editProject}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="nome_empreendimento">{t.projectName}</Label>
                                    <Input id="nome_empreendimento" name="nome_empreendimento" value={formData.nome_empreendimento} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="cli_empreendimento">{t.client}</Label>
                                    <Input id="cli_empreendimento" name="cli_empreendimento" value={formData.cli_empreendimento} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="os_number">{t.osNumber}</Label>
                                    <Input id="os_number" name="os_number" value={formData.os_number} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="sigla_obra">{t.projectAcronym}</Label>
                                    <Input id="sigla_obra" name="sigla_obra" value={formData.sigla_obra} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="data_inicio_contrato">{t.contractStartDate}</Label>
                                    <Input id="data_inicio_contrato" name="data_inicio_contrato" type="date" value={formData.data_inicio_contrato} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="termino_obra_previsto">{t.terminoObraPrevisto}</Label>
                                    <Input id="termino_obra_previsto" name="termino_obra_previsto" type="date" value={formData.termino_obra_previsto || ''} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="data_termino_contrato">{t.contractEndDate}</Label>
                                    <Input id="data_termino_contrato" name="data_termino_contrato" type="date" value={formData.data_termino_contrato} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="data_sem_entrega">{t.dataSemEntrega}</Label>
                                    <Input id="data_sem_entrega" name="data_sem_entrega" type="date" value={formData.data_sem_entrega || ''} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="prazo_contratual_dias">{t.contractTermDays}</Label>
                                    {/* prazo_contratual_dias is derived, so it's read-only */}
                                    <Input id="prazo_contratual_dias" name="prazo_contratual_dias" type="number" value={formData.prazo_contratual_dias} readOnly className="bg-gray-100" />
                                </div>
                                <div>
                                    <Label htmlFor="valor_contratual">{t.valorContratual}</Label>
                                    <Input id="valor_contratual" name="valor_contratual" value={formData.valor_contratual || ''} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="endereco_empreendimento">{t.projectAddress}</Label>
                                <Input id="endereco_empreendimento" name="endereco_empreendimento" value={formData.endereco_empreendimento} onChange={handleInputChange} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> {/* Adjusted grid for more fields */}
                                <div>
                                    <Label htmlFor="ano_entrega">{t.deliveryYear}</Label>
                                    <Input id="ano_entrega" name="ano_entrega" type="number" value={formData.ano_entrega} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="idade_imovel">Idade do Imóvel (anos)</Label>
                                    <Input id="idade_imovel" name="idade_imovel" type="number" value={formData.idade_imovel} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="quantidade_pavimentos">Pavimentos</Label>
                                    <Input id="quantidade_pavimentos" name="quantidade_pavimentos" type="number" value={formData.quantidade_pavimentos} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="quantidade_conjuntos">Conjuntos</Label>
                                    <Input id="quantidade_conjuntos" name="quantidade_conjuntos" type="number" value={formData.quantidade_conjuntos} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="texto_capa_rodape">Texto Rodapé da Capa</Label>
                                <Input id="texto_capa_rodape" name="texto_capa_rodape" value={formData.texto_capa_rodape} onChange={handleInputChange} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Existing "Contatos" Card */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Phone /> Contatos</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="bm_contato">BM + Contato</Label>
                            <Textarea id="bm_contato" name="bm_contato" value={formData.bm_contato} onChange={handleInputChange} />
                        </div>
                        <div>
                            <Label htmlFor="mantenedor_contato">Mantenedor + Contato</Label>
                            <Textarea id="mantenedor_contato" name="mantenedor_contato" value={formData.mantenedor_contato} onChange={handleInputChange} />
                        </div>
                        <div>
                            <Label htmlFor="projetistas_contatos">Projetistas + Contatos</Label>
                            <Textarea id="projetistas_contatos" name="projetistas_contatos" value={formData.projetistas_contatos} onChange={handleInputChange} />
                        </div>
                    </CardContent>
                </Card>

                {/* Existing "Outras Informações" Card */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Info /> Outras Informações</CardTitle></CardHeader>
                    <CardContent>
                        <Label htmlFor="particularidades">Particularidades do Projeto</Label>
                        <Textarea id="particularidades" name="particularidades" value={formData.particularidades} onChange={handleInputChange} />
                    </CardContent>
                </Card>

                {/* Existing "Fotos e Logos" Card */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2">Fotos e Logos</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Label>Foto Principal</Label>
                            <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                            {uploading && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                            {formData.foto_empreendimento && <img src={formData.foto_empreendimento} alt="Preview" className="w-full h-48 object-cover rounded-lg mt-2" />}
                        </div>
                        <div>
                            <Label>Logo do Responsável</Label>
                            <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                            {uploadingLogo && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                            {formData.logo_responsavel && <img src={formData.logo_responsavel} alt="Logo" className="h-20 object-contain rounded-lg mt-2 bg-gray-100 p-2" />}
                        </div>
                        <div>
                            <Label>Galeria de Fotos</Label>
                            <Input type="file" accept="image/*" multiple onChange={handleGalleryUpload} disabled={uploadingGallery} />
                            {uploadingGallery && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                {(formData.fotos_empreendimento || []).map((foto, index) => (
                                    <div key={index} className="relative group">
                                        <img src={foto.url} alt={`Foto ${index}`} className="w-full h-32 object-cover rounded-lg" />
                                        <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleRemovePhoto(index)}><X className="w-3 h-3" /></Button>
                                        <Input placeholder="Legenda" value={foto.legenda} onChange={e => handlePhotoLegendChange(index, e.target.value)} className="mt-1" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Informações Técnicas Card */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><FileText /> Informações Técnicas</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {(formData.informacoes_tecnicas || []).map((info, infoIndex) => (
                            <div key={infoIndex} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">{info.documento_informacao}</h4>
                                    <Button type="button" variant="destructive" size="icon" className="h-6 w-6" onClick={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            informacoes_tecnicas: prev.informacoes_tecnicas.filter((_, i) => i !== infoIndex)
                                        }));
                                    }}><X className="w-3 h-3" /></Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label>Ano de Entrega</Label>
                                        <Input type="number" value={info.ano_entrega_item || ''} onChange={(e) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                informacoes_tecnicas: prev.informacoes_tecnicas.map((item, i) =>
                                                    i === infoIndex ? { ...item, ano_entrega_item: e.target.value } : item
                                                )
                                            }));
                                        }} />
                                    </div>
                                    <div>
                                        <Label>Documento/Informação</Label>
                                        <Input value={info.documento_informacao || ''} onChange={(e) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                informacoes_tecnicas: prev.informacoes_tecnicas.map((item, i) =>
                                                    i === infoIndex ? { ...item, documento_informacao: e.target.value } : item
                                                )
                                            }));
                                        }} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {(info.descritivos || []).map((desc, descIndex) => (
                                        <div key={descIndex} className="border-l-2 border-blue-400 pl-3 py-2 space-y-2 bg-white p-2 rounded">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold">Descritivo {descIndex + 1}</span>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        informacoes_tecnicas: prev.informacoes_tecnicas.map((item, i) =>
                                                            i === infoIndex ? {
                                                                ...item,
                                                                descritivos: item.descritivos.filter((_, j) => j !== descIndex)
                                                            } : item
                                                        )
                                                    }));
                                                }}>Remover</Button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <Input placeholder="Descrição" value={desc.descricao || ''} onChange={(e) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        informacoes_tecnicas: prev.informacoes_tecnicas.map((item, i) =>
                                                            i === infoIndex ? {
                                                                ...item,
                                                                descritivos: item.descritivos.map((d, j) =>
                                                                    j === descIndex ? { ...d, descricao: e.target.value } : d
                                                                )
                                                            } : item
                                                        )
                                                    }));
                                                }} />
                                                <Input placeholder="Ano Emissão/Validade" value={desc.ano_emissao_validade || ''} onChange={(e) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        informacoes_tecnicas: prev.informacoes_tecnicas.map((item, i) =>
                                                            i === infoIndex ? {
                                                                ...item,
                                                                descritivos: item.descritivos.map((d, j) =>
                                                                    j === descIndex ? { ...d, ano_emissao_validade: e.target.value } : d
                                                                )
                                                            } : item
                                                        )
                                                    }));
                                                }} />
                                                <Input placeholder="Área/Informação" value={desc.area_descritivo || desc.informacao_descritivo || ''} onChange={(e) => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        informacoes_tecnicas: prev.informacoes_tecnicas.map((item, i) =>
                                                            i === infoIndex ? {
                                                                ...item,
                                                                descritivos: item.descritivos.map((d, j) =>
                                                                    j === descIndex ? { ...d, area_descritivo: e.target.value, informacao_descritivo: e.target.value } : d
                                                                )
                                                            } : item
                                                        )
                                                    }));
                                                }} />
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" id={`status_${infoIndex}_${descIndex}`} checked={desc.status_ok || false} onChange={(e) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            informacoes_tecnicas: prev.informacoes_tecnicas.map((item, i) =>
                                                                i === infoIndex ? {
                                                                    ...item,
                                                                    descritivos: item.descritivos.map((d, j) =>
                                                                        j === descIndex ? { ...d, status_ok: e.target.checked } : d
                                                                    )
                                                                } : item
                                                            )
                                                        }));
                                                    }} />
                                                    <label htmlFor={`status_${infoIndex}_${descIndex}`} className="text-sm">OK</label>
                                                </div>
                                            </div>
                                            <Input placeholder="Observações" value={desc.obs || ''} onChange={(e) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    informacoes_tecnicas: prev.informacoes_tecnicas.map((item, i) =>
                                                        i === infoIndex ? {
                                                            ...item,
                                                            descritivos: item.descritivos.map((d, j) =>
                                                                j === descIndex ? { ...d, obs: e.target.value } : d
                                                            )
                                                        } : item
                                                    )
                                                }));
                                            }} />
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        informacoes_tecnicas: prev.informacoes_tecnicas.map((item, i) =>
                                            i === infoIndex ? {
                                                ...item,
                                                descritivos: [...(item.descritivos || []), { descricao: '', ano_emissao_validade: '', area_descritivo: '', obs: '', status_ok: false }]
                                            } : item
                                        )
                                    }));
                                }}>+ Adicionar Descritivo</Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" onClick={() => {
                            setFormData(prev => ({
                                ...prev,
                                informacoes_tecnicas: [...(prev.informacoes_tecnicas || []), { documento_informacao: '', ano_entrega_item: '', descritivos: [] }]
                            }));
                        }}>+ Adicionar Informação Técnica</Button>
                    </CardContent>
                </Card>

                {/* Existing "Contatos do Proprietário/Gerenciadora" Card */}
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Users /> Contatos do Proprietário/Gerenciadora</CardTitle></CardHeader>
                    <CardContent>
                        <TabelaContatos
                            contatos={formData.contatos_proprietario || []}
                            onContatosChange={(novosContatos) => setFormData(prev => ({ ...prev, contatos_proprietario: novosContatos }))}
                        />
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={saving}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Salvar Alterações
                    </Button>
                </div>
            </form>
        </div>
    );
}