import React, { useState, useEffect, useRef, useCallback, useImperativeHandle } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RelatorioSaida } from '@/entities/RelatorioSaida';
import { User } from '@/entities/User';
import { base44 } from '@/api/base44Client';
import EditCoverSaidaDialog from '@/components/relatorios/EditCoverSaidaDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Upload, X, Camera, AlertTriangle, Info, ListChecks, Edit2 } from 'lucide-react';
import UnidadeHeader from '@/components/unidade/UnidadeHeader';
import { useUnidadeData } from '@/components/hooks/useUnidadeData';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'react-hot-toast';

const EditCoverDialog = EditCoverSaidaDialog;

// Simple signature component using canvas directly
const SimpleSignaturePad = React.forwardRef(({ isDark }, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpi = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpi;
    canvas.height = canvas.offsetHeight * dpi;
    ctx.scale(dpi, dpi);
    ctx.fillStyle = isDark ? '#374151' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isDark]);

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const point = getCanvasPoint(e);
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const point = getCanvasPoint(e);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.closePath();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = isDark ? '#374151' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  React.useImperativeHandle(ref, () => ({
    clear,
    toDataURL: (type = 'image/png', quality = 0.92) => canvasRef.current?.toDataURL(type, quality),
    isEmpty: () => {
        const canvas = canvasRef.current;
        if (!canvas) return true;

        const blankCanvas = document.createElement('canvas');
        blankCanvas.width = canvas.width;
        blankCanvas.height = canvas.height;
        const blankCtx = blankCanvas.getContext('2d');
        blankCtx.fillStyle = isDark ? '#374151' : '#ffffff';
        blankCtx.fillRect(0, 0, blankCanvas.width, blankCanvas.height);

        return canvas.toDataURL() === blankCanvas.toDataURL();
    }
  }));

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full cursor-crosshair touch-none ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'}`}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
    />
  );
});



const translations = {
  pt: {
    title: "Preencher Relatório de Saída",
    backToReports: "Voltar para Relatórios",
    reportName: "Nome do Relatório",
    fileName: "Nome do Arquivo",
    tenant: "Locatário",
    representatives: "Representantes",
    save: "Salvar Relatório",
    saving: "Salvando...",
    saved: "Salvo com sucesso!",
    errorSaving: "Erro ao salvar",
    comment: "Comentário",
    selectAnswer: "Selecione a resposta",
    photographicRecord: "Registro Fotográfico",
    uploading: "Enviando...",
    addPhoto: "Adicionar Foto",
    removePhoto: "Remover",
    photoCaption: "Adicione uma legenda para esta foto...",
    addLegend: "Adicionar Legenda",
    noPhotosYet: "Nenhuma foto adicionada ainda. Clique em 'Adicionar Foto' para começar.",
    cancel: "Cancelar",
    errorTitle: "Erro ao carregar dados",
    formNotFound: "Formulário ou relatório não encontrados, ou IDs inválidos.",
    backToProjects: "Voltar para Empreendimentos",
    missingIDs: "IDs Ausentes na URL",
    missingIDsMessage: "Alguns identificadores necessários estão ausentes na URL.",
    loadingForm: "Carregando formulário...",
    generalInfo: "Informações Gerais do Relatório",
    reportNamePlaceholder: "Ex: Saída Locatário - Janeiro 2026",
    exitDate: "Data da 1ª Vistoria",
    secondInspectionDate: "Data da 2ª Vistoria",
    reportDate: "Data do Envio do Relatório",
    finalConsiderations: "4 - CONSIDERAÇÕES FINAIS",
    chooseOption: "Escolha uma opção...",
    fillField: "Preencha este campo",
    signature: "Assinatura",
    clear: "Limpar",
    sign: "Assinar",
    takePhoto: "Tirar Foto",
    capturePhoto: "Capturar Foto",
    cameraAccessError: "Erro ao acessar câmera. Verifique as permissões do navegador.",
    photoSaveError: "Erro ao salvar foto. Tente novamente.",
    reportForm: "Questionário do Relatório",
    inProgress: "Em Andamento",
    completed: "Concluído",
    cameraPermissionDenied: "Permissão de câmera negada. Por favor, habilite o acesso à câmera nas configurações do navegador.",
    cameraInUse: "A câmera está sendo usada por outro aplicativo. Feche outros apps e tente novamente.",
    cameraNotSupported: "Seu navegador não suporta acesso à câmera ou você está em uma conexão não segura (HTTP).",
    useUploadInstead: "Use o botão 'Adicionar Foto' para fazer upload de imagens.",
  },
  en: {
    title: "Fill Exit Report",
    backToReports: "Back to Reports",
    reportName: "Report Name",
    fileName: "File Name",
    tenant: "Tenant",
    representatives: "Representatives",
    save: "Save Report",
    saving: "Saving...",
    saved: "Saved successfully!",
    errorSaving: "Error saving",
    comment: "Comment",
    selectAnswer: "Select answer",
    photographicRecord: "Photographic Record",
    uploading: "Uploading...",
    addPhoto: "Add Photo",
    removePhoto: "Remove",
    photoCaption: "Add a caption for this photo...",
    addLegend: "Add Caption",
    noPhotosYet: "No photos added yet. Click 'Add Photo' to get started.",
    cancel: "Cancel",
    errorTitle: "Error loading data",
    formNotFound: "Form or report not found, or invalid IDs.",
    backToProjects: "Back to Projects",
    missingIDs: "Missing IDs in URL",
    missingIDsMessage: "Some required identifiers are missing in the URL.",
    loadingForm: "Loading form...",
    generalInfo: "General Report Information",
    reportNamePlaceholder: "Ex: Tenant Exit - January 2026",
    exitDate: "Date of 1st Inspection",
    secondInspectionDate: "Date of 2nd Inspection",
    reportDate: "Report Send Date",
    finalConsiderations: "4 - FINAL CONSIDERATIONS",
    chooseOption: "Choose an option...",
    fillField: "Fill this field",
    signature: "Signature",
    clear: "Clear",
    sign: "Sign",
    takePhoto: "Take Photo",
    capturePhoto: "Capture Photo",
    cameraAccessError: "Error accessing camera. Check browser permissions.",
    photoSaveError: "Error saving photo. Try again.",
    reportForm: "Report Questionnaire",
    inProgress: "In Progress",
    completed: "Completed",
    cameraPermissionDenied: "Camera permission denied. Please enable camera access in browser settings.",
    cameraInUse: "Camera is being used by another application. Close other apps and try again.",
    cameraNotSupported: "Your browser doesn't support camera access or you're on an insecure connection (HTTP).",
    useUploadInstead: "Use the 'Add Photo' button to upload images.",
  }
};

const getStatusColorClass = (color) => {
    switch (color) {
        case 'green': return 'bg-green-500';
        case 'red': return 'bg-red-500';
        case 'yellow': return 'bg-yellow-500';
        case 'blue': return 'bg-blue-500';
        case 'purple': return 'bg-purple-500';
        case 'gray': return 'bg-gray-500';
        default: return 'bg-gray-500';
    }
}

