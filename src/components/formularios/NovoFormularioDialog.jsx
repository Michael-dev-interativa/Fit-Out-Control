import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, X, Palette } from 'lucide-react';
import { FormularioVistoria } from '@/api/entities';

const availableColors = [
    { name: 'Verde', value: 'green', class: 'bg-green-500' },
    { name: 'Vermelho', value: 'red', class: 'bg-red-500' },
    { name: 'Amarelo', value: 'yellow', class: 'bg-yellow-500' },
    { name: 'Azul', value: 'blue', class: 'bg-blue-500' },
    { name: 'Roxo', value: 'purple', class: 'bg-purple-500' },
    { name: 'Cinza', value: 'gray', class: 'bg-gray-500' },
];

const defaultOptions = [
    { texto: 'Finalizado', cor: 'green' },
    { texto: 'Em Andamento', cor: 'blue' },
    { texto: 'Pendente', cor: 'yellow' },
    { texto: 'Informativo', cor: 'purple' },
    { texto: 'Não se Aplica', cor: 'gray' }
];

export default function NovoFormularioDialog({ open, onOpenChange, onSuccess }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState('Ativo');
  const [secoes, setSecoes] = useState([{
    nome_secao: '',
    perguntas: [{
      pergunta: '',
      tipo: 'select',
      opcoes: JSON.parse(JSON.stringify(defaultOptions))
    }]
  }]);
  const [saving, setSaving] = useState(false);

  const handleAddSecao = () => {
    setSecoes([...secoes, {
      nome_secao: '',
      perguntas: [{
        pergunta: '',
        tipo: 'select',
        opcoes: JSON.parse(JSON.stringify(defaultOptions))
      }]
    }]);
  };

  const handleRemoveSecao = (index) => {
    const novasSecoes = secoes.filter((_, i) => i !== index);
    setSecoes(novasSecoes);
  };

  const handleSecaoChange = (index, field, value) => {
    const novasSecoes = [...secoes];
    novasSecoes[index][field] = value;
    setSecoes(novasSecoes);
  };

  const handleAddPergunta = (secaoIndex) => {
    const novasSecoes = [...secoes];
    novasSecoes[secaoIndex].perguntas.push({
      pergunta: '',
      tipo: 'select',
      opcoes: JSON.parse(JSON.stringify(defaultOptions))
    });
    setSecoes(novasSecoes);
  };

  const handleRemovePergunta = (secaoIndex, perguntaIndex) => {
    const novasSecoes = [...secoes];
    novasSecoes[secaoIndex].perguntas = novasSecoes[secaoIndex].perguntas.filter((_, i) => i !== perguntaIndex);
    setSecoes(novasSecoes);
  };

  const handlePerguntaChange = (secaoIndex, perguntaIndex, field, value) => {
    const novasSecoes = [...secoes];
    if (field === 'tipo' && value !== 'select' && value !== 'select_with_photo' && value !== 'checkbox') {
      // Se mudou para um tipo que não é select ou checkbox, limpa as opções
      novasSecoes[secaoIndex].perguntas[perguntaIndex] = {
        ...novasSecoes[secaoIndex].perguntas[perguntaIndex],
        [field]: value,
        opcoes: []
      };
    } else if (field === 'tipo' && (value === 'select' || value === 'select_with_photo') && (!novasSecoes[secaoIndex].perguntas[perguntaIndex].opcoes || novasSecoes[secaoIndex].perguntas[perguntaIndex].opcoes.length === 0)) {
      // Se mudou para select e não tem opções, adiciona as padrão
      novasSecoes[secaoIndex].perguntas[perguntaIndex] = {
        ...novasSecoes[secaoIndex].perguntas[perguntaIndex],
        [field]: value,
        opcoes: JSON.parse(JSON.stringify(defaultOptions))
      };
    } else if (field === 'tipo' && value === 'checkbox' && (!novasSecoes[secaoIndex].perguntas[perguntaIndex].opcoes || novasSecoes[secaoIndex].perguntas[perguntaIndex].opcoes.length === 0)) {
      // Se mudou para checkbox e não tem opções, adiciona uma opção padrão
      novasSecoes[secaoIndex].perguntas[perguntaIndex] = {
        ...novasSecoes[secaoIndex].perguntas[perguntaIndex],
        [field]: value,
        opcoes: [{ texto: '', cor: 'gray' }]
      };
    } else {
      novasSecoes[secaoIndex].perguntas[perguntaIndex][field] = value;
    }
    setSecoes(novasSecoes);
  };

  const handleAddOpcao = (secaoIndex, perguntaIndex) => {
    const novasSecoes = [...secoes];
    if (!novasSecoes[secaoIndex].perguntas[perguntaIndex].opcoes) {
      novasSecoes[secaoIndex].perguntas[perguntaIndex].opcoes = [];
    }
    novasSecoes[secaoIndex].perguntas[perguntaIndex].opcoes.push({ texto: '', cor: 'gray' });
    setSecoes(novasSecoes);
  };

  const handleRemoveOpcao = (secaoIndex, perguntaIndex, opcaoIndex) => {
    const novasSecoes = [...secoes];
    novasSecoes[secaoIndex].perguntas[perguntaIndex].opcoes =
      novasSecoes[secaoIndex].perguntas[perguntaIndex].opcoes.filter((_, i) => i !== opcaoIndex);
    setSecoes(novasSecoes);
  };

  const handleOpcaoChange = (secaoIndex, perguntaIndex, opcaoIndex, field, value) => {
    const novasSecoes = [...secoes];
    novasSecoes[secaoIndex].perguntas[perguntaIndex].opcoes[opcaoIndex][field] = value;
    setSecoes(novasSecoes);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await FormularioVistoria.create({
        nome_formulario: nome,
        descricao_formulario: descricao,
        status_formulario: status,
        secoes: secoes,
      });
      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Erro ao criar formulário:", error);
    }
    setSaving(false);
  };

  const resetForm = () => {
    setNome('');
    setDescricao('');
    setStatus('Ativo');
    setSecoes([{
      nome_secao: '',
      perguntas: [{
        pergunta: '',
        tipo: 'select',
        opcoes: JSON.parse(JSON.stringify(defaultOptions))
      }]
    }]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if(!isOpen) resetForm();
        onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Formulário de Vistoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Formulário</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
             <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
          </div>
          <div className="space-y-4">
            <Label>Seções e Perguntas</Label>
            {secoes.map((secao, secaoIndex) => (
              <div key={secaoIndex} className="p-4 border rounded-lg space-y-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <Input
                    placeholder="Nome da Seção"
                    value={secao.nome_secao}
                    onChange={(e) => handleSecaoChange(secaoIndex, 'nome_secao', e.target.value)}
                    className="font-semibold"
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveSecao(secaoIndex)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                {secao.perguntas.map((pergunta, perguntaIndex) => (
                  <div key={perguntaIndex} className="p-3 border rounded-md bg-white space-y-3">
                     <div className="flex items-center justify-between">
                        <Input
                            placeholder="Digite a pergunta"
                            value={pergunta.pergunta}
                            onChange={(e) => handlePerguntaChange(secaoIndex, perguntaIndex, 'pergunta', e.target.value)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleRemovePergunta(secaoIndex, perguntaIndex)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                     </div>
                     <Select value={pergunta.tipo} onValueChange={(val) => handlePerguntaChange(secaoIndex, perguntaIndex, 'tipo', val)}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="select">Seleção (Conforme, etc)</SelectItem>
                            <SelectItem value="select_with_photo">Seleção (Conforme, etc) + Foto</SelectItem>
                            <SelectItem value="text">Texto Curto</SelectItem>
                            <SelectItem value="textarea">Texto Longo</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                            <SelectItem value="date">Data</SelectItem>
                            <SelectItem value="signature">Assinatura</SelectItem>
                            <SelectItem value="file">Foto</SelectItem>
                        </SelectContent>
                     </Select>

                     {/* Configuração de opções para campos de seleção e checkbox */}
                     {(pergunta.tipo === 'select' || pergunta.tipo === 'select_with_photo' || pergunta.tipo === 'checkbox') && (
                       <div className="space-y-2">
                         <Label className="text-sm font-medium">Opções de Seleção:</Label>
                         <div className="space-y-2">
                           {(pergunta.opcoes || []).map((opcao, opcaoIndex) => (
                             <div key={opcaoIndex} className="flex items-center gap-2">
                               <Select value={opcao.cor} onValueChange={(cor) => handleOpcaoChange(secaoIndex, perguntaIndex, opcaoIndex, 'cor', cor)}>
                                    <SelectTrigger className="w-20">
                                        <SelectValue>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded-full ${availableColors.find(c => c.value === opcao.cor)?.class || 'bg-gray-500'}`} />
                                            </div>
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableColors.map(color => (
                                            <SelectItem key={color.value} value={color.value}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded-full ${color.class}`} />
                                                    <span>{color.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                               </Select>
                               <Input
                                 placeholder="Digite uma opção"
                                 value={opcao.texto}
                                 onChange={(e) => handleOpcaoChange(secaoIndex, perguntaIndex, opcaoIndex, 'texto', e.target.value)}
                                 className="flex-1"
                               />
                               <Button
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => handleRemoveOpcao(secaoIndex, perguntaIndex, opcaoIndex)}
                                 className="text-red-500 hover:text-red-700"
                               >
                                 <X className="w-4 h-4" />
                               </Button>
                             </div>
                           ))}
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleAddOpcao(secaoIndex, perguntaIndex)}
                             className="w-full"
                           >
                             <Plus className="w-4 h-4 mr-2" />
                             Adicionar Opção
                           </Button>
                         </div>
                       </div>
                     )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => handleAddPergunta(secaoIndex)}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Pergunta
                </Button>
              </div>
            ))}
            <Button variant="secondary" onClick={handleAddSecao}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar Seção
            </Button>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Formulário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}