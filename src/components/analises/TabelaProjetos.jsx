import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function TabelaProjetos({ projetos = [], isCliente = false, onResponderComentario, saving = false }) {
  const [respostas, setRespostas] = useState({});

  const handleResponder = (projIdx, comIdx) => {
    const key = `${projIdx}-${comIdx}`;
    const texto = respostas[key];
    if (!texto || !onResponderComentario) return;
    onResponderComentario(projIdx, comIdx, texto);
    setRespostas((prev) => ({ ...prev, [key]: '' }));
  };

  return (
    <div style={{ border: '1px solid #d1d5db', borderRadius: 10, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#0c2461', color: '#fff' }}>
            <th style={{ padding: '6px', textAlign: 'left', width: '8%' }}>ITEM</th>
            <th style={{ padding: '6px', textAlign: 'left', width: '18%' }}>ACAO</th>
            <th style={{ padding: '6px', textAlign: 'left' }}>DESCRICAO</th>
            <th style={{ padding: '6px', textAlign: 'center', width: '10%' }}>SIT</th>
          </tr>
        </thead>
        <tbody>
          {(projetos || []).map((proj, idx) => (
            <React.Fragment key={idx}>
              <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={{ padding: '6px' }}>{proj.item || ''}</td>
                <td style={{ padding: '6px' }}>{proj.acao || ''}</td>
                <td style={{ padding: '6px', whiteSpace: 'pre-wrap' }}>{proj.descricao || ''}</td>
                <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{proj.situacao || 'PD'}</td>
              </tr>

              {(proj.comentarios || []).map((com, comIdx) => {
                const key = `${idx}-${comIdx}`;
                return (
                  <tr key={key}>
                    <td colSpan={4} style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8fafc' }}>
                      <div style={{ fontSize: '10px' }}>
                        <strong>Comentario:</strong> {com.texto || ''}
                      </div>

                      {Array.isArray(com.imagens) && com.imagens.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          {com.imagens.map((img, imgIdx) => (
                            <img key={imgIdx} src={img} alt={`imagem-${imgIdx}`} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #d1d5db' }} />
                          ))}
                        </div>
                      )}

                      {com.resposta && (
                        <div style={{ marginTop: 6, fontSize: '10px', color: '#065f46' }}>
                          <strong>Resposta:</strong> {com.resposta}
                        </div>
                      )}

                      {isCliente && !com.resposta && (
                        <div className="no-print" style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <Textarea
                            rows={2}
                            placeholder="Responder comentario..."
                            value={respostas[key] || ''}
                            onChange={(e) => setRespostas((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="text-xs"
                          />
                          <Button size="sm" disabled={saving} onClick={() => handleResponder(idx, comIdx)}>
                            Responder
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}

          {(!projetos || projetos.length === 0) && (
            <tr>
              <td colSpan={4} style={{ padding: '10px', textAlign: 'center', color: '#6b7280' }}>
                Nenhum item encontrado
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