const ESTRUTURA_RELATORIO_SAIDA = [
  {
    nome_secao: 'OBJETIVOS',
    perguntas: [
      { pergunta: 'Este relatório tem como objetivo descrever e sinalizar os elementos que deverão ser adequados antes da desocupação do pavimento ocupado pelo atual LOCATÁRIO, para a devolução de unidade para a:', tipo: 'textarea' },
      { pergunta: 'O LOCATÁRIO é o responsável por todas as adequações e comprovações solicitadas para as seguintes disciplinas:', tipo: 'textarea' },
      { pergunta: 'Observação', tipo: 'textarea' },
    ]
  },
  {
    nome_secao: 'CHECK-LIST INICIAL DE VISTORIA',
    perguntas: []
  },
  {
    nome_secao: 'CHECK-LIST DE DOCUMENTAÇÃO',
    perguntas: [
      { pergunta: 'Laudo de manutenção e funcionamento do sistema de Ar Condicionado original, pela empresa responsável pela manutenção', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'Teste, Ajuste e Balanceamento do sistema de Ar Condicionado (Vavs, Evaporadoras, Comunicação com BMS), a ser realizado pela empresa de manutenção do sistema', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'Laudo de manutenção e funcionamento do sistema de Extração de fumaça', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'Laudo de integridade do sistema de Detecção e Alarme de Incêndio, a ser realizado por empresa homologada pelo condomínio', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'Laudo de estanqueidade da rede de sprinkler e validação da pressurização junto ao condomínio', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'Laudo de manutenção e funcionamento do sistema de esgoto à vácuo original, a ser realizado por empresa homologada pelo condomínio', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'As-Built de ARQUITETURA, incluindo projeto de piso e forro', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'As-Built de INSTALAÇÕES ELÉTRICAS, incluindo projeto de piso e forro', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'As-Built de INSTALAÇÕES HIDRÁULICAS, incluindo projeto de piso e forro', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'As-Built de AR CONDICIONADO, VENTILAÇÃO e EXAUSTÃO', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'As-Built de SISTEMAS DE COMBATE À INCÊNDIO', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'Apresentação da FAT atualizada', tipo: 'select', opcoes: [{ texto: 'Conforme', cor: 'green' }, { texto: 'Pendente', cor: 'red' }] },
      { pergunta: 'NOTA', tipo: 'textarea' },
    ]
  },
];

const CHECKLIST_INICIAL = [
  { pergunta: 'Utiliza depósitos em áreas comuns da edificação?', key: 'depositos_areas_comuns' },
  { pergunta: 'Possui sistema de Ar Condicionado adicional, além do disponibilizado pelo condomínio?', key: 'ar_condicionado_adicional' },
  { pergunta: 'Possui sistema de Geração de Energia adicional, além do disponibilizado pelo condomínio?', key: 'geracao_energia_adicional' },
  { pergunta: 'Possui outras intervenções, ambientes ou equipamentos em áreas comuns da edificação?', key: 'intervencoes_areas_comuns' },
  { pergunta: 'Existem sanitários adicionais no pavimento, além dos existentes na edificação?', key: 'sanitarios_adicionais' },
  { pergunta: 'Existem copas adicionais no pavimento, além das existentes na edificação?', key: 'copas_adicionais' },
  { pergunta: 'Existe CPD/IDF/MDF no pavimento?', key: 'cpd_idf_mdf' },
  { pergunta: 'Existem escadas adicionais, além das existentes na edificação?', key: 'escadas_adicionais' },
  { pergunta: 'Existem ambientes com uso atípico no pavimento ou em área comum?', key: 'uso_atipico' },
  { pergunta: 'Foi realizada intervenção em Hall de Elevadores do pavimento?', key: 'intervencao_hall_elevadores' },
  { pergunta: 'Locatário alterou alguma instalação original que deve ser adequada para a original?', key: 'alteracao_instalacao_original' },
  { pergunta: 'Pavimento deverá ser retornado em "conjunto", sendo que as instalações devem ser adequadas para não atravessarem a parede de divisão?', key: 'retorno_conjunto' },
];

