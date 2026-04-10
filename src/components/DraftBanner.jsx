import React from 'react';
import { Button } from '@/components/ui/button';

export default function DraftBanner({ draftSavedAt, hasDraft, onClearDraft }) {
  if (!hasDraft) return null;

  const savedText = draftSavedAt
    ? new Date(draftSavedAt).toLocaleString('pt-BR')
    : 'agora';

  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex items-center justify-between gap-2">
        <span>Rascunho salvo automaticamente: {savedText}</span>
        <Button type="button" variant="outline" size="sm" onClick={onClearDraft}>
          Limpar rascunho
        </Button>
      </div>
    </div>
  );
}
