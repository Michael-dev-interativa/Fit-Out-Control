import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Edit2, Trash2 } from 'lucide-react';

export default function SignatureField({ assinatura, index, onEdit, onRemove, onChange }) {
  return (
    <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Parte (Ex: Cliente)</Label>
          <Input 
            value={assinatura.parte} 
            onChange={e => onChange(index, 'parte', e.target.value)} 
          />
        </div>
        <div className="space-y-1">
          <Label>Nome</Label>
          <Input 
            value={assinatura.nome} 
            onChange={e => onChange(index, 'nome', e.target.value)} 
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Assinatura</Label>
        <div className="border-2 border-dashed rounded-lg p-4 bg-white flex items-center justify-center min-h-[120px]">
          {assinatura.assinatura_imagem ? (
            <img 
              src={assinatura.assinatura_imagem} 
              alt="Assinatura" 
              className="max-h-24 object-contain" 
            />
          ) : (
            <p className="text-gray-400 text-sm">Sem assinatura</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit(index)}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            {assinatura.assinatura_imagem ? 'Editar Assinatura' : 'Adicionar Assinatura'}
          </Button>
          {assinatura.assinatura_imagem && (
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => onChange(index, 'assinatura_imagem', '')}
            >
              Limpar
            </Button>
          )}
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => onRemove(index)}
          >
            <Trash2 className="w-4 h-4 text-red-500 mr-2" />
            Remover
          </Button>
        </div>
      </div>
    </div>
  );
}