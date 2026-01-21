
import React, { useState, useEffect } from 'react';
import { ParticularidadeEmpreendimento } from '@/api/entities';
import { User } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Users, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  Shapes,
  Megaphone,
  Info,
  ChevronDown,
  ChevronUp,
  Building, // New icon - not directly used in outline but present in imports
  Briefcase // New icon - not directly used in outline but present in imports
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const disciplinasOptions = ["Arquitetura", "Estrutura", "Civil", "Elétrica", "Hidráulica", "Incêndio", "Climatização", "Todas"];
const formalizacaoOptions = ["Reunião Presencial", "Reunião Virtual/Call", "E-mail", "WhatsApp", "Telefone", "Documento Físico", "Outros"];
const impactoOptions = ["Kickoff", "Análise de Projetos", "Vistoria de Obras", "Todas as Fases"];
const prioridadeOptions = ["Baixa", "Média", "Alta", "Crítica"];

export default function ParticularidadesDialog({ open, onOpenChange, empreendimento }) {
  const [particularidades, setParticularidades] = useState([]);
  const [loading, setLoading] = useState(true); // Changed initial state to true
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({}); // Changed initial state to empty object
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchUserAndData = async () => {
      setLoading(true); // Ensure loading is true when starting fetch
      try {
        const user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        console.error("Usuário não autenticado:", e);
        setCurrentUser(null); // Ensure currentUser is null if auth fails
      }
      if (open && empreendimento?.id) {
        await loadParticularidades();
      }
      setLoading(false); // Set loading to false after all data is fetched
    };
    fetchUserAndData();
  }, [open, empreendimento?.id]);

  const loadParticularidades = async () => {
    // setLoading(true); // Removed as it's handled in useEffect or just before this call now
    try {
      const data = await ParticularidadeEmpreendimento.filter(
        { id_empreendimento: empreendimento.id },
        '-created_date'
      );
      setParticularidades(data);
    } catch (error) {
      console.error('Erro ao carregar particularidades:', error);
    }
    // setLoading(false); // Removed as it's handled in useEffect
  };

  const resetForm = () => {
    setFormData({
      titulo_particularidade: '',
      descricao_particularidade: '',
      meio_formalizacao: formalizacaoOptions[0], // Default to first option
      data_formalizacao: new Date().toISOString().split('T')[0],
      participantes: [{ nome: '', empresa: '', funcao: '' }],
      disciplinas_impactadas: ['Todas'],
      tipo_impacto: impactoOptions[3], // Default to "Todas as Fases"
      prioridade: prioridadeOptions[1], // Default to "Média"
      status: 'Ativa',
      observacoes: ''
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleAddParticipante = () => {
    setFormData(prev => ({
      ...prev,
      participantes: [...(prev.participantes || []), { nome: '', empresa: '', funcao: '' }]
    }));
  };

  const handleRemoveParticipante = (index) => {
    setFormData(prev => ({
      ...prev,
      participantes: (prev.participantes || []).filter((_, i) => i !== index)
    }));
  };

  const handleParticipanteChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      participantes: (prev.participantes || []).map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        id_empreendimento: empreendimento.id,
        // Filter out empty participants before saving
        participantes: (formData.participantes || []).filter(p => p.nome.trim() !== '' || p.empresa.trim() !== '' || p.funcao.trim() !== ''),
        // Ensure data_formalizacao is a valid date string
        data_formalizacao: formData.data_formalizacao || new Date().toISOString().split('T')[0],
      };

      if (editingItem) {
        await ParticularidadeEmpreendimento.update(editingItem.id, dataToSave);
      } else {
        await ParticularidadeEmpreendimento.create(dataToSave);
      }

      await loadParticularidades();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar particularidade:', error);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      ...item,
      // Ensure participants array is not null/undefined and contains at least one empty object if empty
      participantes: item.participantes && item.participantes.length > 0 ? item.participantes : [{ nome: '', empresa: '', funcao: '' }],
      // Ensure disciplines_impactadas is an array
      disciplinas_impactadas: item.disciplinas_impactadas || ['Todas'],
      // Ensure data_formalizacao is in YYYY-MM-DD format for date input
      data_formalizacao: item.data_formalizacao ? new Date(item.data_formalizacao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    try {
      await ParticularidadeEmpreendimento.delete(item.id);
      await loadParticularidades();
    } catch (error) {
      console.error('Erro ao excluir particularidade:', error);
    }
  };

  const getPrioridadeColor = (prioridade) => {
    const colors = {
      'Baixa': 'bg-green-100 text-green-800',
      'Média': 'bg-yellow-100 text-yellow-800',
      'Alta': 'bg-orange-100 text-orange-800',
      'Crítica': 'bg-red-100 text-red-800'
    };
    return colors[prioridade] || 'bg-gray-100 text-gray-800';
  };

  const getPrioridadeBorderColor = (prioridade) => {
    const borders = {
      'Baixa': 'border-l-4 border-green-500',
      'Média': 'border-l-4 border-yellow-500',
      'Alta': 'border-l-4 border-orange-500',
      'Crítica': 'border-l-4 border-red-500'
    };
    return borders[prioridade] || 'border-l-4 border-gray-400';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Ativa': <Clock className="w-4 h-4 text-blue-600" />,
      'Concluída': <CheckCircle2 className="w-4 h-4 text-green-600" />,
      'Cancelada': <X className="w-4 h-4 text-red-600" />
    };
    return icons[status] || <AlertCircle className="w-4 h-4 text-gray-600" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Particularidades do Empreendimento - {empreendimento?.nome_empreendimento}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!showForm ? (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Documento complementar de informações técnicas para kickoffs, análises e vistorias</p>
                {currentUser?.role === 'admin' && (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Particularidade
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">Carregando...</div>
                ) : particularidades.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Nenhuma particularidade cadastrada</p>
                  </div>
                ) : (
                  particularidades.map((item) => (
                    <Card key={item.id} className={`${getPrioridadeBorderColor(item.prioridade)} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                      <div className="cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                        <CardHeader>
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{item.titulo_particularidade}</CardTitle>
                              <div className="flex flex-wrap items-center gap-2 pt-2">
                                <Badge className={getPrioridadeColor(item.prioridade)}>{item.prioridade}</Badge>
                                <Badge variant="outline" className="flex items-center gap-1">{getStatusIcon(item.status)} {item.status}</Badge>
                                <Badge variant="secondary">{item.tipo_impacto}</Badge>
                              </div>
                            </div>
                            <div className='flex items-center gap-2'>
                              {currentUser?.role === 'admin' && (
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}> {/* Prevent card expansion when clicking buttons */}
                                  <Button variant="outline" size="icon" onClick={() => handleEdit(item)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="icon">
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir esta particularidade? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(item)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              )}
                              <Button variant="ghost" size="icon">
                                {expandedId === item.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2"> {/* Padding adjustment for description */}
                          <p className="text-gray-700">{item.descricao_particularidade}</p>
                        </CardContent>
                      </div>
                      <AnimatePresence>
                        {expandedId === item.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <CardContent className="pt-0">
                              <div className="border-t mt-2 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                  <div className="flex items-start gap-2">
                                    <Megaphone className="w-4 h-4 mt-0.5 text-gray-500" />
                                    <span><strong>Formalização:</strong> {item.meio_formalizacao || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Calendar className="w-4 h-4 mt-0.5 text-gray-500" />
                                    <span><strong>Data:</strong> {item.data_formalizacao ? new Date(item.data_formalizacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Shapes className="w-4 h-4 mt-0.5 text-gray-500" />
                                    <div><strong>Disciplinas Impactadas:</strong>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {(item.disciplinas_impactadas || []).map(d => <Badge key={d} variant="secondary">{d}</Badge>)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Users className="w-4 h-4 mt-0.5 text-gray-500" />
                                    <div><strong>Participantes:</strong>
                                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                                        {(item.participantes || []).length > 0 ? (
                                          (item.participantes || []).map((p, i) => (
                                            <li key={i}>{p.nome || 'N/A'} <span className='text-gray-500 text-xs'>({p.empresa || 'N/A'} - {p.funcao || 'N/A'})</span></li>
                                          ))
                                        ) : (
                                          <li>N/A</li>
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                  {(item.observacoes && item.observacoes.trim() !== '') && (
                                     <div className="flex items-start gap-2 md:col-span-2">
                                      <Info className="w-4 h-4 mt-0.5 text-gray-500" />
                                      <p><strong>Observações:</strong> {item.observacoes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  ))
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {editingItem ? 'Editar' : 'Nova'} Particularidade
                </h3>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo_particularidade">Título da Particularidade</Label>
                  <Input
                    id="titulo_particularidade"
                    value={formData.titulo_particularidade || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, titulo_particularidade: e.target.value }))}
                    placeholder="Ex: Instalação de sonofletores"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Meio de Formalização</Label>
                  <Select 
                    value={formData.meio_formalizacao || formalizacaoOptions[0]} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, meio_formalizacao: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o meio" />
                    </SelectTrigger>
                    <SelectContent>
                      {formalizacaoOptions.map(meio => (
                        <SelectItem key={meio} value={meio}>{meio}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_formalizacao">Data de Formalização</Label>
                  <Input
                    type="date"
                    id="data_formalizacao"
                    value={formData.data_formalizacao || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_formalizacao: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Impacto</Label>
                  <Select 
                    value={formData.tipo_impacto || impactoOptions[3]} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_impacto: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de impacto" />
                    </SelectTrigger>
                    <SelectContent>
                      {impactoOptions.map(tipo => (
                        <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select 
                    value={formData.prioridade || prioridadeOptions[1]} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, prioridade: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      {prioridadeOptions.map(prioridade => (
                        <SelectItem key={prioridade} value={prioridade}>{prioridade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={formData.status || 'Ativa'} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativa">Ativa</SelectItem>
                      <SelectItem value="Concluída">Concluída</SelectItem>
                      <SelectItem value="Cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao_particularidade">Descrição da Particularidade</Label>
                <Textarea
                  id="descricao_particularidade"
                  value={formData.descricao_particularidade || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao_particularidade: e.target.value }))}
                  placeholder="Considerar nas análises para a disciplina 'xxxxxx' e também a instalação de sonofletores em todos os ambientes compartimentados..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Disciplinas Impactadas</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {disciplinasOptions.map(disciplina => (
                    <div key={disciplina} className="flex items-center gap-2 p-2 border rounded-md">
                      <input
                        type="checkbox"
                        id={`disciplina-${disciplina}`}
                        name="disciplinas_impactadas"
                        value={disciplina}
                        checked={(formData.disciplinas_impactadas || []).includes(disciplina)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const value = e.target.value;
                          setFormData(prev => {
                            const existing = prev.disciplinas_impactadas || [];
                            if (checked) {
                              return { ...prev, disciplinas_impactadas: [...existing, value] };
                            } else {
                              return { ...prev, disciplinas_impactadas: existing.filter(d => d !== value) };
                            }
                          });
                        }}
                      />
                      <Label htmlFor={`disciplina-${disciplina}`}>{disciplina}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Participantes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddParticipante}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Participante
                  </Button>
                </div>

                {(formData.participantes || []).map((participante, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end p-2 border rounded-md">
                    <Input
                      placeholder="Nome"
                      value={participante.nome || ''}
                      onChange={(e) => handleParticipanteChange(index, 'nome', e.target.value)}
                    />
                    <Input
                      placeholder="Empresa"
                      value={participante.empresa || ''}
                      onChange={(e) => handleParticipanteChange(index, 'empresa', e.target.value)}
                    />
                    <Input
                      placeholder="Função"
                      value={participante.funcao || ''}
                      onChange={(e) => handleParticipanteChange(index, 'funcao', e.target.value)}
                    />
                    <Button 
                      type="button" 
                      variant="ghost" // Changed to ghost for less prominence
                      size="icon" 
                      onClick={() => handleRemoveParticipante(index)}
                      disabled={(formData.participantes || []).length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" /> {/* Added red color */}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingItem ? 'Atualizar' : 'Salvar'} Particularidade
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
