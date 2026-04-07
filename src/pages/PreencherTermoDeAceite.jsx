import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FormularioVistoria, TermoDeAceite, User } from '@/api/entities';
import { apiUrl } from '@/api/config.js';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Upload, X, Camera, AlertTriangle, Info, ListChecks, Plus } from 'lucide-react';
import UnidadeHeader from '@/components/unidade/UnidadeHeader';
import { useUnidadeData } from '@/components/hooks/useUnidadeData';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'react-hot-toast';

// Simple signature component
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
    title: "Preencher Termo de Aceite",
    backToTerms: "Voltar para Termos",
    termName: "Nome do Termo",
    fileName: "Nome do Arquivo",
    save: "Salvar Termo",
    saving: "Salvando...",
    saved: "Salvo com sucesso!",
    errorSaving: "Erro ao salvar",
    comment: "Comentário",
    selectAnswer: "Selecione a resposta",
    photographicRecord: "Registro Fotográfico",
    uploading: "Enviando...",
    addPhoto: "Adicionar Foto",
    removePhoto: "Remover",
    addLegend: "Adicionar Legenda",
    noPhotosYet: "Nenhuma foto adicionada ainda. Clique em 'Adicionar Foto' para começar.",
    cancel: "Cancelar",
    errorTitle: "Erro ao carregar dados",
    formNotFound: "Formulário não encontrado.",
    backToProjects: "Voltar para Empreendimentos",
    missingIDs: "IDs Ausentes na URL",
    missingIDsMessage: "Alguns identificadores necessários estão ausentes na URL.",
    loadingForm: "Carregando formulário...",
    generalInfo: "Informações Gerais do Termo",
    termNamePlaceholder: "Ex: Termo de Aceite Final...",
    termDate: "Data do Termo",
    reportDate: "Data do Relatório",
    consultantInCharge: "Consultor Responsável",
    representatives: "Participantes",
    representativesPlaceholder: "Nomes dos participantes, separados por vírgula",
    chooseOption: "Escolha uma opção...",
    fillField: "Preencha este campo",
    signature: "Assinatura",
    clear: "Limpar",
    sign: "Assinar",
    takePhoto: "Tirar Foto",
    capturePhoto: "Capturar Foto",
    cameraAccessError: "Erro ao acessar câmera. Verifique as permissões do navegador.",
    photoSaveError: "Erro ao salvar foto. Tente novamente.",
    termForm: "Questionário do Termo",
    cameraPermissionDenied: "Permissão de câmera negada.",
    cameraInUse: "A câmera está sendo usada por outro aplicativo.",
    cameraNotSupported: "Seu navegador não suporta acesso à câmera.",
    useUploadInstead: "Use o botão 'Adicionar Foto' para fazer upload.",
    photo: "Foto",
    addItem: "Adicionar Item",
    removeItem: "Remover Item",
    questionText: "Texto da pergunta",
  },
  en: {
    title: "Fill Acceptance Term",
    backToTerms: "Back to Terms",
    termName: "Term Name",
    fileName: "File Name",
    save: "Save Term",
    saving: "Saving...",
    saved: "Saved successfully!",
    errorSaving: "Error saving",
    comment: "Comment",
    selectAnswer: "Select answer",
    photographicRecord: "Photographic Record",
    uploading: "Uploading...",
    addPhoto: "Add Photo",
    removePhoto: "Remove",
    addLegend: "Add Caption",
    noPhotosYet: "No photos added yet.",
    cancel: "Cancel",
    errorTitle: "Error loading data",
    formNotFound: "Form not found.",
    backToProjects: "Back to Projects",
    missingIDs: "Missing IDs in URL",
    missingIDsMessage: "Some required identifiers are missing.",
    loadingForm: "Loading form...",
    generalInfo: "General Term Information",
    termNamePlaceholder: "Ex: Final Acceptance Term...",
    termDate: "Term Date",
    reportDate: "Report Date",
    consultantInCharge: "Consultant in Charge",
    representatives: "Participants",
    representativesPlaceholder: "Participant names, comma-separated",
    chooseOption: "Choose an option...",
    fillField: "Fill this field",
    signature: "Signature",
    clear: "Clear",
    sign: "Sign",
    takePhoto: "Take Photo",
    capturePhoto: "Capture Photo",
    cameraAccessError: "Error accessing camera.",
    photoSaveError: "Error saving photo.",
    termForm: "Term Questionnaire",
    cameraPermissionDenied: "Camera permission denied.",
    cameraInUse: "Camera is being used by another app.",
    cameraNotSupported: "Your browser doesn't support camera access.",
    useUploadInstead: "Use the 'Add Photo' button instead.",
    photo: "Photo",
    addItem: "Add Item",
    removeItem: "Remove Item",
    questionText: "Question text",
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
};

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
  isDynamic = false,
  onRemove = null,
  onUpdateText = null,
  onUpdateType = null,
}) => {
  const t = translations[language];
  const isDark = theme === 'dark';

  const chave = isDynamic ? `secao_${secaoIndex}_pergunta_dynamic_${perguntaIndex}` : `secao_${secaoIndex}_pergunta_${perguntaIndex}`;
  const respostaAtual = respostas[chave] || { resposta: '', comentario: '' };
  const chaveImagem = `${chave}_imagem`;
  const fotosAtuais = fotos[chaveImagem] || [];
  const isUploading = uploadingPhotos[chaveImagem];

  return (
    <div key={perguntaIndex} className={`space-y-4 ${isDynamic ? 'border-l-4 border-blue-400 pl-4' : ''}`}>
      <div>
        {isDynamic ? (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <Input
                value={pergunta.pergunta}
                onChange={(e) => onUpdateText(secaoIndex, perguntaIndex, e.target.value)}
                placeholder={t.questionText}
                className={`flex-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(secaoIndex, perguntaIndex)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Select
              value={pergunta.tipo}
              onValueChange={(value) => { console.debug('[DEBUG] Pergunta Select onValueChange', { secaoIndex, perguntaIndex, value }); onUpdateType(secaoIndex, perguntaIndex, value); }}
            >
              <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-gray-800 text-white' : ''}>
                <SelectItem value="foto_principal">Foto Principal (Destaque)</SelectItem>
                <SelectItem value="select">Seleção (Conforme, etc)</SelectItem>
                <SelectItem value="select_with_photo">Seleção (Conforme, etc) + Foto</SelectItem>
                <SelectItem value="text">Texto Curto</SelectItem>
                <SelectItem value="textarea">Texto Longo</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="signature">Assinatura</SelectItem>
                <SelectItem value="file">Foto</SelectItem>
                <SelectItem value="name_company">Nome / Empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <Label className={isDark ? 'text-gray-300' : ''}>{pergunta.pergunta}</Label>
        )}

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
                {(pergunta.opcoes && pergunta.opcoes.length > 0) && pergunta.opcoes.map((opcao, idx) => (
                  <SelectItem key={idx} value={opcao.texto}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${getStatusColorClass(opcao.cor)}`} />
                      <span>{opcao.texto}</span>
                    </div>
                  </SelectItem>
                ))}
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
                  className={`inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded cursor-pointer transition-colors ${isUploading
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
                  className="bg-indigo-500 hover:bg-indigo-600"
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
                        alt={`${t.photo} ${imageIndex + 1}`}
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

export default function PreencherTermoDeAceite({ language = 'pt', theme = 'light' }) {
  const navigate = useNavigate();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const unidadeId = urlParams.get('unidadeId');
  const empreendimentoId = urlParams.get('empreendimentoId');
  const termoId = urlParams.get('termoId');

  const { unidade, empreendimento, loading: loadingUnidade, error: errorUnidade } = useUnidadeData(unidadeId, empreendimentoId);

  const [termoDeAceite, setTermoDeAceite] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [nomeTermo, setNomeTermo] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [consultorResponsavel, setConsultorResponsavel] = useState('');
  const [dataTermo, setDataTermo] = useState(new Date().toISOString().substring(0, 10));
  const [dataRelatorio, setDataRelatorio] = useState(new Date().toISOString().substring(0, 10));
  const [representantes, setRepresentantes] = useState('');
  const [statusTermo, setStatusTermo] = useState('Em Andamento');
  const [revisao, setRevisao] = useState('');
  const [observacoesSecoes, setObservacoesSecoes] = useState({});
  const [textoOsProposta, setTextoOsProposta] = useState('');
  const [textoEscopoConsultoria, setTextoEscopoConsultoria] = useState('');
  const [dynamicQuestions, setDynamicQuestions] = useState({});

  const [respostas, setRespostas] = useState({});
  const [fotos, setFotos] = useState({});
  const [uploadingPhotos, setUploadingPhotos] = useState({});

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

  const t = translations[language];
  const isDark = theme === 'dark';

  const isValidId = (id) => {
    return id && String(id).trim() !== '' && String(id).trim() !== 'null' && String(id).trim() !== 'undefined';
  };

  // Permitimos acessar a página quando houver pelo menos o `empreendimentoId`.
  // Antes exigíamos `unidadeId` também, o que causava redirecionamentos indevidos.
  const hasValidIds = isValidId(empreendimentoId);

  useEffect(() => {
    console.log('[DEBUG] PreencherTermoDeAceite mount', { unidadeId, empreendimentoId, termoId, hasValidIds });
  }, [unidadeId, empreendimentoId, termoId, hasValidIds]);
  const normalizeOptions = (options) => {
    if (!options || !Array.isArray(options)) return [];
    return options.map(option => {
      if (typeof option === 'string') {
        return { texto: option, cor: 'gray' };
      }
      return { texto: option.texto || '', cor: option.cor || 'gray' };
    });
  };

  const loadFormForNewTerm = useCallback(async () => {
    try {
      const formDataArray = await FormularioVistoria.filter({
        nome_formulario: 'TERMO DE ACEITE - GERENCIAMENTO DE OBRA',
        status_formulario: 'Ativo'
      });

      if (Array.isArray(formDataArray) && formDataArray.length > 0) {
        const loadedForm = formDataArray[0];
        const normalizedSections = (loadedForm.secoes || []).map(secao => ({
          ...secao,
          perguntas: (secao.perguntas || []).map(pergunta => ({
            ...pergunta,
            opcoes: normalizeOptions(pergunta.opcoes)
          }))
        }));
        setFormulario({ ...loadedForm, secoes: normalizedSections });
        return;
      }

      // Se não encontrou formulário no backend, usamos um formulário padrão local (fallback)
      const fallbackForm = {
        id: null,
        nome_formulario: 'TERMO DE ACEITE - GERENCIAMENTO DE OBRA (Padrão)',
        descricao_formulario: null,
        status_formulario: 'Ativo',
        secoes: [
          {
            nome_secao: 'Informações Gerais',
            perguntas: [
              { pergunta: 'Nome do Termo', tipo: 'text', obrigatoria: false, opcoes: [] },
              { pergunta: 'Comentário Geral', tipo: 'textarea', obrigatoria: false, opcoes: [] }
            ]
          },
          {
            nome_secao: 'Registro Fotográfico',
            perguntas: [
              { pergunta: 'Foto 1', tipo: 'file', obrigatoria: false, opcoes: [] }
            ]
          }
        ]
      };
      const normalizedFallback = {
        ...fallbackForm, secoes: fallbackForm.secoes.map(secao => ({
          ...secao,
          perguntas: (secao.perguntas || []).map(p => ({ ...p, opcoes: normalizeOptions(p.opcoes) }))
        }))
      };
      console.warn('FormularioVistoria não encontrado no backend — usando fallback local');
      setFormulario(normalizedFallback);
    } catch (error) {
      console.error("Erro ao carregar formulário:", error);
      // Em caso de erro, também usamos fallback local para permitir preenchimento offline
      const fallbackForm = {
        id: null,
        nome_formulario: 'TERMO DE ACEITE - GERENCIAMENTO DE OBRA (Padrão)',
        descricao_formulario: null,
        status_formulario: 'Ativo',
        secoes: [
          {
            nome_secao: 'Informações Gerais',
            perguntas: [
              { pergunta: 'Nome do Termo', tipo: 'text', obrigatoria: false, opcoes: [] },
              { pergunta: 'Comentário Geral', tipo: 'textarea', obrigatoria: false, opcoes: [] }
            ]
          },
          {
            nome_secao: 'Registro Fotográfico',
            perguntas: [
              { pergunta: 'Foto 1', tipo: 'file', obrigatoria: false, opcoes: [] }
            ]
          }
        ]
      };
      const normalizedFallback = {
        ...fallbackForm, secoes: fallbackForm.secoes.map(secao => ({
          ...secao,
          perguntas: (secao.perguntas || []).map(p => ({ ...p, opcoes: normalizeOptions(p.opcoes) }))
        }))
      };
      setFormulario(normalizedFallback);
    }
  }, []);

  const loadExistingTerm = useCallback(async (termoIdToLoad) => {
    try {
      let termosLoaded = [];
      try {
        termosLoaded = await TermoDeAceite.filter({ id: termoIdToLoad });
      } catch (e) {
        console.warn('TermoDeAceite.filter falhou, tentando fallback debug:', e && e.message ? e.message : e);
        termosLoaded = [];
      }

      // Se não obteve resultados via API oficial, chamar endpoint debug como fallback
      if ((!termosLoaded || termosLoaded.length === 0) && empreendimentoId) {
        try {
          const resp = await fetch(apiUrl(`/api/debug/termos-aceite/${empreendimentoId}`));
          if (resp.ok) {
            const j = await resp.json();
            if (j && Array.isArray(j.rows) && j.rows.length > 0) {
              termosLoaded = j.rows.filter(r => String(r.id) === String(termoIdToLoad));
              if (termosLoaded.length === 0) {
                // tentar encontrar por id numérico
                termosLoaded = j.rows.filter(r => Number(r.id) === Number(termoIdToLoad));
              }
              console.warn('Fallback debug encontrou termos:', termosLoaded.length);
            }
          } else {
            console.warn('Fallback debug retornou status', resp.status);
          }
        } catch (e) {
          console.warn('Erro ao chamar fallback debug:', e);
        }
      }

      if (!termosLoaded || termosLoaded.length === 0) {
        setTermoDeAceite(null);
        setFormulario(null);
        return;
      }

      const termoData = termosLoaded[0];
      setTermoDeAceite(termoData);

      if (termoData.id_formulario) {
        const forms = await FormularioVistoria.filter({ id: termoData.id_formulario }).catch(() => []);
        if (forms.length > 0) {
          const loadedForm = forms[0];
          const normalizedSections = loadedForm.secoes.map(secao => ({
            ...secao,
            perguntas: secao.perguntas.map(pergunta => ({
              ...pergunta,
              opcoes: normalizeOptions(pergunta.opcoes)
            }))
          }));
          setFormulario({ ...loadedForm, secoes: normalizedSections });
        } else if (termoData.estrutura_formulario && Array.isArray(termoData.estrutura_formulario) && termoData.estrutura_formulario.length > 0) {
          // Se o formulário original não existe mais no backend, mas a estrutura está salva no termo,
          // usamos essa estrutura para permitir edição/visualização do termo salvo.
          const normalizedSections = termoData.estrutura_formulario.map(secao => ({
            ...secao,
            perguntas: (secao.perguntas || []).map(pergunta => ({
              ...pergunta,
              opcoes: normalizeOptions(pergunta.opcoes)
            }))
          }));
          setFormulario({ id: termoData.id_formulario || null, nome_formulario: termoData.nome_arquivo || 'Termo (salvo)', secoes: normalizedSections });
        } else {
          // último recurso: carregar formulário padrão local
          await loadFormForNewTerm();
        }
      } else if (termoData.estrutura_formulario && Array.isArray(termoData.estrutura_formulario) && termoData.estrutura_formulario.length > 0) {
        const normalizedSections = termoData.estrutura_formulario.map(secao => ({
          ...secao,
          perguntas: (secao.perguntas || []).map(pergunta => ({
            ...pergunta,
            opcoes: normalizeOptions(pergunta.opcoes)
          }))
        }));
        setFormulario({ id: null, nome_formulario: termoData.nome_arquivo || 'Termo (salvo)', secoes: normalizedSections });
      }

      setNomeTermo(termoData.nome_termo || '');
      setNomeArquivo(termoData.nome_arquivo || '');
      setConsultorResponsavel(termoData.consultor_responsavel || '');
      if (termoData.data_termo) {
        setDataTermo(new Date(termoData.data_termo).toISOString().substring(0, 10));
      }
      if (termoData.data_relatorio) {
        setDataRelatorio(new Date(termoData.data_relatorio).toISOString().substring(0, 10));
      }
      setRepresentantes(termoData.participantes || '');
      setStatusTermo(termoData.status_termo || 'Em Andamento');
      setObservacoesSecoes(termoData.observacoes_secoes || {});
      setTextoOsProposta(termoData.texto_os_proposta || '');
      setTextoEscopoConsultoria(termoData.texto_escopo_consultoria || '');
      setRevisao(termoData.revisao || '');
      setRespostas(termoData.respostas || {});
      setFotos(termoData.fotos_secoes || {});

      // Carregar perguntas dinâmicas da estrutura salva
      if (termoData.estrutura_formulario && Array.isArray(termoData.estrutura_formulario)) {
        const dynamicQs = {};
        termoData.estrutura_formulario.forEach((secao, secaoIndex) => {
          if (secao.perguntas) {
            const dynamicInSection = secao.perguntas.filter(p => p.isDynamic);
            if (dynamicInSection.length > 0) {
              dynamicQs[secaoIndex] = dynamicInSection;
            }
          }
        });
        setDynamicQuestions(dynamicQs);
      }

    } catch (error) {
      console.error("Erro ao carregar termo:", error);
      setTermoDeAceite(null);
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
          if (isValidId(termoId)) {
            await loadExistingTerm(termoId);
          } else {
            await loadFormForNewTerm();
          }
        }
      } catch (err) {
        console.error("Error loading term data:", err);
        setFormulario(null);
      } finally {
        setLoading(false);
      }
    };

    if (hasValidIds) {
      loadData();
    }
  }, [unidadeId, empreendimentoId, termoId, hasValidIds, loadExistingTerm, loadFormForNewTerm, loadCurrentUser]);

  useEffect(() => {
    if (currentUser && !termoId && !termoDeAceite && consultorResponsavel === '') {
      setConsultorResponsavel(currentUser.full_name || currentUser.email || '');
    }
  }, [currentUser, termoId, termoDeAceite, consultorResponsavel]);

  const handleAnswerChange = (secaoIndex, perguntaIndex, field, value) => {
    const chave = `secao_${secaoIndex}_pergunta_${perguntaIndex}`;
    setRespostas(prev => ({
      ...prev,
      [chave]: {
        ...prev[chave],
        [field]: value
      }
    }));

    if (field === 'resposta' && formulario?.secoes) {
      const secao = formulario.secoes[secaoIndex];
      if (secao && secao.nome_secao && secao.nome_secao.toUpperCase().includes('STATUS')) {
        setStatusTermo(value);
      }
    }
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
      toast.error(t.cameraNotSupported + ' ' + t.useUploadInstead, { duration: 6000 });
      return;
    }

    setCurrentCameraKey(perguntaKey);
    setShowCameraModal(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setCameraStream(stream);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      setShowCameraModal(false);
      setCurrentCameraKey(null);

      let errorMessage = t.cameraAccessError;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = t.cameraPermissionDenied;
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = t.cameraInUse;
      }

      toast.error(errorMessage + ' ' + t.useUploadInstead, { duration: 6000 });
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
        toast.error(t.photoSaveError);
      } finally {
        setCapturing(false);
      }
    }, 'image/jpeg', 0.9);
  };

  const openSignatureDialog = (secaoIndex, perguntaIndex) => {
    setActiveSignature({ secaoIndex, perguntaIndex });
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
        handleAnswerChange(activeSignature.secaoIndex, activeSignature.perguntaIndex, 'resposta', signatureDataUrl);
        setShowSignatureDialog(false);
        setActiveSignature(null);
        setTypedSignature('');
      } else {
        if (signaturePadRef.current) {
          if (!signaturePadRef.current.isEmpty()) {
            const signatureDataUrl = signaturePadRef.current.toDataURL();
            handleAnswerChange(activeSignature.secaoIndex, activeSignature.perguntaIndex, 'resposta', signatureDataUrl);
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

  const addDynamicQuestion = (secaoIndex, tipo = 'select_with_photo') => {
    const newQuestion = {
      pergunta: '',
      tipo: tipo,
      opcoes: tipo.includes('select') ? [
        { texto: 'Conforme', cor: 'green' },
        { texto: 'Não Conforme', cor: 'red' },
        { texto: 'Pendente', cor: 'yellow' }
      ] : [],
      obrigatoria: false,
      isDynamic: true
    };

    setDynamicQuestions(prev => ({
      ...prev,
      [secaoIndex]: [...(prev[secaoIndex] || []), newQuestion]
    }));
  };

  const updateDynamicQuestionType = (secaoIndex, questionIndex, newTipo) => {
    console.debug('[DEBUG] updateDynamicQuestionType called', { secaoIndex, questionIndex, newTipo });
    setDynamicQuestions(prev => {
      const updated = [...(prev[secaoIndex] || [])];
      updated[questionIndex] = {
        ...updated[questionIndex],
        tipo: newTipo,
        opcoes: newTipo.includes('select') ? [
          { texto: 'Conforme', cor: 'green' },
          { texto: 'Não Conforme', cor: 'red' },
          { texto: 'Pendente', cor: 'yellow' }
        ] : []
      };
      return { ...prev, [secaoIndex]: updated };
    });
  };

  const removeDynamicQuestion = (secaoIndex, questionIndex) => {
    setDynamicQuestions(prev => {
      const updated = [...(prev[secaoIndex] || [])];
      updated.splice(questionIndex, 1);
      return { ...prev, [secaoIndex]: updated };
    });

    // Remove respostas e fotos associadas
    const chave = `secao_${secaoIndex}_pergunta_dynamic_${questionIndex}`;
    const chaveImagem = `${chave}_imagem`;
    setRespostas(prev => {
      const updated = { ...prev };
      delete updated[chave];
      return updated;
    });
    setFotos(prev => {
      const updated = { ...prev };
      delete updated[chaveImagem];
      return updated;
    });
  };

  const updateDynamicQuestionText = (secaoIndex, questionIndex, text) => {
    setDynamicQuestions(prev => {
      const updated = [...(prev[secaoIndex] || [])];
      updated[questionIndex] = { ...updated[questionIndex], pergunta: text };
      return { ...prev, [secaoIndex]: updated };
    });
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSaving(true);

    let finalStatus = statusTermo;
    if (formulario && formulario.secoes) {
      let statusKey = null;
      formulario.secoes.forEach((secao, secaoIndex) => {
        if (secao.nome_secao.toUpperCase().includes('STATUS')) {
          if (secao.perguntas && secao.perguntas.length > 0) {
            statusKey = `secao_${secaoIndex}_pergunta_0`;
          }
        }
      });
      if (statusKey && respostas[statusKey] && respostas[statusKey].resposta) {
        finalStatus = respostas[statusKey].resposta;
      }
    }

    try {
      // Enviar apenas a porção YYYY-MM-DD para o backend (evita problemas de timezone)
      const dataTermoValue = dataTermo ? (String(dataTermo).substring(0, 10)) : null;
      const dataRelatorioValue = dataRelatorio ? (String(dataRelatorio).substring(0, 10)) : null;

      // Mesclar formulário original com perguntas dinâmicas
      const mergedSections = formulario?.secoes.map((secao, secaoIndex) => {
        const dynamicQuestionsForSection = dynamicQuestions[secaoIndex] || [];
        return {
          ...secao,
          perguntas: [...secao.perguntas, ...dynamicQuestionsForSection]
        };
      });

      const dataToSave = {
        id_formulario: formulario?.id,
        estrutura_formulario: mergedSections || null,
        id_unidade: unidade?.id || unidadeId,
        id_empreendimento: empreendimento?.id || empreendimentoId,
        nome_termo: nomeTermo,
        nome_arquivo: nomeArquivo,
        data_termo: dataTermoValue,
        data_relatorio: dataRelatorioValue,
        consultor_responsavel: consultorResponsavel,
        participantes: representantes,
        status_termo: finalStatus,
        observacoes_secoes: observacoesSecoes,
        texto_os_proposta: textoOsProposta,
        texto_escopo_consultoria: textoEscopoConsultoria,
        respostas: respostas,
        fotos_secoes: fotos,
        revisao: revisao,
      };

      console.debug('[DEBUG] Salvando Termo - payload:', dataToSave);
      if (!dataTermoValue) {
        console.warn('[DEBUG] dataTermo está vazio no payload. dataTermoValue:', dataTermoValue);
      }

      if (termoDeAceite) {
        const updated = await TermoDeAceite.update(termoDeAceite.id, dataToSave);
        console.debug('[DEBUG] Resposta do servidor (update):', updated);
        toast.success(t.saved);
        navigate(createPageUrl(`EmpreendimentoTermosAceite?empreendimentoId=${empreendimentoId}`));
      } else {
        const novoTermo = await TermoDeAceite.create(dataToSave);
        console.debug('[DEBUG] Resposta do servidor (create):', novoTermo);
        toast.success(t.saved);
        navigate(createPageUrl(`PreencherTermoDeAceite?termoId=${novoTermo.id}&unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`), { replace: true });
        return;
      }

    } catch (error) {
      console.error("Erro ao salvar termo:", error);
      toast.error(t.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(createPageUrl(`EmpreendimentoTermosAceite?empreendimentoId=${empreendimentoId}`));
  };

  if (!hasValidIds) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-8 text-center ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{t.missingIDs}</h2>
        <p className={`mb-6 max-w-md ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t.missingIDsMessage}</p>
        <Button onClick={() => navigate(createPageUrl("Empreendimentos"))}>
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
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.loadingForm}</p>
        <Toaster />
      </div>
    );
  }

  if (errorUnidade || !formulario) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-8 text-center ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{t.errorTitle}</h2>
        <p className={`mb-6 max-w-md ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {errorUnidade?.message || t.formNotFound}
        </p>
        <div className="flex gap-3">
          <Button onClick={() => navigate(createPageUrl("Empreendimentos"))}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToProjects}
          </Button>
          <Button onClick={() => window.location.reload()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Tentar novamente
          </Button>
        </div>
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
            {formulario?.nome_formulario}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl(`EmpreendimentoTermosAceite?empreendimentoId=${empreendimentoId}`))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.backToTerms}
        </Button>
      </div>

      {(nomeTermo || dataTermo) && (
        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {nomeTermo || 'Novo Termo de Aceite'}
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Data: {dataTermo ? new Date(dataTermo).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não definida'}
                </p>
              </div>
              <Badge
                className={`${statusTermo === 'Aceito'
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : statusTermo === 'Pendente de Ajustes'
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
              >
                {statusTermo || 'Em Andamento'}
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
              <Button variant="ghost" onClick={closeCamera}>
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
              <Button variant="outline" onClick={closeCamera}>
                {t.cancel}
              </Button>
              <Button onClick={capturePhoto} disabled={capturing}>
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
              <DialogTitle>{t.signature}</DialogTitle>
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
                <SimpleSignaturePad ref={signaturePadRef} isDark={isDark} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Digite sua assinatura</Label>
                <Input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Digite seu nome..."
                  style={{ fontFamily: 'Calibri, sans-serif' }}
                />
                <p className="text-xs text-gray-500">Será exibida em fonte Calibri</p>
              </div>
            )}

            <DialogFooter>
              {signatureMode === 'draw' && (
                <Button variant="outline" onClick={handleClearSignature}>
                  {t.clear}
                </Button>
              )}
              <Button variant="ghost" onClick={handleCloseSignatureDialog}>
                {t.cancel}
              </Button>
              <Button onClick={handleSaveSignature}>
                {t.save}
              </Button>
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
                <Label htmlFor="nome_termo">{t.termName}</Label>
                <Input
                  id="nome_termo"
                  value={nomeTermo}
                  onChange={(e) => setNomeTermo(e.target.value)}
                  placeholder={t.termNamePlaceholder}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_arquivo">{t.fileName}</Label>
                <Input
                  id="nome_arquivo"
                  value={nomeArquivo}
                  onChange={(e) => setNomeArquivo(e.target.value)}
                  placeholder="Ex: TA001-2025..."
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revisao">Revisão</Label>
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
                <Label>Empreendimento</Label>
                <div className={`p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
                  {empreendimento?.nome_empreendimento || '-'}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <div className={`p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
                  {empreendimento?.endereco_empreendimento || '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <div className={`p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
                  {unidade?.unidade_empreendimento || '-'}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Área do conjunto</Label>
                <div className={`p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
                  {unidade?.metragem_unidade ? `${unidade.metragem_unidade} m²` : '-'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consultor_responsavel">{t.consultantInCharge}</Label>
                <Input
                  id="consultor_responsavel"
                  value={consultorResponsavel}
                  onChange={(e) => setConsultorResponsavel(e.target.value)}
                  placeholder="Nome do consultor..."
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="representantes">{t.representatives}</Label>
                <Input
                  id="representantes"
                  value={representantes}
                  onChange={(e) => setRepresentantes(e.target.value)}
                  placeholder={t.representativesPlaceholder}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_termo">{t.termDate}</Label>
                <Input
                  id="data_termo"
                  type="date"
                  value={dataTermo || ''}
                  onChange={(e) => { console.debug('[DEBUG] data_termo onChange', e && e.target && e.target.value); setDataTermo(e.target.value); }}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_relatorio">{t.reportDate}</Label>
                <Input
                  id="data_relatorio"
                  type="date"
                  value={dataRelatorio || ''}
                  onChange={(e) => { console.debug('[DEBUG] data_relatorio onChange', e && e.target && e.target.value); setDataRelatorio(e.target.value); }}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="os_proposta">Nº da proposta</Label>
              <Input
                id="os_proposta"
                value={textoOsProposta}
                onChange={(e) => setTextoOsProposta(e.target.value)}
                placeholder="Descrição da OS/Proposta..."
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="escopo_consultoria">Escopo da consultoria</Label>
              <Textarea
                id="escopo_consultoria"
                value={textoEscopoConsultoria}
                onChange={(e) => setTextoEscopoConsultoria(e.target.value)}
                placeholder="Detalhes do escopo da consultoria..."
                className={`h-24 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
              <ListChecks />
              {t.termForm}
            </CardTitle>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {formulario?.nome_formulario}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {formulario?.secoes.length > 0 && formulario.secoes.map((secao, secaoIndex) => (
              <div
                key={secaoIndex}
                className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}
              >
                <h3 className="text-lg font-semibold mb-4">{secao.nome_secao}</h3>

                <div className="space-y-4">
                  {secao.perguntas?.map((pergunta, perguntaIndex) => (
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
                  ))}

                  {(dynamicQuestions[secaoIndex] || []).map((pergunta, dynamicIndex) => (
                    <Pergunta
                      key={`dynamic-${dynamicIndex}`}
                      secaoIndex={secaoIndex}
                      perguntaIndex={dynamicIndex}
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
                      isDynamic={true}
                      onRemove={removeDynamicQuestion}
                      onUpdateText={updateDynamicQuestionText}
                      onUpdateType={updateDynamicQuestionType}
                    />
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addDynamicQuestion(secaoIndex)}
                    className={`w-full mt-2 ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t.addItem}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

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