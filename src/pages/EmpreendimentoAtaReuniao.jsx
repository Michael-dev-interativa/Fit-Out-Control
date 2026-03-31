import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { AtaReuniao, Empreendimento as EmpreendimentoEntity, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ArrowLeft, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimpleSignaturePad } from '@/components/signature/SignaturePadComponent';

const tipoReuniao = ["Kickoff", "Reunião de Projeto", "Reunião de Andamento", "Reunião de Encerramento", "Reunião Extraordinária", "Outra"];
const statusOptions = ["Pendente", "Em Andamento", "Concluído", "Cancelado"];

export default function NovaAtaReuniao() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const empreendimentoId = query.get('empreendimentoId');
  const ataId = query.get('ataId');

  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    id_empreendimento: empreendimentoId,
    titulo_capa: 'RELATÓRIO',
    subtitulo_capa: 'Gerenciamento de Obra',
    texto_rodape_capa: '',
    edificio: '',
    nome_arquivo: '',
    locatario: '',
    local_reuniao: '',
    data_reuniao: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    hora_termino: '',
    tipo_reuniao: '',
    titulo_reuniao: '',
    subtitulo_reuniao: '',
    observacoes: '',
    arquivo_ata: '',
    responsavel_reuniao: '',
    status: 'Pendente',
    participantes: [{ nome: '', empresa: '' }],
    informacoes_obra: [{ nome: '', email: '', tipo: '', observacoes: '', data_envio_projetos: '', data_ocupacao: '' }],
    itens_discutidos: [{ titulo_secao: '', itens: [{ titulo_item: '', descricao: '' }] }],
    assinaturas: [{ parte: '', nome: '', assinatura_imagem: '' }]
  });
  const [saving, setSaving] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [activeSignatureIndex, setActiveSignatureIndex] = useState(null);
  const [signatureMode, setSignatureMode] = useState('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [editCoverOpen, setEditCoverOpen] = useState(false);
  const [editedFormData, setEditedFormData] = useState(null);
  const signaturePadRef = React.useRef(null);

  useEffect(() => {
    if (empreendimentoId) {
      EmpreendimentoEntity.get(empreendimentoId).catch(err => console.error("Erro ao buscar empreendimento:", err));
    }
    if (ataId) {
      (async () => {
        try {
          const existing = await AtaReuniao.get(ataId);
          if (existing) {
            const normalized = { ...existing };
            if (normalized.data_reuniao) {
              try { normalized.data_reuniao = new Date(normalized.data_reuniao).toISOString().split('T')[0]; } catch (e) { }
            }
            setFormData(f => ({ ...f, ...normalized }));
            setEditing(true);
          }
        } catch (e) {
          console.error('Erro ao carregar ata para edição', e);
        }
      })();
    }
  }, [empreendimentoId]);

  const handleOpenEditCover = () => {
    setEditedFormData({
      titulo_capa: formData.titulo_capa,
      subtitulo_capa: formData.subtitulo_capa,
      texto_rodape_capa: formData.texto_rodape_capa,
      titulo_reuniao: formData.titulo_reuniao,
      subtitulo_reuniao: formData.subtitulo_reuniao
    });
    setEditCoverOpen(true);
  };

  const handleSaveCover = () => {
    setFormData(p => ({
      ...p,
      titulo_capa: editedFormData.titulo_capa,
      subtitulo_capa: editedFormData.subtitulo_capa,
      texto_rodape_capa: editedFormData.texto_rodape_capa,
      titulo_reuniao: editedFormData.titulo_reuniao,
      subtitulo_reuniao: editedFormData.subtitulo_reuniao
    }));
    setEditCoverOpen(false);
    toast.success("Campos da capa atualizados!");
  };

  const handleInputChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));

  const handleParticipantChange = (index, field, value) => {
    const newParticipants = [...formData.participantes];
    newParticipants[index][field] = value;
    setFormData(p => ({ ...p, participantes: newParticipants }));
  };

  const addParticipant = () => setFormData(p => ({ ...p, participantes: [...p.participantes, { nome: '', empresa: '' }] }));
  const removeParticipant = (index) => setFormData(p => ({ ...p, participantes: p.participantes.filter((_, i) => i !== index) }));

  const handleObraChange = (index, field, value) => {
    const newObras = [...formData.informacoes_obra];
    newObras[index][field] = value;
    setFormData(p => ({ ...p, informacoes_obra: newObras }));
  };

  const addObra = () => setFormData(p => ({ ...p, informacoes_obra: [...p.informacoes_obra, { nome: '', email: '', tipo: '', observacoes: '', data_envio_projetos: '', data_ocupacao: '' }] }));
  const removeObra = (index) => setFormData(p => ({ ...p, informacoes_obra: p.informacoes_obra.filter((_, i) => i !== index) }));

  const handleSecaoChange = (index, field, value) => {
    const newSecoes = [...formData.itens_discutidos];
    newSecoes[index][field] = value;
    setFormData(p => ({ ...p, itens_discutidos: newSecoes }));
  };

  const handleItemChange = (secaoIndex, itemIndex, field, value) => {
    const newSecoes = [...formData.itens_discutidos];
    newSecoes[secaoIndex].itens[itemIndex][field] = value;
    setFormData(p => ({ ...p, itens_discutidos: newSecoes }));
  };

  const addSecao = () => setFormData(p => ({ ...p, itens_discutidos: [...p.itens_discutidos, { titulo_secao: '', itens: [{ titulo_item: '', descricao: '' }] }] }));
  const removeSecao = (index) => setFormData(p => ({ ...p, itens_discutidos: p.itens_discutidos.filter((_, i) => i !== index) }));
  const addItem = (secaoIndex) => setFormData(p => {
    const newSecoes = [...p.itens_discutidos];
    newSecoes[secaoIndex].itens.push({ titulo_item: '', descricao: '' });
    return { ...p, itens_discutidos: newSecoes };
  });
  const removeItem = (secaoIndex, itemIndex) => setFormData(p => {
    const newSecoes = [...p.itens_discutidos];
    newSecoes[secaoIndex].itens = newSecoes[secaoIndex].itens.filter((_, i) => i !== itemIndex);
    return { ...p, itens_discutidos: newSecoes };
  });

  const handleSignatureChange = (index, field, value) => {
    const newSignatures = [...formData.assinaturas];
    newSignatures[index][field] = value;
    setFormData(p => ({ ...p, assinaturas: newSignatures }));
  };

  const addSignature = () => setFormData(p => ({ ...p, assinaturas: [...p.assinaturas, { parte: '', nome: '', assinatura_imagem: '' }] }));
  const removeSignature = (index) => setFormData(p => ({ ...p, assinaturas: p.assinaturas.filter((_, i) => i !== index) }));

  const openSignatureDialog = (index) => {
    setActiveSignatureIndex(index);
    setSignatureMode('draw');
    setTypedSignature('');
    setShowSignatureDialog(true);
  };

  const handleSaveSignature = async () => {
    if (activeSignatureIndex === null) return;

    try {
      if (signatureMode === 'type') {
        if (!typedSignature.trim()) {
          toast.error("Por favor, digite sua assinatura.");
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 850;
        canvas.height = 215;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#000000';
        ctx.font = '48px Calibri';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(typedSignature, canvas.width / 2, canvas.height - 20);

        const signatureDataUrl = canvas.toDataURL('image/png', 0.92);
        const blob = await fetch(signatureDataUrl).then(res => res.blob());
        const file = new File([blob], `assinatura-${Date.now()}.png`, { type: 'image/png' });

        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        handleSignatureChange(activeSignatureIndex, 'assinatura_imagem', file_url);
        setShowSignatureDialog(false);
        setActiveSignatureIndex(null);
        setTypedSignature('');
        toast.success("Assinatura salva!");
      } else {
        if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
          const signatureDataUrl = signaturePadRef.current.toDataURL();
          const blob = await fetch(signatureDataUrl).then(res => res.blob());
          const file = new File([blob], `assinatura-${Date.now()}.png`, { type: 'image/png' });

          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          handleSignatureChange(activeSignatureIndex, 'assinatura_imagem', file_url);
          setShowSignatureDialog(false);
          setActiveSignatureIndex(null);
          toast.success("Assinatura salva!");
        } else {
          toast.error("Por favor, desenhe uma assinatura antes de salvar.");
        }
      }
    } catch (error) {
      toast.error("Erro ao salvar assinatura");
    }
  };

  const handleClearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const me = await User.me();
      const dataToSubmit = {
        ...formData,
        responsavel_reuniao: formData.responsavel_reuniao || me?.email || null
      };
      if (editing && ataId) {
        await AtaReuniao.update(ataId, dataToSubmit);
        toast.success("Ata atualizada com sucesso!");
      } else {
        await AtaReuniao.create(dataToSubmit);
        toast.success("Ata de reunião criada com sucesso!");
      }
      navigate(createPageUrl(`EmpreendimentoAtasReuniao?empreendimentoId=${empreendimentoId}`));
    } catch (error) {
      console.error("Erro ao criar ata:", error);
      toast.error("Falha ao criar a ata de reunião.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Nova Ata de Reunião</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenEditCover} className="bg-blue-50"><Edit2 className="w-4 h-4 mr-2" />Editar Capa</Button>
          <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
        </div>
      </div>

      <Dialog open={editCoverOpen} onOpenChange={setEditCoverOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Informações da Capa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold text-sm mb-4 text-blue-900">Títulos da Capa</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Título Principal</Label>
                  <Input value={editedFormData?.titulo_capa || ''} onChange={(e) => setEditedFormData({ ...editedFormData, titulo_capa: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Subtítulo (vermelho)</Label>
                  <Input value={editedFormData?.subtitulo_capa || ''} onChange={(e) => setEditedFormData({ ...editedFormData, subtitulo_capa: e.target.value })} className="mt-1" />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-green-50">
              <h3 className="font-semibold text-sm mb-4 text-green-900">Informações da Reunião</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Título</Label>
                  <Input value={editedFormData?.titulo_reuniao || ''} onChange={(e) => setEditedFormData({ ...editedFormData, titulo_reuniao: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Subtítulo</Label>
                  <Input value={editedFormData?.subtitulo_reuniao || ''} onChange={(e) => setEditedFormData({ ...editedFormData, subtitulo_reuniao: e.target.value })} className="mt-1" />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
              <h3 className="font-semibold text-sm mb-4 text-red-900">Rodapé da Capa</h3>
              <div>
                <Label className="text-xs font-semibold">Texto do Rodapé</Label>
                <Input value={editedFormData?.texto_rodape_capa || ''} onChange={(e) => setEditedFormData({ ...editedFormData, texto_rodape_capa: e.target.value })} placeholder="Ex: Most Moema | Ed. Most Moema | MPD" className="mt-1" />
                <p className="text-xs text-gray-500 mt-1">Este texto será exibido no rodapé da capa</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCoverOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCover} className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informações Gerais</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Edifício</Label><Input value={formData.edificio} onChange={e => handleInputChange('edificio', e.target.value)} required /></div>
            <div className="space-y-2">
              <Label>Nome do Arquivo do Relatório</Label>
              <Input
                placeholder="Ex: ATA-2025-01"
                value={formData.nome_arquivo}
                onChange={e => handleInputChange('nome_arquivo', e.target.value)}
              />
            </div>
            <div className="space-y-2"><Label>Locatário</Label><Input value={formData.locatario} onChange={e => handleInputChange('locatario', e.target.value)} /></div>
            <div className="space-y-2"><Label>Local da Reunião</Label><Input value={formData.local_reuniao} onChange={e => handleInputChange('local_reuniao', e.target.value)} placeholder="Ex: Sala de Reuniões - Bloco A" required /></div>
            <div className="space-y-2"><Label>Data da Reunião</Label><Input type="date" value={formData.data_reuniao} onChange={e => handleInputChange('data_reuniao', e.target.value)} required /></div>
            <div className="space-y-2"><Label>Hora de Início</Label><Input type="time" value={formData.hora_inicio} onChange={e => handleInputChange('hora_inicio', e.target.value)} /></div>
            <div className="space-y-2"><Label>Hora de Término</Label><Input type="time" value={formData.hora_termino} onChange={e => handleInputChange('hora_termino', e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Tipo de Reunião</Label>
              <Select value={formData.tipo_reuniao || undefined} onValueChange={(value) => handleInputChange('tipo_reuniao', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {tipoReuniao.map((tipo) => (<SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status || undefined} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Responsável da Reunião</Label><Input value={formData.responsavel_reuniao} onChange={e => handleInputChange('responsavel_reuniao', e.target.value)} placeholder="Nome ou email do responsável" /></div>
            <div className="space-y-2"><Label>Arquivo da Ata (URL)</Label><Input value={formData.arquivo_ata} onChange={e => handleInputChange('arquivo_ata', e.target.value)} placeholder="https://.../ata.pdf" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Observações</Label><Textarea value={formData.observacoes} onChange={e => handleInputChange('observacoes', e.target.value)} placeholder="Observações gerais da reunião" rows={3} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Participantes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {formData.participantes.map((participant, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input value={participant.nome} onChange={e => handleParticipantChange(index, 'nome', e.target.value)} placeholder="Nome" required />
                  <Input value={participant.empresa} onChange={e => handleParticipantChange(index, 'empresa', e.target.value)} placeholder="Empresa" />
                </div>
                {formData.participantes.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeParticipant(index)}><Trash2 className="w-4 h-4 text-red-500 mr-2" />Remover</Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addParticipant} className="w-full"><Plus className="w-4 h-4 mr-2" />Adicionar Participante</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Informações da Obra</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {formData.informacoes_obra.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <div>
                  <h4 className="font-semibold mb-3">Ponto Focal</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input value={item.nome} onChange={e => handleObraChange(index, 'nome', e.target.value)} placeholder="Nome" />
                    <Input type="email" value={item.email} onChange={e => handleObraChange(index, 'email', e.target.value)} placeholder="Email" />
                  </div>
                  <div className="mt-3">
                    <label className="text-sm font-medium">Tipo</label>
                    <Input value={item.tipo} onChange={e => handleObraChange(index, 'tipo', e.target.value)} placeholder="Ex: Reforma Total" className="mt-1" />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Observações sobre a Obra</h4>
                  <Textarea value={item.observacoes} onChange={e => handleObraChange(index, 'observacoes', e.target.value)} placeholder="Descreva as observações..." rows={3} />
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Datas Previstas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Envio dos Projetos</label>
                      <Input type="date" value={item.data_envio_projetos} onChange={e => handleObraChange(index, 'data_envio_projetos', e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Ocupação</label>
                      <Input type="date" value={item.data_ocupacao} onChange={e => handleObraChange(index, 'data_ocupacao', e.target.value)} className="mt-1" />
                    </div>
                  </div>
                </div>
                {formData.informacoes_obra.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeObra(index)}><Trash2 className="w-4 h-4 text-red-500 mr-2" />Remover</Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addObra} className="w-full"><Plus className="w-4 h-4 mr-2" />Adicionar Informação da Obra</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Itens Discutidos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {formData.itens_discutidos.map((secao, secaoIndex) => (
              <div key={secaoIndex} className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <div>
                  <Label className="mb-2">Título da Seção</Label>
                  <Input value={secao.titulo_secao} onChange={e => handleSecaoChange(secaoIndex, 'titulo_secao', e.target.value)} placeholder="Ex: INTRODUÇÃO" />
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Itens desta Seção:</div>
                  {secao.itens?.map((item, itemIndex) => (
                    <div key={itemIndex} className="p-3 border rounded bg-white space-y-2">
                      <Input value={item.titulo_item} onChange={e => handleItemChange(secaoIndex, itemIndex, 'titulo_item', e.target.value)} placeholder="Título do item" />
                      <Textarea value={item.descricao} onChange={e => handleItemChange(secaoIndex, itemIndex, 'descricao', e.target.value)} placeholder="Descrição..." rows={3} />
                      {secao.itens.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(secaoIndex, itemIndex)}><Trash2 className="w-4 h-4 text-red-500 mr-2" />Remover Item</Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem(secaoIndex)} className="w-full"><Plus className="w-4 h-4 mr-2" />Adicionar Item</Button>
                </div>
                {formData.itens_discutidos.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeSecao(secaoIndex)}><Trash2 className="w-4 h-4 text-red-500 mr-2" />Remover Seção</Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addSecao} className="w-full"><Plus className="w-4 h-4 mr-2" />Adicionar Seção</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Assinaturas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {formData.assinaturas.map((assinatura, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Cargo/Função</Label><Input value={assinatura.parte} onChange={e => handleSignatureChange(index, 'parte', e.target.value)} /></div>
                  <div className="space-y-1"><Label>Nome</Label><Input value={assinatura.nome} onChange={e => handleSignatureChange(index, 'nome', e.target.value)} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Assinatura</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 bg-white flex items-center justify-center min-h-[120px]">
                    {assinatura.assinatura_imagem ? (
                      <img src={assinatura.assinatura_imagem} alt="Assinatura" className="max-h-24 object-contain" />
                    ) : (
                      <p className="text-gray-400 text-sm">Sem assinatura</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => openSignatureDialog(index)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      {assinatura.assinatura_imagem ? 'Editar' : 'Adicionar'}
                    </Button>
                    {assinatura.assinatura_imagem && (
                      <Button type="button" variant="outline" size="sm" onClick={() => handleSignatureChange(index, 'assinatura_imagem', '')}>Limpar</Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSignature(index)}>
                      <Trash2 className="w-4 h-4 text-red-500 mr-2" />Remover
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addSignature}><Plus className="w-4 h-4 mr-2" />Adicionar Assinatura</Button>
          </CardContent>
        </Card>

        <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Assinatura</DialogTitle>
              <DialogDescription>Desenhar ou digitar</DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 mb-4">
              <Button type="button" variant={signatureMode === 'draw' ? 'default' : 'outline'} onClick={() => setSignatureMode('draw')} className="flex-1">Desenhar</Button>
              <Button type="button" variant={signatureMode === 'type' ? 'default' : 'outline'} onClick={() => setSignatureMode('type')} className="flex-1">Digitar</Button>
            </div>

            {signatureMode === 'draw' ? (
              <div className="border rounded-md overflow-hidden h-52 bg-white">
                <SimpleSignaturePad ref={signaturePadRef} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Digite sua assinatura</Label>
                <Input type="text" value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} placeholder="Nome..." style={{ fontFamily: 'Calibri' }} />
              </div>
            )}

            <DialogFooter className="flex justify-between">
              {signatureMode === 'draw' && (<Button variant="outline" onClick={handleClearSignature}>Limpar</Button>)}
              <div className="flex gap-2 ml-auto">
                <Button variant="ghost" onClick={() => setShowSignatureDialog(false)}>Cancelar</Button>
                <Button onClick={handleSaveSignature}>Salvar</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar Ata'}
          </Button>
        </div>
      </form>
    </div>
  );
}