const Pergunta = React.memo(({
  secaoIndex,
  perguntaIndex,
  pergunta,
  theme,
  language,
  respostas,
  fotos,
  uploadingPhotos,
  handleAnswerChange,
  handleMultipleImageUpload,
  handleRemoveImage,
  handleLegendChange,
  openCamera,
  openSignatureDialog,
}) => {
  const t = translations[language];
  const isDark = theme === 'dark';

  const chave = `secao_${secaoIndex}_pergunta_${perguntaIndex}`;
  const respostaAtual = respostas[chave] || { resposta: '', comentario: '' };
  const chaveImagem = `${chave}_imagem`;
  const fotosAtuais = fotos[chaveImagem] || [];
  const isUploading = uploadingPhotos[chaveImagem];

  const colorOptions = [
    { value: 'green', label: 'Verde' },
    { value: 'red', label: 'Vermelho' },
    { value: 'yellow', label: 'Amarelo' },
    { value: 'blue', label: 'Azul' },
    { value: 'purple', label: 'Roxo' },
    { value: 'gray', label: 'Cinza' },
  ];

  return (
    <div key={perguntaIndex} className="space-y-4">
      <div>
        <Label className={isDark ? 'text-gray-300' : ''}>{pergunta.pergunta}</Label>

        {(pergunta.tipo === 'select' || pergunta.tipo === 'select_with_photo') ? (
          <div className="space-y-3">
            <Select
              onValueChange={(value) => handleAnswerChange(secaoIndex, perguntaIndex, 'resposta', value)}
              value={respostaAtual.resposta || ''}
            >
              <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                <SelectValue placeholder={t.chooseOption} />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-gray-800 text-white' : ''}>
                {(pergunta.opcoes && pergunta.opcoes.length > 0) && (
                    pergunta.opcoes.map((opcao, idx) => (
                        <SelectItem key={idx} value={opcao.texto}>
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${getStatusColorClass(opcao.cor)}`} />
                                <span>{opcao.texto}</span>
                            </div>
                        </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>

            <Input
              placeholder={t.comment}
              value={respostaAtual.comentario}
              onChange={(e) => handleAnswerChange(secaoIndex, perguntaIndex, 'comentario', e.target.value)}
              className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
            />
          </div>
        ) : pergunta.tipo === 'textarea' ? (
          <Textarea
            value={respostaAtual.resposta}
            onChange={(e) => handleAnswerChange(secaoIndex, perguntaIndex, 'resposta', e.target.value)}
            placeholder={t.fillField}
            className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
            rows={3}
          />
        ) : pergunta.tipo === 'checkbox' ? (
          <div className="space-y-3">
            <Input
              value={respostaAtual.resposta}
              onChange={(e) => handleAnswerChange(secaoIndex, perguntaIndex, 'resposta', e.target.value)}
              placeholder={t.fillField}
              className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
            />
            <div className="space-y-2">
              {(pergunta.opcoes || []).map((opcao, idx) => (
                <label key={idx} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(respostaAtual.comentario || '').includes(opcao.texto)}
                    onChange={(e) => {
                      const current = respostaAtual.comentario || '';
                      const items = current.split(',').map(s => s.trim()).filter(Boolean);
                      let newValue;
                      if (e.target.checked) {
                        newValue = [...items, opcao.texto].join(', ');
                      } else {
                        newValue = items.filter(item => item !== opcao.texto).join(', ');
                      }
                      handleAnswerChange(secaoIndex, perguntaIndex, 'comentario', newValue);
                    }}
                    className="w-4 h-4"
                  />
                  <span className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className={`h-2 w-2 rounded-full ${getStatusColorClass(opcao.cor)}`} />
                    {opcao.texto}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : pergunta.tipo === 'date' ? (
          <Input
            type="date"
            value={respostaAtual.resposta}
            onChange={(e) => handleAnswerChange(secaoIndex, perguntaIndex, 'resposta', e.target.value)}
            className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
          />
        ) : pergunta.tipo === 'signature' ? (
          <div>
            <div className={`border rounded-md p-2 h-40 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50'}`}>
                {respostaAtual.resposta ? (
                    <img src={respostaAtual.resposta} alt={t.signature} className="h-full w-full object-contain" />
                ) : (
                    <p className={`text-center flex items-center justify-center h-full ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t.signature}
                    </p>
                )}
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openSignatureDialog(secaoIndex, perguntaIndex);
                }}
                variant="outline"
              >
                {respostaAtual.resposta ? 'Atualizar' : t.sign}
              </Button>
              {respostaAtual.resposta && (
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAnswerChange(secaoIndex, perguntaIndex, 'resposta', '');
                    }}
                    variant="outline"
                  >
                      {t.clear}
                  </Button>
              )}
            </div>
          </div>
        ) : pergunta.tipo === 'name_company' ? (
          <div className="space-y-3">
            <div>
              <Label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Nome</Label>
              <Input
                value={respostaAtual.resposta}
                onChange={(e) => handleAnswerChange(secaoIndex, perguntaIndex, 'resposta', e.target.value)}
                placeholder="Digite o nome..."
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>
            <div>
              <Label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Empresa</Label>
              <Input
                value={respostaAtual.comentario}
                onChange={(e) => handleAnswerChange(secaoIndex, perguntaIndex, 'comentario', e.target.value)}
                placeholder="Digite a empresa..."
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>
          </div>
        ) : (
          <Input
            value={respostaAtual.resposta}
            onChange={(e) => handleAnswerChange(secaoIndex, perguntaIndex, 'resposta', e.target.value)}
            placeholder={t.fillField}
            className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
          />
        )}

        {(pergunta.tipo === 'select_with_photo' || pergunta.tipo === 'file' || pergunta.tipo === 'foto_principal') && (
          <div className={`mt-4 p-4 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <h5 className={`text-sm font-medium flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Camera className="w-4 h-4" />
                {t.photographicRecord}
              </h5>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      handleMultipleImageUpload(secaoIndex, perguntaIndex, files);
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                  id={`image-upload-${chaveImagem}`}
                  disabled={isUploading}
                />
                <label
                  htmlFor={`image-upload-${chaveImagem}`}
                  className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded cursor-pointer transition-colors ${
                    isUploading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.uploading}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> {t.addPhoto}
                    </>
                  )}
                </label>
                <Button
                  type="button"
                  onClick={() => openCamera(chaveImagem)}
                  className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-indigo-700 text-white hover:bg-indigo-600'
                      : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  }`}
                >
                  <Camera className="w-4 h-4" /> {t.takePhoto}
                </Button>
              </div>
            </div>

            {fotosAtuais.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fotosAtuais.map((foto, imageIndex) => (
                  <div key={imageIndex} className={`relative group rounded border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'}`}>
                    <div className="aspect-video relative">
                      <img
                        src={foto.url}
                        alt={`Foto ${imageIndex + 1}`}
                        className="w-full h-full object-cover rounded-t"
                      />
                      <button
                        type="button"
                        onClick={(e) => handleRemoveImage(e, chaveImagem, imageIndex)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title={t.removePhoto}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3">
                      <Input
                        placeholder={t.addLegend}
                        value={foto.legenda || ''}
                        onChange={(e) => handleLegendChange(chaveImagem, imageIndex, e.target.value)}
                        className={`text-sm h-8 ${isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Camera className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t.noPhotosYet}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default function PreencherRelatorioSaida({ language = 'pt', theme = 'light' }) {
  const navigate = useNavigate();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const unidadeId = urlParams.get('unidadeId');
  const empreendimentoId = urlParams.get('empreendimentoId');
  const relatorioId = urlParams.get('relatorioId');

  const { unidade, empreendimento, loading: loadingUnidade, error: errorUnidade } = useUnidadeData(unidadeId, empreendimentoId);

  const [relatorioSaida, setRelatorioSaida] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [unidadeExibicao, setUnidadeExibicao] = useState('');

  const [respostas, setRespostas] = useState({});
  const [fotos, setFotos] = useState({});
  const [uploadingPhotos, setUploadingPhotos] = useState({});
  const [detalhamentoAdequacoes, setDetalhamentoAdequacoes] = useState({});
  const [descricaoGeralAdequacoes, setDescricaoGeralAdequacoes] = useState({});

  const [nomeRelatorio, setNomeRelatorio] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [consultorResponsavel, setConsultorResponsavel] = useState('');
  const [dataSaida, setDataSaida] = useState(new Date().toISOString().substring(0, 10));
  const [dataSegundaVistoria, setDataSegundaVistoria] = useState('');
  const [dataRelatorio, setDataRelatorio] = useState(new Date().toISOString().substring(0, 10));
  const [locatario, setLocatario] = useState('');
  const [subtituloCapa, setSubtituloCapa] = useState('SAÍDA DE LOCATÁRIO');
  const [enderecoCapa, setEnderecoCapa] = useState('');
  const [representantes, setRepresentantes] = useState('');
  const [statusSaida, setStatusSaida] = useState('Em Andamento');
  const [revisao, setRevisao] = useState('');
  const [observacoesSecoes, setObservacoesSecoes] = useState({});
  const [textoOsProposta, setTextoOsProposta] = useState('');
  const [checklistInicial, setChecklistInicial] = useState({});
  const [declaracoes, setDeclaracoes] = useState({});
  const [consideracoesFinais, setConsideracoesFinais] = useState('');
  const [editCoverOpen, setEditCoverOpen] = useState(false);

  const handleDetalhamentoPhotoUpload = async (areaKey, itemKey, files) => {
    const photoKey = `${areaKey}_${itemKey}_fotos`;
    setUploadingPhotos(prev => ({ ...prev, [photoKey]: true }));

    try {
      const novasFotos = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        novasFotos.push({ url: file_url, legenda: '' });
      }
      
      setDetalhamentoAdequacoes(prev => ({
        ...prev,
        [photoKey]: [...(prev[photoKey] || []), ...novasFotos]
      }));
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload das fotos");
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [photoKey]: false }));
    }
  };

  const t = translations[language];
  const isDark = theme === 'dark';

  const [showCameraModal, setShowCameraModal] = useState(false);
  const [currentCameraKey, setCurrentCameraKey] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [activeSignature, setActiveSignature] = useState(null);
  const [signatureMode, setSignatureMode] = useState('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const signaturePadRef = useRef(null);

  const isValidId = (id) => {
    return id &&
           String(id).trim() !== '' &&
           String(id).trim() !== 'null' &&
           String(id).trim() !== 'undefined';
  };

  const hasValidIds = isValidId(unidadeId) && isValidId(empreendimentoId);

  const normalizeOptions = (options) => {
    if (!options || !Array.isArray(options)) return [];
    return options.map(option => {
      if (typeof option === 'string') {
        return { texto: option, cor: 'gray' };
      }
      return { texto: option.texto || '', cor: option.cor || 'gray' };
    });
  };

  const loadFormForNewReport = useCallback(() => {
    setFormulario({ secoes: ESTRUTURA_RELATORIO_SAIDA });
  }, []);

  const loadExistingReport = useCallback(async (relatorioIdToLoad) => {
    try {
      const relatoriosLoaded = await RelatorioSaida.filter({ id: relatorioIdToLoad });

      if (!relatoriosLoaded || relatoriosLoaded.length === 0) {
        setRelatorioSaida(null);
        setFormulario(null);
        return;
      }

      const relatorioData = relatoriosLoaded[0];
      setRelatorioSaida(relatorioData);

      setFormulario({ secoes: ESTRUTURA_RELATORIO_SAIDA });

      setNomeRelatorio(relatorioData.nome_relatorio || '');
      setNomeArquivo(relatorioData.nome_arquivo || '');
      setConsultorResponsavel(relatorioData.consultor_responsavel || '');
      if (relatorioData.data_saida) {
        setDataSaida(new Date(relatorioData.data_saida).toISOString().substring(0, 10)); 
      }
      if (relatorioData.data_segunda_vistoria) {
        setDataSegundaVistoria(new Date(relatorioData.data_segunda_vistoria).toISOString().substring(0, 10));
      }
      if (relatorioData.data_relatorio) {
        setDataRelatorio(new Date(relatorioData.data_relatorio).toISOString().substring(0, 10));
      }
      setLocatario(relatorioData.locatario || '');
      setSubtituloCapa(relatorioData.subtitulo_capa || 'SAÍDA DE LOCATÁRIO');
      setEnderecoCapa(relatorioData.endereco_capa || '');
      setUnidadeExibicao(relatorioData.unidade_exibicao || '');
      setRepresentantes(relatorioData.representantes || '');
      setStatusSaida(relatorioData.status_saida || 'Em Andamento');
      setObservacoesSecoes(relatorioData.observacoes_secoes || {});
      setTextoOsProposta(relatorioData.texto_os_proposta || '');
      setRevisao(relatorioData.revisao || '');
      setChecklistInicial(relatorioData.checklist_inicial || {});
      setDeclaracoes(relatorioData.declaracoes || {});
      setConsideracoesFinais(relatorioData.consideracoes_finais || '');
      setDetalhamentoAdequacoes(relatorioData.detalhamento_adequacoes || {});
      setDescricaoGeralAdequacoes(relatorioData.descricao_geral_adequacoes || {});

      setRespostas(relatorioData.respostas || {});
      setFotos(relatorioData.fotos_secoes || {});
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      setRelatorioSaida(null);
      setFormulario(null);
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (hasValidIds) {
          await loadCurrentUser();
          if (isValidId(relatorioId)) {
            await loadExistingReport(relatorioId);
          } else {
            loadFormForNewReport();
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setFormulario(null);
      } finally {
        setLoading(false);
      }
    };

    if (hasValidIds) {
      loadData();
    }
  }, [unidadeId, empreendimentoId, relatorioId, hasValidIds]);

  useEffect(() => {
    if (currentUser && !relatorioId && !relatorioSaida && consultorResponsavel === '') {
      setConsultorResponsavel(currentUser.full_name || currentUser.email || '');
    }
  }, [currentUser, relatorioId, relatorioSaida, consultorResponsavel]);

  // Recarrega dados do relatório a cada 2 segundos se aberto
  useEffect(() => {
    if (!relatorioId || !isValidId(relatorioId)) return;
    
    const interval = setInterval(async () => {
      try {
        const updated = await RelatorioSaida.filter({ id: relatorioId });
        if (updated && updated.length > 0) {
          const dados = updated[0];
          if (dados.nome_relatorio !== nomeRelatorio || dados.endereco_capa !== enderecoCapa) {
            setNomeRelatorio(dados.nome_relatorio || '');
            setLocatario(dados.locatario || '');
            setEnderecoCapa(dados.endereco_capa || '');
          }
        }
      } catch (error) {
        console.error('Erro ao recarregar dados:', error);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [relatorioId, nomeRelatorio, enderecoCapa]);

  const handleAnswerChange = (secaoIndex, perguntaIndex, field, value) => {
    const chave = `secao_${secaoIndex}_pergunta_${perguntaIndex}`;
    
    setRespostas(prev => ({
      ...prev,
      [chave]: {
        ...prev[chave],
        [field]: value
      }
    }));
  };

  const handleMultipleImageUpload = async (secaoIndex, perguntaIndex, files) => {
    const chaveImagem = `secao_${secaoIndex}_pergunta_${perguntaIndex}_imagem`;
    setUploadingPhotos(prev => ({ ...prev, [chaveImagem]: true }));

    try {
      const novasFotos = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        novasFotos.push({ url: file_url, legenda: '' });
      }
      
      setFotos(prev => {
        const fotosAtuais = prev[chaveImagem] || [];
        return { ...prev, [chaveImagem]: [...fotosAtuais, ...novasFotos] };
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao fazer upload das fotos");
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [chaveImagem]: false }));
    }
  };

  const handleRemoveImage = (e, chaveImagem, indexToRemove) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFotos(prev => {
        const fotosAtuais = prev[chaveImagem] || [];
        const novasFotos = fotosAtuais.filter((_, index) => index !== indexToRemove);
        return { ...prev, [chaveImagem]: novasFotos };
    });
  };

  const handleLegendChange = (chaveImagem, imageIndex, novaLegenda) => {
      setFotos(prev => {
          const fotosAtuais = prev[chaveImagem] || [];
          const novasFotos = fotosAtuais.map((foto, index) =>
              index === imageIndex ? { ...foto, legenda: novaLegenda } : foto
          );
          return { ...prev, [chaveImagem]: novasFotos };
      });
  };

  const openCamera = async (perguntaKey) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error(t.cameraNotSupported + ' ' + t.useUploadInstead, {
        duration: 6000
      });
      return;
    }

    setCurrentCameraKey(perguntaKey);
    setShowCameraModal(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      setCameraStream(stream);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
      
      setShowCameraModal(false);
      setCurrentCameraKey(null);
      
      let errorMessage = t.cameraAccessError;
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = t.cameraPermissionDenied;
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = t.cameraInUse;
      } else if (error.name === 'NotSupportedError') {
        errorMessage = t.cameraNotSupported;
      }
      
      toast.error(errorMessage + ' ' + t.useUploadInstead, {
        duration: 6000
      });
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setCurrentCameraKey(null);
    setCapturing(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !currentCameraKey) return;

    setCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      try {
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        setFotos(prev => ({
          ...prev,
          [currentCameraKey]: [
            ...(prev[currentCameraKey] || []),
            { url: file_url, legenda: '' }
          ]
        }));

        closeCamera();
      } catch (error) {
        console.error("Erro ao salvar foto:", error);
        toast.error(t.photoSaveError);
      } finally {
        setCapturing(false);
      }
    }, 'image/jpeg', 0.9);
  };

  const openSignatureDialog = (source, id) => {
    if (source === 'declaracoes') {
      setActiveSignature({ source: 'declaracoes', id });
    } else {
      setActiveSignature({ secaoIndex: source, perguntaIndex: id });
    }
    setShowSignatureDialog(true);
  };

  const handleSaveSignature = async () => {
    if (!activeSignature) return;

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
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const fontSize = 60;
        ctx.font = `${fontSize}px Calibri`;
        
        const textWidth = ctx.measureText(typedSignature).width;
        const maxWidth = canvas.width * 0.9;
        
        if (textWidth > maxWidth) {
          ctx.save();
          const scale = maxWidth / textWidth;
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(scale, 1);
          ctx.fillText(typedSignature, 0, 0);
          ctx.restore();
        } else {
          ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
        }

        const signatureDataUrl = canvas.toDataURL('image/png', 0.92);
        
        if (activeSignature.source === 'declaracoes') {
          setDeclaracoes(prev => ({
            ...prev,
            [activeSignature.id]: { ...prev[activeSignature.id], assinatura: signatureDataUrl }
          }));
        } else {
          handleAnswerChange(
            activeSignature.secaoIndex,
            activeSignature.perguntaIndex,
            'resposta',
            signatureDataUrl
          );
        }
        setShowSignatureDialog(false);
        setActiveSignature(null);
        setTypedSignature('');
      } else {
        if (signaturePadRef.current) {
          if (!signaturePadRef.current.isEmpty()) {
            const signatureDataUrl = signaturePadRef.current.toDataURL();
            
            if (activeSignature.source === 'declaracoes') {
              setDeclaracoes(prev => ({
                ...prev,
                [activeSignature.id]: { ...prev[activeSignature.id], assinatura: signatureDataUrl }
              }));
            } else {
              handleAnswerChange(
                activeSignature.secaoIndex,
                activeSignature.perguntaIndex,
                'resposta',
                signatureDataUrl
              );
            }
            setShowSignatureDialog(false);
            setActiveSignature(null);
          } else {
            toast.error("Por favor, faça uma assinatura antes de salvar.");
          }
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

  const handleCloseSignatureDialog = () => {
    setShowSignatureDialog(false);
    setActiveSignature(null);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const parseDateSafe = (val) => {
        if (!val) return null;
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        return d.toISOString();
      };
      const dataSaidaIso = parseDateSafe(dataSaida);
      const dataSegundaVistoriaIso = parseDateSafe(dataSegundaVistoria);
      const dataRelatorioIso = parseDateSafe(dataRelatorio);

      const dataToSave = {
        id_formulario: null,
        estrutura_formulario: ESTRUTURA_RELATORIO_SAIDA,
        id_unidade: unidade?.id || unidadeId,
        id_empreendimento: empreendimento?.id || empreendimentoId,
        nome_relatorio: nomeRelatorio,
        nome_arquivo: nomeArquivo,
        data_saida: dataSaidaIso,
        data_segunda_vistoria: dataSegundaVistoriaIso,
        data_relatorio: dataRelatorioIso,
        consultor_responsavel: consultorResponsavel,
        locatario: locatario,
        subtitulo_capa: subtituloCapa,
        endereco_capa: enderecoCapa,
        unidade_exibicao: unidadeExibicao,
        representantes: representantes,
        status_saida: statusSaida,
        observacoes_secoes: observacoesSecoes,
        texto_os_proposta: textoOsProposta,
        respostas: respostas,
        fotos_secoes: fotos,
        revisao: revisao,
        checklist_inicial: checklistInicial,
        declaracoes: declaracoes,
        consideracoes_finais: consideracoesFinais,
        detalhamento_adequacoes: detalhamentoAdequacoes,
        descricao_geral_adequacoes: descricaoGeralAdequacoes,
      };

      if (relatorioSaida) {
        await RelatorioSaida.update(relatorioSaida.id, dataToSave);
        setRelatorioSaida({ ...relatorioSaida, ...dataToSave });
        toast.success(t.saved);
        navigate(createPageUrl(`EmpreendimentoRelatoriosSaida?empreendimentoId=${empreendimentoId}`));
      } else {
        const novoRelatorio = await RelatorioSaida.create(dataToSave);
        setRelatorioSaida(novoRelatorio);
        toast.success(t.saved);
        navigate(createPageUrl(`PreencherRelatorioSaida?relatorioId=${novoRelatorio.id}&unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`), { replace: true });
        return;
      }

    } catch (error) {
      console.error("Erro ao salvar relatório:", error);
      toast.error(t.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(createPageUrl(`EmpreendimentoRelatoriosSaida?empreendimentoId=${empreendimentoId}`));
  };

  const handleSaveCover = async (editedData) => {
   if (relatorioSaida) {
     try {
       const updatedData = {
         locatario: editedData.locatario || '',
         subtitulo_capa: editedData.subtitulo || '',
         endereco_capa: editedData.endereco || '',
         unidade_exibicao: editedData.unidade || ''
       };
        
        await RelatorioSaida.update(relatorioSaida.id, updatedData);
        
        // Recarrega o relatório com os dados atualizados
        const relatorioAtualizado = await RelatorioSaida.filter({ id: relatorioSaida.id });
        if (relatorioAtualizado && relatorioAtualizado.length > 0) {
          const dados = relatorioAtualizado[0];
          setRelatorioSaida(dados);
          setNomeRelatorio(dados.nome_relatorio || '');
          setLocatario(dados.locatario || '');
          setSubtituloCapa(dados.subtitulo_capa || '');
          setEnderecoCapa(dados.endereco_capa || '');
          setUnidadeExibicao(dados.unidade_exibicao || '');
        }
        
        toast.success('Campos da capa atualizados!');
      } catch (error) {
        console.error('Erro ao salvar capa:', error);
        toast.error('Erro ao salvar');
      }
    } else {
      setLocatario(editedData.locatario || '');
      setSubtituloCapa(editedData.subtitulo || '');
      setEnderecoCapa(editedData.endereco || '');
    }
  };

  if (!hasValidIds) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-8 text-center ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{t.missingIDs}</h2>
        <p className={`mb-6 max-w-md ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {t.missingIDsMessage}
        </p>
        <Button onClick={() => navigate(createPageUrl("Empreendimentos"))}
                className={isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToProjects}
        </Button>
        <Toaster />
      </div>
    );
  }

  if (loadingUnidade || loading) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <Loader2 className={`h-12 w-12 animate-spin mb-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          {t.loadingForm}
        </p>
        <Toaster />
      </div>
    );
  }

  if (errorUnidade) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-8 text-center ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{t.errorTitle}</h2>
        <p className={`mb-6 max-w-md ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {errorUnidade?.message || t.formNotFound}
        </p>
        <Button onClick={() => navigate(createPageUrl("Empreendimentos"))}
                className={isDark ? 'bg-blue-600 hover:bg-blue-700 text-black' : ''}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToProjects}
        </Button>
        <Toaster />
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50'}`}>
      <UnidadeHeader
        unidade={unidade}
        empreendimento={empreendimento}
        stats={{}}
        loading={loadingUnidade}
        language={language}
        theme={theme}
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.title}</h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {formulario?.nome_formulario || 'Relatório de Saída'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditCoverOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2"/>
            Editar Capa
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl(`EmpreendimentoRelatoriosSaida?empreendimentoId=${empreendimentoId}`))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.backToReports}
          </Button>
        </div>
      </div>

      {(nomeRelatorio || dataSaida) && (
        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {nomeRelatorio || 'Novo Relatório'}
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Data: {dataSaida ? new Date(dataSaida).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Não definida'}
                </p>
              </div>
              <Badge 
                className={`${
                  statusSaida === 'Concluído' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                }`}
              >
                {statusSaida || t.inProgress}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-4 w-full max-w-3xl mx-4 ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{t.takePhoto}</h3>
              <Button variant="ghost" onClick={closeCamera} className={isDark ? 'text-gray-400 hover:bg-gray-700' : ''}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="relative mb-4 overflow-hidden rounded-lg">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto object-cover"
                style={{ aspectRatio: '16/9' }}
              />
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={closeCamera} className={isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}>
                {t.cancel}
              </Button>
              <Button
                onClick={capturePhoto}
                disabled={capturing}
                className={isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
              >
                {capturing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.uploading}
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" /> {t.capturePhoto}
                  </>
                )}
              </Button>
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {showSignatureDialog && (
          <Dialog open={showSignatureDialog} onOpenChange={handleCloseSignatureDialog}>
              <DialogContent className={`max-w-md ${isDark ? 'bg-gray-800 text-white' : ''}`}>
                  <DialogHeader>
                      <DialogTitle className={isDark ? 'text-white' : ''}>{t.signature}</DialogTitle>
                      <DialogDescription className={isDark ? 'text-gray-400' : ''}>
                          Escolha entre desenhar ou digitar sua assinatura
                      </DialogDescription>
                  </DialogHeader>

                  <div className="flex gap-2 mb-4">
                      <Button
                          type="button"
                          variant={signatureMode === 'draw' ? 'default' : 'outline'}
                          onClick={() => setSignatureMode('draw')}
                          className="flex-1"
                      >
                          Desenhar
                      </Button>
                      <Button
                          type="button"
                          variant={signatureMode === 'type' ? 'default' : 'outline'}
                          onClick={() => setSignatureMode('type')}
                          className="flex-1"
                      >
                          Digitar
                      </Button>
                  </div>

                  {signatureMode === 'draw' ? (
                      <div className={`border rounded-md overflow-hidden h-52 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200'}`}>
                          <SimpleSignaturePad
                              ref={signaturePadRef}
                              isDark={isDark}
                          />
                      </div>
                  ) : (
                      <div className="space-y-2">
                          <Label className={isDark ? 'text-gray-300' : ''}>Digite sua assinatura</Label>
                          <Input
                              type="text"
                              value={typedSignature}
                              onChange={(e) => setTypedSignature(e.target.value)}
                              placeholder="Digite seu nome..."
                              className="text-sm"
                              style={{ fontFamily: 'Calibri, sans-serif' }}
                          />
                          <p className="text-xs text-gray-500">Será exibida em fonte Calibri</p>
                      </div>
                  )}

                  <DialogFooter className="flex justify-between">
                      {signatureMode === 'draw' && (
                          <Button
                            variant="outline"
                            onClick={handleClearSignature}
                            className={isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
                          >
                              {t.clear}
                          </Button>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <Button variant="ghost" onClick={handleCloseSignatureDialog}>
                            {t.cancel}
                        </Button>
                        <Button onClick={handleSaveSignature} className={isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}>
                            {t.save}
                        </Button>
                      </div>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      )}

      <form onSubmit={handleSalvar} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); }} className="space-y-6">
        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
              <Info className="w-6 h-6" /> {t.generalInfo}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_relatorio" className={isDark ? 'text-gray-300' : ''}>{t.reportName}</Label>
                <Input
                  id="nome_relatorio"
                  value={nomeRelatorio}
                  onChange={(e) => setNomeRelatorio(e.target.value)}
                  placeholder={t.reportNamePlaceholder}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_arquivo" className={isDark ? 'text-gray-300' : ''}>{t.fileName}</Label>
                <Input
                  id="nome_arquivo"
                  value={nomeArquivo}
                  onChange={(e) => setNomeArquivo(e.target.value)}
                  placeholder="Ex: RS001-2026..."
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revisao" className={isDark ? 'text-gray-300' : ''}>Revisão</Label>
                <Input
                  id="revisao"
                  value={revisao}
                  onChange={(e) => setRevisao(e.target.value)}
                  placeholder="Ex: 1.0, 1.1..."
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Empreendimento</Label>
                <div className={`p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
                  {empreendimento?.nome_empreendimento || '-'}
                </div>
              </div>
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Endereço</Label>
                <div className={`p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
                  {empreendimento?.endereco_empreendimento || '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Unidade</Label>
                <div className={`p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
                  {unidade?.unidade_empreendimento || '-'}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="locatario" className={isDark ? 'text-gray-300' : ''}>{t.tenant}</Label>
                <Input
                  id="locatario"
                  value={locatario}
                  onChange={(e) => setLocatario(e.target.value)}
                  placeholder="Nome do locatário..."
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="consultor_responsavel" className={isDark ? 'text-gray-300' : ''}>Consultor Responsável</Label>
                  <Input
                    id="consultor_responsavel"
                    value={consultorResponsavel}
                    onChange={(e) => setConsultorResponsavel(e.target.value)}
                    placeholder="Nome do consultor..."
                    className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_saida" className={isDark ? 'text-gray-300' : ''}>{t.exitDate}</Label>
                  <Input
                    id="data_saida"
                    type="date"
                    value={dataSaida}
                    onChange={(e) => setDataSaida(e.target.value)}
                    className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_segunda_vistoria" className={isDark ? 'text-gray-300' : ''}>{t.secondInspectionDate}</Label>
                  <Input
                    id="data_segunda_vistoria"
                    type="date"
                    value={dataSegundaVistoria}
                    onChange={(e) => setDataSegundaVistoria(e.target.value)}
                    className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="representantes" className={isDark ? 'text-gray-300' : ''}>{t.representatives}</Label>
                  <Textarea
                    id="representantes"
                    value={representantes}
                    onChange={(e) => setRepresentantes(e.target.value)}
                    placeholder={"Digite um nome por linha\nEx:\nThais Motta - SYN\nBreno Goncalves - SYN"}
                    rows={4}
                    className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_relatorio" className={isDark ? 'text-gray-300' : ''}>{t.reportDate}</Label>
                  <Input
                    id="data_relatorio"
                    type="date"
                    value={dataRelatorio}
                    onChange={(e) => setDataRelatorio(e.target.value)}
                    className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="os_proposta" className={isDark ? 'text-gray-300' : ''}>Nº da proposta</Label>
              <Input
                id="os_proposta"
                value={textoOsProposta}
                onChange={(e) => setTextoOsProposta(e.target.value)}
                placeholder="Descrição da OS/Proposta..."
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>
          </CardContent>
        </Card>

        {formulario?.secoes?.length > 0 && (
          <Card className={isDark ? 'bg-gray-800' : ''}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                <ListChecks />
                {t.reportForm}
              </CardTitle>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {formulario?.nome_formulario}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {formulario.secoes.filter(s => !s.nome_secao?.toUpperCase().includes('DADOS DO EMPREENDIMENTO') && !s.nome_secao?.toUpperCase().includes('DETALHAMENTO DAS ADEQUAÇÕES') && !s.nome_secao?.toUpperCase().includes('DESCRIÇÃO GERAL DAS ADEQUAÇÕES') && !s.nome_secao?.toUpperCase().includes('DECLARAÇÕES')).map((secao, secaoIndex) => (
               <React.Fragment key={`form-section-${secaoIndex}`}>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                    <h3 className="text-lg font-semibold mb-4">{secao.nome_secao}</h3>
                    <div className="space-y-4">
                      {(() => {
                        const isDadosSection = secao.nome_secao?.toUpperCase().includes('DADOS DO EMPREENDIMENTO');
                        const SKIP = ['representantes', 'data da 2ª vistoria', 'data da 2a vistoria', 'data 1º relatório', 'data 1o relatório', 'data 1° relatório', 'data 2º relatório', 'data 2o relatório', 'data 2° relatório'];
                        return secao.perguntas?.filter(p => !isDadosSection || !SKIP.some(s => p.pergunta?.toLowerCase().includes(s))).map((pergunta, perguntaIndex) => (
                        <Pergunta
                          key={perguntaIndex}
                          secaoIndex={secaoIndex}
                          perguntaIndex={perguntaIndex}
                          pergunta={pergunta}
                          theme={theme}
                          language={language}
                          respostas={respostas}
                          fotos={fotos}
                          uploadingPhotos={uploadingPhotos}
                          handleAnswerChange={handleAnswerChange}
                          handleMultipleImageUpload={handleMultipleImageUpload}
                          handleRemoveImage={handleRemoveImage}
                          handleLegendChange={handleLegendChange}
                          openCamera={openCamera}
                          openSignatureDialog={openSignatureDialog}
                          />
                          ))
                          })()}
                          </div>
                          </div>
                  {secao.nome_secao?.toUpperCase().includes('DOCUMENTAÇÃO') && (
                   <>
                  <div className={`p-4 rounded-lg border-2 border-green-200 ${isDark ? 'bg-gray-700/50' : 'bg-green-50'}`}>
                    <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                      <ListChecks className="w-5 h-5" /> DETALHAMENTO DAS ADEQUAÇÕES
                    </h3>
                    <div className="space-y-4">
                      {Array.from({ length: 15 }, (_, i) => i + 1).map((areaNum) => {
                        const areaKey = `area_${areaNum}`;
                        const areaData = detalhamentoAdequacoes[areaKey] || {};
                        const situacaoItems = [
                          { label: 'SITUAÇÃO ATUAL', key: 'situacao_atual' },
                          { label: 'SITUAÇÃO ADEQUADA', key: 'situacao_adequada' }
                        ];
                        return (
                          <div key={areaKey} className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            {/* ÁREA X CONFORME PLANTA header */}
                            <p className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>ÁREA {areaNum} CONFORME PLANTA</p>
                            {/* Título da Área */}
                            <div className="space-y-1 mb-3">
                              <Label className={`block text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Título da Área</Label>
                              <Input
                                placeholder={`Ex: HALL DOS ELEVADORES`}
                                value={areaData.titulo || ''}
                                onChange={(e) => setDetalhamentoAdequacoes(prev => ({
                                  ...prev,
                                  [areaKey]: { ...prev[areaKey], titulo: e.target.value }
                                }))}
                                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                              />
                            </div>
                            {/* Detalhamento das adequações */}
                            <div className="space-y-1 mb-4">
                              <Label className={`block text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Detalhamento das adequações</Label>
                              <Textarea
                                placeholder={`Descrição geral da área ${areaNum}...`}
                                value={descricaoGeralAdequacoes[areaKey] || ''}
                                onChange={(e) => setDescricaoGeralAdequacoes(prev => ({
                                  ...prev,
                                  [areaKey]: e.target.value
                                }))}
                                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                rows={3}
                              />
                            </div>
                            {/* SITUAÇÃO ATUAL + SITUAÇÃO ADEQUADA */}
                            {situacaoItems.map((item) => {
                              const itemData = areaData[item.key] || { status: '', comentario: '', fotos: [] };
                              const photoKey = `${areaKey}_${item.key}_fotos`;
                              const currentPhotos = itemData.fotos || [];
                              const isUploading = uploadingPhotos[photoKey];
                              return (
                                <div key={item.key} className="space-y-3 mb-3">
                                  <Label className={`block font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.label}</Label>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1">
                                      <Select
                                        value={itemData.status || ''}
                                        onValueChange={(v) => setDetalhamentoAdequacoes(prev => ({
                                          ...prev,
                                          [areaKey]: { ...prev[areaKey], [item.key]: { ...itemData, status: v } }
                                        }))}
                                      >
                                        <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                                          <SelectValue placeholder={t.chooseOption} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Conforme"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">Conforme</span></SelectItem>
                                          <SelectItem value="Pendente"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">Pendente</span></SelectItem>
                                          <SelectItem value="N/A"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">N/A</span></SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {itemData.status && (
                                      <button type="button" onClick={() => setDetalhamentoAdequacoes(prev => ({
                                        ...prev,
                                        [areaKey]: { ...prev[areaKey], [item.key]: { ...itemData, status: '' } }
                                      }))} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                   <div className={`p-3 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}>
                                     <div className="flex items-center justify-between mb-2">
                                       <h5 className={`text-sm font-medium flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                         <Camera className="w-4 h-4" />
                                         {t.photographicRecord}
                                       </h5>
                                       <div className="flex items-center gap-2">
                                         <input
                                           type="file"
                                           accept="image/*"
                                           multiple
                                           onChange={(e) => {
                                             const files = Array.from(e.target.files || []);
                                             if (files.length > 0) {
                                               setUploadingPhotos(prev => ({ ...prev, [photoKey]: true }));
                                               (async () => {
                                                 try {
                                                   const novasFotos = [];
                                                   for (const file of files) {
                                                     const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                                     novasFotos.push({ url: file_url, legenda: '' });
                                                   }
                                                   setDetalhamentoAdequacoes(prev => ({
                                                     ...prev,
                                                     [areaKey]: {
                                                       ...prev[areaKey],
                                                       [item.key]: { ...itemData, fotos: [...(itemData.fotos || []), ...novasFotos] }
                                                     }
                                                   }));
                                                 } catch (error) {
                                                   console.error("Erro ao fazer upload:", error);
                                                   toast.error("Erro ao fazer upload das fotos");
                                                 } finally {
                                                   setUploadingPhotos(prev => ({ ...prev, [photoKey]: false }));
                                                 }
                                               })();
                                             }
                                             e.target.value = '';
                                           }}
                                           className="hidden"
                                           id={`image-upload-${photoKey}`}
                                           disabled={isUploading}
                                         />
                                         <label
                                           htmlFor={`image-upload-${photoKey}`}
                                           className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded cursor-pointer transition-colors ${
                                             isUploading
                                               ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                               : 'bg-blue-500 text-white hover:bg-blue-600'
                                           }`}
                                         >
                                           {isUploading ? (
                                             <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t.uploading}</>
                                           ) : (
                                             <><Upload className="w-4 h-4" /> {t.addPhoto}</>
                                           )}
                                         </label>
                                       </div>
                                     </div>
                                     {currentPhotos.length > 0 ? (
                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                         {currentPhotos.map((foto, idx) => (
                                           <div key={idx} className={`relative group rounded border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'}`}>
                                             <div className="aspect-video relative">
                                               <img src={foto.url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover rounded-t" />
                                               <button
                                                 type="button"
                                                 onClick={(e) => {
                                                   e.preventDefault();
                                                   setDetalhamentoAdequacoes(prev => ({
                                                     ...prev,
                                                     [areaKey]: {
                                                       ...prev[areaKey],
                                                       [item.key]: { ...itemData, fotos: currentPhotos.filter((_, i) => i !== idx) }
                                                     }
                                                   }));
                                                 }}
                                                 className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                                 title={t.removePhoto}
                                               >
                                                 <X className="w-4 h-4" />
                                               </button>
                                             </div>
                                             <div className="p-2">
                                               <Input
                                                 placeholder={t.addLegend}
                                                 value={foto.legenda || ''}
                                                 onChange={(e) => {
                                                   setDetalhamentoAdequacoes(prev => ({
                                                     ...prev,
                                                     [areaKey]: {
                                                       ...prev[areaKey],
                                                       [item.key]: { ...itemData, fotos: currentPhotos.map((f, i) => i === idx ? { ...f, legenda: e.target.value } : f) }
                                                     }
                                                   }));
                                                 }}
                                                 className={`text-sm h-8 ${isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                                               />
                                             </div>
                                           </div>
                                         ))}
                                       </div>
                                     ) : (
                                       <div className="text-center py-4">
                                         <Camera className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                         <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                           {t.noPhotosYet}
                                         </p>
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         );
                       })}
                     </div>
                     </div>
                     </>
                     )}
                  {secao.nome_secao?.toUpperCase().includes('CHECK-LIST INICIAL DE VISTORIA') && (
                    <div className={`p-4 rounded-lg border-2 border-blue-200 ${isDark ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                      <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                        <ListChecks className="w-5 h-5" /> CHECK-LIST INICIAL DE VISTORIA
                      </h3>
                      <div className="space-y-4">
                        {CHECKLIST_INICIAL.map((item) => (
                          <div key={item.key} className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="space-y-3">
                              <div>
                                <Label className={`block mb-2 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.pergunta}</Label>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <Select
                                      value={checklistInicial[item.key]?.resposta || ''}
                                      onValueChange={(v) => setChecklistInicial(prev => ({ ...prev, [item.key]: { ...prev[item.key], resposta: v } }))}
                                    >
                                      <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                                        <SelectValue placeholder={t.chooseOption}>
                                          {checklistInicial[item.key]?.resposta && (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                              checklistInicial[item.key].resposta === 'Sim' ? 'bg-green-100 text-green-800' :
                                              checklistInicial[item.key].resposta === 'Não' ? 'bg-red-100 text-red-800' :
                                              'bg-gray-100 text-gray-700'
                                            }`}>{checklistInicial[item.key].resposta}</span>
                                          )}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Sim"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">Sim</span></SelectItem>
                                        <SelectItem value="Não"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">Não</span></SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {checklistInicial[item.key]?.resposta && (
                                    <button type="button" onClick={() => setChecklistInicial(prev => ({ ...prev, [item.key]: { ...prev[item.key], resposta: '' } }))} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                <Textarea
                                  placeholder="Comentário"
                                  value={checklistInicial[item.key]?.comentario || ''}
                                  onChange={(e) => setChecklistInicial(prev => ({ ...prev, [item.key]: { ...prev[item.key], comentario: e.target.value } }))}
                                  className={`mt-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                                  rows={2}
                                />
                              </div>
                              <div>
                                <Label className={`block mb-2 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Se sim, será mantido?</Label>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <Select
                                      value={checklistInicial[item.key]?.mantido || ''}
                                      onValueChange={(v) => setChecklistInicial(prev => ({ ...prev, [item.key]: { ...prev[item.key], mantido: v } }))}
                                    >
                                      <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                                        <SelectValue placeholder={t.chooseOption}>
                                          {checklistInicial[item.key]?.mantido && (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                              checklistInicial[item.key].mantido === 'Sim' ? 'bg-green-100 text-green-800' :
                                              checklistInicial[item.key].mantido === 'Não' ? 'bg-red-100 text-red-800' :
                                              'bg-gray-100 text-gray-700'
                                            }`}>{checklistInicial[item.key].mantido}</span>
                                          )}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Sim"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">Sim</span></SelectItem>
                                        <SelectItem value="Não"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">Não</span></SelectItem>
                                        <SelectItem value="N/A"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">N/A</span></SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {checklistInicial[item.key]?.mantido && (
                                    <button type="button" onClick={() => setChecklistInicial(prev => ({ ...prev, [item.key]: { ...prev[item.key], mantido: '' } }))} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                <Textarea
                                  placeholder="Comentário"
                                  value={checklistInicial[item.key]?.comentario_mantido || ''}
                                  onChange={(e) => setChecklistInicial(prev => ({ ...prev, [item.key]: { ...prev[item.key], comentario_mantido: e.target.value } }))}
                                  className={`mt-2 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        </div>
                        </div>
                        )}
                        </React.Fragment>
                        ))}
                        </CardContent>
                        </Card>
                        )}

                        {formulario && (
                        <Card className={isDark ? 'bg-gray-800' : ''}>
                        <CardHeader>
                        <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                        {t.finalConsiderations}
                        </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                        <Textarea
                          value={consideracoesFinais}
                          onChange={(e) => setConsideracoesFinais(e.target.value)}
                          placeholder={"Digite as considerações finais, uma por linha\nEx:\n- Item 1\n- Item 2\n- Item 3"}
                          rows={6}
                          className={isDark ? 'bg-gray-700 border-gray-600 text-white break-words' : 'break-words'}
                          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                        />
                        </CardContent>
                        </Card>
                        )}

                        {formulario && (
                        <Card className={isDark ? 'bg-gray-800' : ''}>
                        <CardHeader>
                        <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
                        5 - DECLARAÇÕES (1º VISTORIA)
                        </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                        <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Os representantes abaixo declaram ter participado da 1ª vistoria de devolução de unidade e informam que estão de acordo com as informações apresentadas neste laudo
                        </p>
                        </div>

                        {/* Row 1: 2 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          { id: 'locatario', label: 'Representante LOCATÁRIO' },
                          { id: 'consultor', label: 'CONSULTOR RESPONSÁVEL' },
                        ].map((bloco) => (
                        <div key={bloco.id} className={`p-4 rounded-lg border-2 ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <Label className={`block font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{bloco.label}</Label>
                        <div className="space-y-3">
                        <div><Label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Nome</Label><Input value={declaracoes[bloco.id]?.nome || ''} onChange={(e) => setDeclaracoes(prev => ({ ...prev, [bloco.id]: { ...prev[bloco.id], nome: e.target.value } }))} placeholder="Digite o nome..." className={isDark ? 'bg-gray-700 border-gray-600 text-white mt-1' : 'mt-1'} /></div>
                        <div><Label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Empresa</Label><Input value={declaracoes[bloco.id]?.empresa || ''} onChange={(e) => setDeclaracoes(prev => ({ ...prev, [bloco.id]: { ...prev[bloco.id], empresa: e.target.value } }))} placeholder="Digite a empresa..." className={isDark ? 'bg-gray-700 border-gray-600 text-white mt-1' : 'mt-1'} /></div>
                        <div><Label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Assinatura</Label><div className={`border rounded-md p-2 h-32 mt-1 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>{declaracoes[bloco.id]?.assinatura ? <img src={declaracoes[bloco.id].assinatura} alt="Assinatura" className="h-full w-full object-contain" /> : <p className={`text-center flex items-center justify-center h-full ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Assinatura</p>}</div><div className="flex gap-2 mt-2"><Button type="button" onClick={() => openSignatureDialog('declaracoes', bloco.id)} variant="outline" className="flex-1">{declaracoes[bloco.id]?.assinatura ? 'Atualizar' : 'Assinar'}</Button>{declaracoes[bloco.id]?.assinatura && <Button type="button" onClick={() => setDeclaracoes(prev => ({ ...prev, [bloco.id]: { ...prev[bloco.id], assinatura: '' } }))} variant="outline">Limpar</Button>}</div></div>
                        </div>
                        </div>
                        ))}
                        </div>
                        {/* Row 2: 2 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          { id: 'proprietario', label: 'Representante PROPRIETÁRIO' },
                          { id: 'proprietario_2', label: 'Representante PROPRIETÁRIO' },
                        ].map((bloco) => (
                        <div key={bloco.id} className={`p-4 rounded-lg border-2 ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <Label className={`block font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{bloco.label}</Label>
                        <div className="space-y-3">
                        <div><Label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Nome</Label><Input value={declaracoes[bloco.id]?.nome || ''} onChange={(e) => setDeclaracoes(prev => ({ ...prev, [bloco.id]: { ...prev[bloco.id], nome: e.target.value } }))} placeholder="Digite o nome..." className={isDark ? 'bg-gray-700 border-gray-600 text-white mt-1' : 'mt-1'} /></div>
                        <div><Label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Empresa</Label><Input value={declaracoes[bloco.id]?.empresa || ''} onChange={(e) => setDeclaracoes(prev => ({ ...prev, [bloco.id]: { ...prev[bloco.id], empresa: e.target.value } }))} placeholder="Digite a empresa..." className={isDark ? 'bg-gray-700 border-gray-600 text-white mt-1' : 'mt-1'} /></div>
                        <div><Label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Assinatura</Label><div className={`border rounded-md p-2 h-32 mt-1 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>{declaracoes[bloco.id]?.assinatura ? <img src={declaracoes[bloco.id].assinatura} alt="Assinatura" className="h-full w-full object-contain" /> : <p className={`text-center flex items-center justify-center h-full ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Assinatura</p>}</div><div className="flex gap-2 mt-2"><Button type="button" onClick={() => openSignatureDialog('declaracoes', bloco.id)} variant="outline" className="flex-1">{declaracoes[bloco.id]?.assinatura ? 'Atualizar' : 'Assinar'}</Button>{declaracoes[bloco.id]?.assinatura && <Button type="button" onClick={() => setDeclaracoes(prev => ({ ...prev, [bloco.id]: { ...prev[bloco.id], assinatura: '' } }))} variant="outline">Limpar</Button>}</div></div>
                        </div>
                        </div>
                        ))}
                        </div>
                        {/* Row 3 & 4: Condomínio full width */}
                        <div className="grid grid-cols-1 gap-6">
                        {[
                          { id: 'condominio', label: 'Representante CONDOMÍNIO' },
                          { id: 'condominio_2', label: 'Representante CONDOMÍNIO' },
                        ].map((bloco) => (
                        <div key={bloco.id} className={`p-4 rounded-lg border-2 ${isDark ? 'bg-gray-700/30 border-gray-600' : 'bg-white border-gray-200'}`}>
                        <Label className={`block font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{bloco.label}</Label>
                        <div className="space-y-3">
                        <div><Label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Nome</Label><Input value={declaracoes[bloco.id]?.nome || ''} onChange={(e) => setDeclaracoes(prev => ({ ...prev, [bloco.id]: { ...prev[bloco.id], nome: e.target.value } }))} placeholder="Digite o nome..." className={isDark ? 'bg-gray-700 border-gray-600 text-white mt-1' : 'mt-1'} /></div>
                        <div><Label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Empresa</Label><Input value={declaracoes[bloco.id]?.empresa || ''} onChange={(e) => setDeclaracoes(prev => ({ ...prev, [bloco.id]: { ...prev[bloco.id], empresa: e.target.value } }))} placeholder="Digite a empresa..." className={isDark ? 'bg-gray-700 border-gray-600 text-white mt-1' : 'mt-1'} /></div>
                        <div><Label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Assinatura</Label><div className={`border rounded-md p-2 h-32 mt-1 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>{declaracoes[bloco.id]?.assinatura ? <img src={declaracoes[bloco.id].assinatura} alt="Assinatura" className="h-full w-full object-contain" /> : <p className={`text-center flex items-center justify-center h-full ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Assinatura</p>}</div><div className="flex gap-2 mt-2"><Button type="button" onClick={() => openSignatureDialog('declaracoes', bloco.id)} variant="outline" className="flex-1">{declaracoes[bloco.id]?.assinatura ? 'Atualizar' : 'Assinar'}</Button>{declaracoes[bloco.id]?.assinatura && <Button type="button" onClick={() => setDeclaracoes(prev => ({ ...prev, [bloco.id]: { ...prev[bloco.id], assinatura: '' } }))} variant="outline">Limpar</Button>}</div></div>
                        </div>
                        </div>
                        ))}
                        </div>
                        </CardContent>
                        </Card>
                        )}

                        <EditCoverDialog
                        open={editCoverOpen}
                        onOpenChange={setEditCoverOpen}
                        data={{
                        subtitulo: subtituloCapa || 'SAÍDA DE LOCATÁRIO',
                        locatario: locatario || '',
                        unidade: unidade?.unidade_empreendimento || '',
                        endereco: enderecoCapa || ''
                        }}
                        onSave={handleSaveCover}
                        />

      <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleCancel}>
            {t.cancel}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t.save}
          </Button>
        </div>
      </form>
      <Toaster />
    </div>
  );
}