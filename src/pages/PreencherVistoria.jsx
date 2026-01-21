import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FormularioVistoria } from '@/api/entities';
import { RespostaVistoria } from '@/api/entities';
import { User } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Upload, X, Camera, AlertTriangle, Info, ListChecks, Plus, Trash2 } from 'lucide-react';
import UnidadeHeader from '@/components/unidade/UnidadeHeader';
import { useUnidadeData } from '@/components/hooks/useUnidadeData';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'react-hot-toast'; // Added toast and Toaster

// Simple signature component using canvas directly
const SimpleSignaturePad = React.forwardRef(({ isDark }, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpi = window.devicePixelRatio || 1;
    // Set canvas dimensions to match CSS rendered size, multiplied by DPI for sharpness
    canvas.width = canvas.offsetWidth * dpi;
    canvas.height = canvas.offsetHeight * dpi;
    ctx.scale(dpi, dpi); // Scale the context to the DPI
    ctx.fillStyle = isDark ? '#374151' : '#ffffff'; // Set background based on theme
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
    // Adjust coordinates for the canvas's current display size
    // The DPI scaling is applied to the context, so we need to map the client coordinates
    // back to the unscaled canvas logical coordinates.
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault(); // Prevent scrolling on touch devices
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = isDark ? '#ffffff' : '#000000'; // Pen color based on theme
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const point = getCanvasPoint(e);
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling on touch devices
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const point = getCanvasPoint(e);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling on touch devices
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

  // Expose methods through ref
  React.useImperativeHandle(ref, () => ({
    clear,
    toDataURL: (type = 'image/png', quality = 0.92) => canvasRef.current?.toDataURL(type, quality),
    isEmpty: () => {
        const canvas = canvasRef.current;
        if (!canvas) return true; // Treat as empty if canvas not ready

        // Create a blank canvas with the same dimensions and background
        const blankCanvas = document.createElement('canvas');
        blankCanvas.width = canvas.width;
        blankCanvas.height = canvas.height;
        const blankCtx = blankCanvas.getContext('2d');
        blankCtx.fillStyle = isDark ? '#374151' : '#ffffff';
        blankCtx.fillRect(0, 0, blankCanvas.width, blankCanvas.height);

        // Compare the data URLs of the current canvas and the blank canvas
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
    title: "Preencher Formulário de Vistoria",
    fillInspection: "Preencher Vistoria",
    backToInspections: "Voltar para Vistorias",
    inspectionName: "Nome da Vistoria",
    fileName: "Nome do Arquivo",
    participants: "Participantes",
    generalObservations: "Observações Gerais",
    save: "Salvar Respostas",
    saving: "Salvando...",
    saved: "Salvo com sucesso!",
    errorSaving: "Erro ao salvar",
    pending: "Pendente",
    inProgress: "Em Andamento", // Changed from "Em andamento" to "Em Andamento"
    validated: "Válido",
    informative: "Informativo",
    releasedForOccupancy: "Liberado para Ocupação",
    notReleasedForOccupancy: "Não Liberado para Ocupação",
    conclusion: "Liberação da Vistoria",
    comment: "Comentário",
    selectAnswer: "Selecione a resposta",
    selectStatus: "Selecione o status final",
    sectionPhotos: "Fotos da Seção",
    photoRecord: "Photo Record",
    photographicRecord: "Registro Fotográfico",
    uploading: "Enviando...",
    addPhoto: "Adicionar Foto",
    removePhoto: "Remover",
    photoCaption: "Adicione uma legenda para esta foto...",
    addLegend: "Adicionar Legenda",
    noPhotosYet: "Nenhuma foto adicionada ainda. Clique em 'Adicionar Foto' para começar.",
    cancel: "Cancelar",
    updateAnswers: "Atualizar Respostas",
    saveAnswers: "Salvar Respostas",
    errorTitle: "Erro ao carregar dados",
    formNotFound: "Formulário ou vistoria não encontrados, ou IDs inválidos.",
    backToProjects: "Voltar para Empreendimentos",
    missingIDs: "IDs Ausentes na URL",
    missingIDsMessage: "Alguns identificadores necessários estão ausentes na URL.",
    loadingForm: "Carregando formulário de vistoria...",
    generalInfo: "Informações Gerais da Vistoria",
    inspectionNamePlaceholder: "Ex: Vistoria Inicial, Vistoria de Entrega...",
    inspectionDate: "Data da Vistoria",
    reportDate: "Data do Relatório",
    consultantInCharge: "Consultor Responsável",
    representatives: "Participantes",
    representativesPlaceholder: "Nomes dos participantes, separados por vírgula",
    releaseStatus: "Status de Liberação da Vistoria",
    statusInProgress: "Em Andamento",
    statusReleased: "Liberado para Ocupação",
    statusNotReleased: "Não Liberado para Ocupação",
    answerNotApplicable: "Não se Aplica",
    statusFinished: "Finalizado",
    photo: "Foto",
    chooseOption: "Escolha uma opção...",
    fillField: "Preencha este campo",
    dateNotSet: "Data não definida",
    signature: "Assinatura",
    clear: "Limpar",
    sign: "Assinar",
    takePhoto: "Tirar Foto",
    capturePhoto: "Capturar Foto",
    cameraAccessError: "Erro ao acessar câmera. Verifique as permissões do navegador.",
    photoSaveError: "Erro ao salvar foto. Tente novamente.",
    inspectionForm: "Questionário da Vistoria",
    answerPending: "Pendente",
    answerRequiresImprovement: "Exige Melhoria",
    addSection: "Adicionar Seção",
    removeSection: "Remover Seção",
    addQuestion: "Adicionar Pergunta",
    removeQuestion: "Remover Pergunta",
    sectionNamePlaceholder: "Nome da Seção (ex: Arquitetura, Elétrica)",
    questionTextPlaceholder: "Digite o texto da pergunta...",
    questionType: "Tipo de Pergunta",
    optionPlaceholder: "Opção",
    addOption: "Adicionar Opção",
    optionsForSelect: "Opções para Seleção",
    color: "Cor",
    green: "Verde",
    red: "Vermelho",
    yellow: "Amarelo",
    blue: "Azul",
    purple: "Roxo",
    gray: "Cinza",
    cameraPermissionDenied: "Permissão de câmera negada. Por favor, habilite o acesso à câmera nas configurações do navegador.",
    cameraInUse: "A câmera está sendo usada por outro aplicativo. Feche outros apps e tente novamente.",
    cameraNotSupported: "Seu navegador não suporta acesso à câmera ou você está em uma conexão não segura (HTTP).",
    useUploadInstead: "Use o botão 'Adicionar Foto' para fazer upload de imagens.",
  },
  en: {
    title: "Fill Work Inspection Form",
    fillInspection: "Fill Inspection",
    backToInspections: "Back to Inspections",
    inspectionName: "Inspection Name",
    fileName: "File Name",
    participants: "Participants",
    generalObservations: "General Observations",
    save: "Save Answers",
    saving: "Saving...",
    saved: "Saved successfully!",
    errorSaving: "Error saving",
    pending: "Pending",
    inProgress: "In Progress",
    validated: "Valid",
    informative: "Informative",
    releasedForOccupancy: "Released for Occupancy",
    notReleasedForOccupancy: "Not Released for Occupancy",
    conclusion: "Inspection Release",
    comment: "Comment",
    selectAnswer: "Select answer",
    selectStatus: "Select final status",
    sectionPhotos: "Section Photos",
    photoRecord: "Photo Record",
    photographicRecord: "Photographic Record",
    uploading: "Uploading...",
    addPhoto: "Add Photo",
    removePhoto: "Remove",
    photoCaption: "Add a caption for this photo...",
    addLegend: "Add Caption",
    noPhotosYet: "No photos added yet. Click 'Add Photo' to get started.",
    cancel: "Cancel",
    updateAnswers: "Update Answers",
    saveAnswers: "Save Answers",
    errorTitle: "Error loading data",
    formNotFound: "Form or inspection not found, or invalid IDs.",
    backToProjects: "Back to Projects",
    missingIDs: "Missing IDs in URL",
    missingIDsMessage: "Some required identifiers are missing in the URL.",
    loadingForm: "Loading inspection form...",
    generalInfo: "General Inspection Information",
    inspectionNamePlaceholder: "Ex: Initial Inspection, Delivery Inspection...",
    inspectionDate: "Inspection Date",
    reportDate: "Report Date",
    consultantInCharge: "Consultant in Charge",
    representatives: "Participants",
    representativesPlaceholder: "Names of participants, comma-separated",
    releaseStatus: "Inspection Release Status",
    statusInProgress: "In Progress",
    statusReleased: "Released for Occupancy",
    statusNotReleased: "Not Released for Occupancy",
    answerNotApplicable: "Not Applicable",
    statusFinished: "Finished",
    photo: "Photo",
    chooseOption: "Choose an option...",
    fillField: "Fill this field",
    dateNotSet: "Date not set",
    signature: "Signature",
    clear: "Clear",
    sign: "Sign",
    takePhoto: "Take Photo",
    capturePhoto: "Capture Photo",
    cameraAccessError: "Error accessing camera. Check browser permissions.",
    photoSaveError: "Error saving photo. Try again.",
    inspectionForm: "Inspection Questionnaire",
    answerPending: "Pending",
    answerRequiresImprovement: "Requires Improvement",
    addSection: "Add Section",
    removeSection: "Remove Section",
    addQuestion: "Add Question",
    removeQuestion: "Remove Question",
    sectionNamePlaceholder: "Section Name (e.g., Architecture, Electrical)",
    questionTextPlaceholder: "Enter question text...",
    questionType: "Question Type",
    optionPlaceholder: "Option",
    addOption: "Add Option",
    optionsForSelect: "Options for Selection",
    color: "Color",
    green: "Green",
    red: "Red",
    yellow: "Yellow",
    blue: "Blue",
    purple: "Purple",
    gray: "Gray",
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

const answerOptions = [
  { value: 'Finalizado', labelKey: 'statusFinished', colorClass: 'bg-green-500' },
  { value: 'Em Andamento', labelKey: 'statusInProgress', colorClass: 'bg-blue-500' },
  { value: 'Pendente', labelKey: 'answerPending', colorClass: 'bg-yellow-500' },
  { value: 'Informativo', labelKey: 'informative', colorClass: 'bg-purple-500' },
  { value: 'Não se Aplica', labelKey: 'answerNotApplicable', colorClass: 'bg-gray-400' },
];


const Pergunta = React.memo(({
  secaoIndex,
  perguntaIndex,
  pergunta,
  isAvulsa, // Renamed from isAdHoc for prop consistency
  theme,
  language,
  handlePerguntaChange, // Renamed from handleQuestionChange
  handleRemovePergunta, // Renamed from handleRemoveQuestion
  handleAddOpcao,
  handleRemoveOpcao,
  handleOpcaoChange, // Modified to handle propertyName and value
  // Props for answer logic
  respostas,
  fotos,
  uploadingPhotos,
  handleAnswerChange,
  handleImageUpload,
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
    { value: 'green', label: t.green },
    { value: 'red', label: t.red },
    { value: 'yellow', label: t.yellow },
    { value: 'blue', label: t.blue },
    { value: 'purple', label: t.purple },
    { value: 'gray', label: t.gray },
  ];

  return (
    <div key={perguntaIndex} className={`space-y-4 ${isAvulsa ? `border rounded-md p-3 relative ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50'}` : ''}`}>
      {isAvulsa && (
        <div className="flex flex-col sm:flex-row gap-2 items-start">
          <Input
            placeholder={t.questionTextPlaceholder}
            value={pergunta.pergunta}
            onChange={(e) => handlePerguntaChange(secaoIndex, perguntaIndex, 'pergunta', e.target.value)}
            className={`flex-grow ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white'}`}
          />
          <Select
            value={pergunta.tipo}
            onValueChange={(value) => handlePerguntaChange(secaoIndex, perguntaIndex, 'tipo', value)}
          >
            <SelectTrigger className={`w-full sm:w-[180px] ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`}>
              <SelectValue placeholder={t.questionType} />
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-gray-800 text-white' : ''}>
              <SelectItem value="select">Seleção</SelectItem>
              <SelectItem value="select_with_photo">Seleção + Foto</SelectItem>
              <SelectItem value="text">Texto Curto</SelectItem>
              <SelectItem value="textarea">Texto Longo</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="signature">Assinatura</SelectItem>
              <SelectItem value="file">Foto</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="destructive" size="icon" onClick={() => handleRemovePergunta(secaoIndex, perguntaIndex)} type="button">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {isAvulsa && (pergunta.tipo === 'select' || pergunta.tipo === 'select_with_photo' || pergunta.tipo === 'checkbox') && (
        <div className="space-y-2 pl-4 border-l-2 border-gray-200">
          <Label className={isDark ? 'text-gray-300' : ''}>{t.optionsForSelect}</Label>
          {(pergunta.opcoes || []).map((opcao, opcaoIndex) => (
            <div key={opcaoIndex} className="flex items-center gap-2">
              <Input
                placeholder={t.optionPlaceholder}
                value={opcao.texto} // Access texto property
                onChange={(e) => handleOpcaoChange(secaoIndex, perguntaIndex, opcaoIndex, 'texto', e.target.value)}
                className={isDark ? 'bg-gray-700 border-gray-600' : ''}
              />
              <Select
                value={opcao.cor} // Access cor property
                onValueChange={(value) => handleOpcaoChange(secaoIndex, perguntaIndex, opcaoIndex, 'cor', value)}
              >
                <SelectTrigger className={`w-[100px] ${isDark ? 'bg-gray-800 border-gray-600 text-white' : ''}`}>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColorClass(opcao.cor)}`}></div>
                      <span>{t[opcao.cor]}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className={isDark ? 'bg-gray-800 text-white' : ''}>
                  {colorOptions.map(colorOpt => (
                    <SelectItem key={colorOpt.value} value={colorOpt.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColorClass(colorOpt.value)}`}></div>
                        <span>{colorOpt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => handleRemoveOpcao(secaoIndex, perguntaIndex, opcaoIndex)} type="button">
                <X className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => handleAddOpcao(secaoIndex, perguntaIndex)} className="w-full" type="button">
            <Plus className="w-4 h-4 mr-2" /> {t.addOption}
          </Button>
        </div>
      )}

      {/* Actual Question Display and Answer Input */}
      <div>
        {!isAvulsa && <Label className={isDark ? 'text-gray-300' : ''}>{pergunta.pergunta}</Label>}

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
                {(pergunta.opcoes && pergunta.opcoes.length > 0) ? (
                    pergunta.opcoes.map((opcao, idx) => ( // Now 'opcao' is an object {texto, cor}
                        <SelectItem key={idx} value={opcao.texto}>
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${getStatusColorClass(opcao.cor)}`} />
                                <span>{opcao.texto}</span>
                            </div>
                        </SelectItem>
                    ))
                ) : !isAvulsa ? ( // Fallback to default answer options if no custom options
                    answerOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${option.colorClass}`} />
                                <span>{t[option.labelKey]}</span>
                            </div>
                        </SelectItem>
                    ))
                ) : null }
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
                  {respostaAtual.resposta ? t.updateAnswers : t.sign}
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
        ) : (
          <Input
            value={respostaAtual.resposta}
            onChange={(e) => handleAnswerChange(secaoIndex, perguntaIndex, 'resposta', e.target.value)}
            placeholder={t.fillField}
            className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
          />
        )}

        {/* Mostra Registro Fotográfico para select_with_photo e file */}
        {(pergunta.tipo === 'select_with_photo' || pergunta.tipo === 'file') && (
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

export default function PreencherVistoria({ language = 'pt', theme = 'light' }) {
  const navigate = useNavigate();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const unidadeId = urlParams.get('unidadeId');
  const empreendimentoId = urlParams.get('empreendimentoId');
  const formularioId = urlParams.get('formularioId');
  const respostaId = urlParams.get('respostaId');

  const { unidade, empreendimento, loading: loadingUnidade, error: errorUnidade } = useUnidadeData(unidadeId, empreendimentoId);

  const [respostaVistoria, setRespostaVistoria] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [dynamicForm, setDynamicForm] = useState({ secoes: [] }); // For ad-hoc inspections
  const [isAvulsa, setIsAvulsa] = useState(false); // New state for ad-hoc mode (renamed from isAdHoc)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Renamed and new states for main form data
  const [nomeVistoria, setNomeVistoria] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [consultorResponsavel, setConsultorResponsavel] = useState(''); // Made editable
  const [dataVistoria, setDataVistoria] = useState(new Date().toISOString().substring(0, 10)); // Changed to string for date input
  const [dataRelatorio, setDataRelatorio] = useState(new Date().toISOString().substring(0, 10));
  const [representantes, setRepresentantes] = useState('');
  const [statusVistoria, setStatusVistoria] = useState('Em Andamento');
  const [revisao, setRevisao] = useState(''); 
  const [observacoesSecoes, setObservacoesSecoes] = useState({});
  const [textoOsProposta, setTextoOsProposta] = useState('');
  const [textoEscopoConsultoria, setTextoEscopoConsultoria] = useState('');

  const [respostas, setRespostas] = useState({});
  const [fotos, setFotos] = useState({});

  const [uploadingPhotos, setUploadingPhotos] = useState({}); // Initialize as state

  const t = translations[language];
  const isDark = theme === 'dark';

  // New states for camera functionality
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [currentCameraKey, setCurrentCameraKey] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // New states for signature functionality
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [activeSignature, setActiveSignature] = useState(null);
  const [signatureMode, setSignatureMode] = useState('draw'); // 'draw' or 'type'
  const [typedSignature, setTypedSignature] = useState('');
  const signaturePadRef = useRef(null);

  const isValidId = (id) => {
    return id &&
           String(id).trim() !== '' &&
           String(id).trim() !== 'null' &&
           String(id).trim() !== 'undefined';
  };

  const hasValidIds = isValidId(unidadeId) && isValidId(empreendimentoId) && (isValidId(formularioId) || isValidId(respostaId) || true);

  // Helper to normalize options to {texto, cor} objects
  const normalizeOptions = (options) => {
    if (!options || !Array.isArray(options)) return [];
    return options.map(option => {
      if (typeof option === 'string') {
        return { texto: option, cor: 'gray' }; // Default color for old string options
      }
      return { texto: option.texto || '', cor: option.cor || 'gray' };
    });
  };

  const loadFormForNewInspection = useCallback(async (formIdToLoad) => {
    console.log('Carregando formulário para nova vistoria:', formIdToLoad);
    try {
      const formDataArray = await FormularioVistoria.filter({ id: formIdToLoad });
      if (formDataArray.length > 0) {
        const loadedForm = formDataArray[0];
        // Normalize options in loaded form
        const normalizedSections = loadedForm.secoes.map(secao => ({
          ...secao,
          perguntas: secao.perguntas.map(pergunta => ({
            ...pergunta,
            opcoes: normalizeOptions(pergunta.opcoes)
          }))
        }));
        setFormulario({ ...loadedForm, secoes: normalizedSections });
      } else {
        console.warn('Formulário não encontrado para o ID:', formIdToLoad);
        setFormulario(null);
      }
    } catch (error) {
      console.error("Erro ao carregar formulário para nova vistoria:", error);
      setFormulario(null);
    }
  }, []);

  const loadExistingInspection = useCallback(async (respostaIdToLoad) => {
    console.log('Carregando dados para resposta ID:', respostaIdToLoad);
    try {
      const respostasLoaded = await RespostaVistoria.filter({ id: respostaIdToLoad });

      if (!respostasLoaded || respostasLoaded.length === 0) {
        console.warn('Resposta de vistoria não encontrada para o ID:', respostaIdToLoad);
        setRespostaVistoria(null);
        setFormulario(null);
        setIsAvulsa(false);
        return;
      }

      const respostaData = respostasLoaded[0];
      console.log('Dados brutos da resposta:', respostaData);

      setRespostaVistoria(respostaData);

      // Check if it's an ad-hoc or template-based inspection
      if (respostaData.estrutura_formulario && respostaData.estrutura_formulario.length > 0) {
        setIsAvulsa(true);
        // Normalize options in ad-hoc form structure
        const normalizedDynamicSections = respostaData.estrutura_formulario.map(secao => ({
          ...secao,
          perguntas: secao.perguntas.map(pergunta => ({
            ...pergunta,
            opcoes: normalizeOptions(pergunta.opcoes)
          }))
        }));
        setDynamicForm({ secoes: normalizedDynamicSections });
        setFormulario(null); // Ensure no template is used if it's ad-hoc
      } else if (respostaData.id_formulario) {
        setIsAvulsa(false);
        const forms = await FormularioVistoria.filter({ id: respostaData.id_formulario });
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
        } else {
          console.warn('Formulário associado não encontrado para o ID:', respostaData.id_formulario);
          setFormulario(null);
        }
      } else {
        setIsAvulsa(true); // Treat as ad-hoc if no structure and no form ID
        setDynamicForm({ secoes: [] }); // Initialize empty dynamic form
        console.warn('Resposta de vistoria sem ID de formulário ou estrutura customizada.');
        setFormulario(null);
      }

      // Populate main form states
      setNomeVistoria(respostaData.nome_vistoria || '');
      setNomeArquivo(respostaData.nome_arquivo || '');
      setConsultorResponsavel(respostaData.consultor_responsavel || ''); // Load saved consultant
      if (respostaData.data_vistoria) {
        // When loading, ensure the date is parsed correctly and formatted for the input
        // The ISO string from the backend might include time, we only need the date part for input type="date"
        setDataVistoria(new Date(respostaData.data_vistoria).toISOString().substring(0, 10)); 
      } else {
        setDataVistoria(new Date().toISOString().substring(0, 10)); // Default to current date if not set
      }
      if (respostaData.data_relatorio) {
        setDataRelatorio(new Date(respostaData.data_relatorio).toISOString().substring(0, 10));
      } else {
        setDataRelatorio(new Date().toISOString().substring(0, 10));
      }
      setRepresentantes(respostaData.participantes || ''); // Use `participantes` from DB for `representantes` state
      setStatusVistoria(respostaData.status_vistoria || 'Em Andamento');
      setObservacoesSecoes(respostaData.observacoes_secoes || {});
      setTextoOsProposta(respostaData.texto_os_proposta || '');
      setTextoEscopoConsultoria(respostaData.texto_escopo_consultoria || '');
      setRevisao(respostaData.revisao || '');

      // Load specific answers and photos
      setRespostas(respostaData.respostas || {});
      setFotos(respostaData.fotos_secoes || {});

    } catch (error) {
      console.error("Erro detalhado ao carregar dados da vistoria:", error);
      setRespostaVistoria(null);
      setFormulario(null);
      setIsAvulsa(false); // Reset to default state on error
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
          await loadCurrentUser(); // Load user first
          if (isValidId(respostaId)) {
            await loadExistingInspection(respostaId);
          } else if (isValidId(formularioId)) {
            setIsAvulsa(false);
            await loadFormForNewInspection(formularioId);
          } else {
            setIsAvulsa(true);
            setDynamicForm({ secoes: [{ nome_secao: t.sectionNamePlaceholder, perguntas: [{ pergunta: t.questionTextPlaceholder, tipo: 'text' }] }] });
            setFormulario(null);
          }
        } else {
          console.warn("Skipping data load due to invalid or missing IDs.");
          setFormulario(null);
        }
      } catch (err) {
        console.error("Error loading inspection data:", err);
        setFormulario(null);
        setDynamicForm({ secoes: [] });
      } finally {
        setLoading(false);
      }
    };

    if (hasValidIds) {
      loadData();
    }
  }, [unidadeId, empreendimentoId, formularioId, respostaId, hasValidIds, loadExistingInspection, loadFormForNewInspection, loadCurrentUser, t.sectionNamePlaceholder, t.questionTextPlaceholder]);

  // Effect to pre-fill consultorResponsavel for new inspections once currentUser is available
  useEffect(() => {
    // Only pre-fill if it's a new inspection (no respostaId, no existing respostaVistoria data loaded)
    // and if consultorResponsavel hasn't been explicitly set yet (e.g., from an existing inspection load).
    if (currentUser && !respostaId && !respostaVistoria && consultorResponsavel === '') {
      setConsultorResponsavel(currentUser.full_name || currentUser.email || '');
    }
  }, [currentUser, respostaId, respostaVistoria, consultorResponsavel]);

  // Replaces handleRespostaChange and handleComentarioChange
  const handleAnswerChange = (secaoIndex, perguntaIndex, field, value) => {
    const chave = `secao_${secaoIndex}_pergunta_${perguntaIndex}`;
    console.log(`🔄 Alterando resposta para ${chave}, field: ${field}, value: ${value}`);
    
    setRespostas(prev => ({
      ...prev,
      [chave]: {
        ...prev[chave], // Preserve existing 'resposta' and 'comentario'
        [field]: value // Update the specific field (e.g., 'resposta' or 'comentario')
      }
    }));

    // Verificação DIRETA se é uma seção de status
    if (field === 'resposta' && formulario?.secoes) {
      const secao = formulario.secoes[secaoIndex];
      console.log(`📝 Seção atual: ${secao?.nome_secao}`);
      console.log(`🔍 Contém STATUS: ${secao?.nome_secao?.toUpperCase().includes('STATUS')}`);
      
      if (secao && secao.nome_secao && secao.nome_secao.toUpperCase().includes('STATUS')) {
        console.log(`✅ ATUALIZANDO STATUS DA VISTORIA DE "${statusVistoria}" PARA "${value}"`);
        setStatusVistoria(value);
      }
    }
  };

  const handleObservacaoSecaoChange = (secaoIndex, value) => {
    setObservacoesSecoes(prev => ({
        ...prev,
        [secaoIndex]: value,
    }));
  };

  const handleMultipleImageUpload = async (secaoIndex, perguntaIndex, files) => {
    const chaveImagem = `secao_${secaoIndex}_pergunta_${perguntaIndex}_imagem`;
    console.log(`[UPLOAD] Iniciando upload de ${files.length} imagens para ${chaveImagem}`);
    setUploadingPhotos(prev => ({ ...prev, [chaveImagem]: true }));

    try {
      const novasFotos = [];
      // Upload sequencialmente para manter a ordem
      for (const file of files) {
        console.log(`[UPLOAD] Fazendo upload de: ${file.name}`);
        const { file_url } = await UploadFile({ file });
        console.log(`[UPLOAD] Sucesso! URL: ${file_url}`);
        novasFotos.push({ url: file_url, legenda: '' });
      }
      
      // Atualiza o estado uma única vez com todas as fotos na ordem correta
      setFotos(prev => {
        const fotosAtuais = prev[chaveImagem] || [];
        return { ...prev, [chaveImagem]: [...fotosAtuais, ...novasFotos] };
      });
    } catch (error) {
      console.error("[UPLOAD] Erro:", error);
      toast.error("Erro ao fazer upload das fotos");
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [chaveImagem]: false }));
    }
  };

  const handleImageUpload = async (secaoIndex, perguntaIndex, file) => {
    const chaveImagem = `secao_${secaoIndex}_pergunta_${perguntaIndex}_imagem`;
    console.log(`[UPLOAD] Iniciando upload para ${chaveImagem}`);
    setUploadingPhotos(prev => ({ ...prev, [chaveImagem]: true }));

    try {
      const { file_url } = await UploadFile({ file });
      console.log(`[UPLOAD] Sucesso! URL: ${file_url}`);

      setFotos(prev => {
        const fotosAtuais = prev[chaveImagem] || [];
        const novasFotos = [...fotosAtuais, { url: file_url, legenda: '' }];
        return { ...prev, [chaveImagem]: novasFotos };
      });
    } catch (error) {
      console.error("[UPLOAD] Erro:", error);
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
    // Check if browser supports getUserMedia
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
      console.error("Erro ao acessar a câmera:", error);
      
      // Close modal on error
      setShowCameraModal(false);
      setCurrentCameraKey(null);
      
      // Provide specific error messages based on error type
      let errorMessage = t.cameraAccessError;
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = t.cameraPermissionDenied;
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = t.cameraInUse;
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
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
        const { file_url } = await UploadFile({ file });

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

  const openSignatureDialog = (secaoIndex, perguntaIndex) => {
    console.log("Abrindo diálogo de assinatura para:", secaoIndex, perguntaIndex);
    setActiveSignature({ secaoIndex, perguntaIndex });
    setShowSignatureDialog(true);
  };

  const handleSaveSignature = async () => {
    console.log("Tentando salvar assinatura...");
    if (!activeSignature) return;

    try {
      if (signatureMode === 'type') {
        // Assinatura digitada
        if (!typedSignature.trim()) {
          toast.error("Por favor, digite sua assinatura.");
          return;
        }

        // Criar canvas com texto - tamanho fixo para consistência visual
        const canvas = document.createElement('canvas');
        canvas.width = 850;
        canvas.height = 215;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Usar tamanho de fonte fixo para manter consistência visual entre assinaturas
        const fontSize = 60;
        ctx.font = `${fontSize}px Calibri`;
        
        // Se o texto for muito longo, ajustar escala horizontal
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
        console.log("Assinatura digitada capturada, salvando...");
        handleAnswerChange(
          activeSignature.secaoIndex,
          activeSignature.perguntaIndex,
          'resposta',
          signatureDataUrl
        );
        setShowSignatureDialog(false);
        setActiveSignature(null);
        setTypedSignature('');
      } else {
        // Assinatura desenhada
        if (signaturePadRef.current) {
          if (!signaturePadRef.current.isEmpty()) {
            const signatureDataUrl = signaturePadRef.current.toDataURL();
            console.log("Assinatura desenhada capturada, salvando...");
            handleAnswerChange(
              activeSignature.secaoIndex,
              activeSignature.perguntaIndex,
              'resposta',
              signatureDataUrl
            );
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

  // Functions to manage dynamic form structure
  const handleAddSection = () => {
    setDynamicForm(prev => ({
      ...prev,
      secoes: [...prev.secoes, { nome_secao: `${t.sectionNamePlaceholder} ${prev.secoes.length + 1}`, perguntas: [{ pergunta: t.questionTextPlaceholder, tipo: 'text' }] }]
    }));
  };

  const handleRemoveSection = (secaoIndex) => {
    setDynamicForm(prev => {
      const newSecoes = prev.secoes.filter((_, index) => index !== secaoIndex);
      // Also clear answers and photos related to the removed section
      const newRespostas = {};
      const newFotos = {};
      // Iterate over current responses and photos to keep only those not in the removed section
      Object.keys(respostas).forEach(key => {
        const parts = key.split('_');
        // Check if the section index of the key matches the removed section index
        if (parts.length >= 3 && parseInt(parts[1]) !== secaoIndex) {
            newRespostas[key] = respostas[key];
        }
      });
      Object.keys(fotos).forEach(key => {
        const parts = key.split('_');
         // Check if the section index of the key matches the removed section index
        if (parts.length >= 3 && parseInt(parts[1]) !== secaoIndex) {
            newFotos[key] = fotos[key];
        }
      });
      setRespostas(newRespostas);
      setFotos(newFotos);
      return { ...prev, secoes: newSecoes };
    });
  };

  const handleSecaoChange = (secaoIndex, field, value) => { // Renamed from handleSectionNameChange
    setDynamicForm(prev => {
      const newSecoes = [...prev.secoes];
      if (newSecoes[secaoIndex]) {
        newSecoes[secaoIndex][field] = value;
      }
      return { ...prev, secoes: newSecoes };
    });
  };

  const handleAddQuestion = (secaoIndex) => {
    setDynamicForm(prev => {
      const newSecoes = [...prev.secoes];
      if (newSecoes[secaoIndex]) {
        newSecoes[secaoIndex].perguntas.push({ pergunta: t.questionTextPlaceholder, tipo: 'text' });
      }
      return { ...prev, secoes: newSecoes };
    });
  };

  const handleRemoveQuestion = (secaoIndex, perguntaIndex) => {
    setDynamicForm(prev => {
      const newSecoes = [...prev.secoes];
      if (newSecoes[secaoIndex] && newSecoes[secaoIndex].perguntas[perguntaIndex]) {
        const removedQuestion = newSecoes[secaoIndex].perguntas[perguntaIndex];
        newSecoes[secaoIndex].perguntas = newSecoes[secaoIndex].perguntas.filter((_, index) => index !== perguntaIndex);
        
        // Also clear answers and photos related to the removed question
        const chave = `secao_${secaoIndex}_pergunta_${perguntaIndex}`;
        const chaveImagem = `${chave}_imagem`;
        setRespostas(currentRespostas => {
          const updatedRespostas = { ...currentRespostas };
          delete updatedRespostas[chave];
          return updatedRespostas;
        });
        setFotos(currentFotos => {
          const updatedFotos = { ...currentFotos };
          delete updatedFotos[chaveImagem];
          return updatedFotos;
        });
      }
      return { ...prev, secoes: newSecoes };
    });
  };

  const handleQuestionChange = (secaoIndex, perguntaIndex, field, value) => {
    setDynamicForm(prev => {
      const newSecoes = [...prev.secoes];
      if (newSecoes[secaoIndex] && newSecoes[secaoIndex].perguntas[perguntaIndex]) {
        newSecoes[secaoIndex].perguntas[perguntaIndex][field] = value;
      }
      return { ...prev, secoes: newSecoes };
    });
  };

  const handleAddOpcao = (secaoIndex, perguntaIndex) => {
    setDynamicForm(prev => {
        const newSecoes = JSON.parse(JSON.stringify(prev.secoes)); // Deep copy to ensure immutability
        if (newSecoes[secaoIndex] && newSecoes[secaoIndex].perguntas[perguntaIndex]) {
            const pergunta = newSecoes[secaoIndex].perguntas[perguntaIndex];
            if (!pergunta.opcoes) {
                pergunta.opcoes = [];
            }
            pergunta.opcoes.push({ texto: `${t.optionPlaceholder} ${pergunta.opcoes.length + 1}`, cor: 'gray' }); // Add as object with default color
        }
        return { secoes: newSecoes };
    });
  };

  const handleRemoveOpcao = (secaoIndex, perguntaIndex, opcaoIndex) => {
      setDynamicForm(prev => {
          const newSecoes = JSON.parse(JSON.stringify(prev.secoes));
          if (newSecoes[secaoIndex] && newSecoes[secaoIndex].perguntas[perguntaIndex] && newSecoes[secaoIndex].perguntas[perguntaIndex].opcoes) {
              newSecoes[secaoIndex].perguntas[perguntaIndex].opcoes = newSecoes[secaoIndex].perguntas[perguntaIndex].opcoes.filter((_, index) => index !== opcaoIndex);
          }
          return { secoes: newSecoes };
      });
  };

  const handleOpcaoChange = (secaoIndex, perguntaIndex, opcaoIndex, propertyName, value) => {
      setDynamicForm(prev => {
          const newSecoes = JSON.parse(JSON.stringify(prev.secoes));
          if (newSecoes[secaoIndex] && newSecoes[secaoIndex].perguntas[perguntaIndex] && newSecoes[secaoIndex].perguntas[perguntaIndex].opcoes) {
              newSecoes[secaoIndex].perguntas[perguntaIndex].opcoes[opcaoIndex][propertyName] = value;
          }
          return { secoes: newSecoes };
      });
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSaving(true);
    console.log("💾 SUBMIT - INICIANDO PROCESSO DE SALVAMENTO");

    // Lógica para determinar o status final NO MOMENTO DO SALVAMENTO
    let finalStatus = statusVistoria; // Começa com o valor atual do estado
    if (formulario && formulario.secoes && !isAvulsa) { // Only for template forms
        let statusKey = null;
        formulario.secoes.forEach((secao, secaoIndex) => {
            if (secao.nome_secao.toUpperCase().includes('STATUS')) {
                // Assuming the first question in this section defines the status
                if (secao.perguntas && secao.perguntas.length > 0) {
                    statusKey = `secao_${secaoIndex}_pergunta_0`;
                }
            }
        });
        // Busca o valor mais recente direto do objeto de respostas
        if (statusKey && respostas[statusKey] && respostas[statusKey].resposta) {
            finalStatus = respostas[statusKey].resposta;
        }
    }
    console.log(`💾 Status final a ser salvo: ${finalStatus}`);

    try {
      const dataVistoriaUtc = new Date(dataVistoria);
      // Correct for timezone offset to ensure the date saved is the date entered,
      // regardless of local timezone. This effectively treats the input date
      // as a "local" date without time components that should be preserved.
      dataVistoriaUtc.setMinutes(dataVistoriaUtc.getMinutes() + dataVistoriaUtc.getTimezoneOffset());
      
      const dataRelatorioUtc = new Date(dataRelatorio);
      dataRelatorioUtc.setMinutes(dataRelatorioUtc.getMinutes() + dataRelatorioUtc.getTimezoneOffset());

      const dataToSave = {
        id_formulario: isAvulsa ? null : (formulario?.id || formularioId), // Null if ad-hoc
        estrutura_formulario: isAvulsa ? dynamicForm.secoes : null, // Save structure for ad-hoc
        id_unidade: unidade?.id || unidadeId,
        id_empreendimento: empreendimento?.id || empreendimentoId,
        nome_vistoria: nomeVistoria,
        nome_arquivo: nomeArquivo,
        data_vistoria: dataVistoriaUtc.toISOString(), // Ensure date is saved as timezone-corrected ISO string
        data_relatorio: dataRelatorioUtc.toISOString(),
        consultor_responsavel: consultorResponsavel, // Use the editable state
        participantes: representantes,
        status_vistoria: finalStatus, // USA O VALOR CORRETO E ATUALIZADO
        observacoes_secoes: observacoesSecoes,
        texto_os_proposta: textoOsProposta,
        texto_escopo_consultoria: textoEscopoConsultoria,
        respostas: respostas,
        fotos_secoes: fotos,
        revisao: revisao,
      };

      console.log("💾 Objeto final que será salvo:", dataToSave);

      if (respostaVistoria) {
        console.log(`🔄 Atualizando vistoria existente: ${respostaVistoria.id}`);
        await RespostaVistoria.update(respostaVistoria.id, dataToSave);
        console.log("✅ Vistoria salva com sucesso!");
        toast.success(t.saved);
        navigate(createPageUrl(`IniciarVistoria?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`));
      } else {
        console.log("✨ Criando nova vistoria...");
        const novaResposta = await RespostaVistoria.create(dataToSave);
        console.log("✅ Vistoria criada com sucesso!");
        toast.success(t.saved);
        navigate(createPageUrl(`PreencherVistoria?respostaId=${novaResposta.id}&unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}&modo=edicao`), { replace: true });
        // Não navegar para fora após criar, mas sim recarregar a página no modo de edição
        return; // Impede a navegação duplicada abaixo
      }

    } catch (error) {
      console.error("❌ Erro ao salvar vistoria:", error);
      toast.error(t.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isValidId(unidadeId) && isValidId(empreendimentoId)) {
      navigate(createPageUrl(`IniciarVistoria?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`));
    } else {
      navigate(createPageUrl("Empreendimentos"));
    }
  };

  if (!hasValidIds) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen p-8 text-center ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{t.missingIDs}</h2>
        <p className={`mb-6 max-w-md ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {t.missingIDsMessage}
          <br />
          Unidade: '{unidadeId}' | Empreendimento: '{empreendimentoId}' | Formulário: '{formularioId}' | Resposta: '{respostaId}'
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

  if (errorUnidade || (!formulario && !isAvulsa)) { // If not a template form AND not an ad-hoc form, then it's an error.
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
            {isAvulsa ? "Vistoria Avulsa" : formulario?.nome_formulario}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl(`IniciarVistoria?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.backToInspections}
        </Button>
      </div>

      {(nomeVistoria || dataVistoria) && (
        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {nomeVistoria || 'Nova Vistoria'}
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Data: {dataVistoria ? new Date(dataVistoria).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Não definida'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  className={`${
                    statusVistoria === 'Liberado para Ocupação' 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                      : statusVistoria === 'Não Liberado para Ocupação'
                      ? 'bg-red-100 text-red-800 hover:bg-red-200'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
                >
                  {statusVistoria || 'Em Andamento'}
                </Badge>
              </div>
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

      <form onSubmit={handleSalvar} className="space-y-6">
        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
              <Info className="w-6 h-6" /> {t.generalInfo}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Row 1: Nome da vistoria | Nome do arquivo | Revisão */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_vistoria" className={isDark ? 'text-gray-300' : ''}>{t.inspectionName}</Label>
                <Input
                  id="nome_vistoria"
                  value={nomeVistoria}
                  onChange={(e) => setNomeVistoria(e.target.value)}
                  placeholder={t.inspectionNamePlaceholder}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome_arquivo" className={isDark ? 'text-gray-300' : ''}>{t.fileName}</Label>
                <Input
                  id="nome_arquivo"
                  value={nomeArquivo}
                  onChange={(e) => setNomeArquivo(e.target.value)}
                  placeholder="Ex: RV001-2025..."
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

            {/* Row 2: Empreendimento | Endereço */}
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

            {/* Row 3: Unidade | Área do conjunto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Unidade</Label>
                <div className={`p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
                  {unidade?.unidade_empreendimento || '-'}
                </div>
              </div>
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>Área do conjunto</Label>
                <div className={`p-2 rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}>
                  {unidade?.metragem_unidade ? `${unidade.metragem_unidade} m²` : '-'}
                </div>
              </div>
            </div>

            {/* Row 4: Consultor Responsável | Participantes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consultor_responsavel" className={isDark ? 'text-gray-300' : ''}>{t.consultantInCharge}</Label>
                <Input
                  id="consultor_responsavel"
                  value={consultorResponsavel}
                  onChange={(e) => setConsultorResponsavel(e.target.value)}
                  placeholder="Nome do consultor..."
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="representantes" className={isDark ? 'text-gray-300' : ''}>{t.representatives}</Label>
                <Input
                  id="representantes"
                  value={representantes}
                  onChange={(e) => setRepresentantes(e.target.value)}
                  placeholder={t.representativesPlaceholder}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
            </div>

            {/* Row 5: Data da vistoria | Data do relatório */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_vistoria" className={isDark ? 'text-gray-300' : ''}>{t.inspectionDate}</Label>
                <Input
                  id="data_vistoria"
                  type="date"
                  value={dataVistoria}
                  onChange={(e) => setDataVistoria(e.target.value)}
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

            {/* Row 6: Nº da proposta */}
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

            {/* Row 7: Escopo da consultoria */}
            <div className="space-y-2">
              <Label htmlFor="escopo_consultoria" className={isDark ? 'text-gray-300' : ''}>Escopo da consultoria</Label>
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
                {t.inspectionForm}
              </CardTitle>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {isAvulsa ? t.addSection : formulario?.nome_formulario}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
            {isAvulsa && (
                <div className="space-y-4">
                    {dynamicForm.secoes.map((secao, secaoIndex) => (
                        <Card key={secaoIndex} className={`${isDark ? 'bg-gray-800' : ''}`}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <Input
                                    placeholder={t.sectionNamePlaceholder}
                                    value={secao.nome_secao}
                                    onChange={(e) => handleSecaoChange(secaoIndex, 'nome_secao', e.target.value)}
                                    className={`font-semibold text-lg ${isDark ? 'bg-gray-700 border-gray-600' : ''}`}
                                />
                                <Button variant="destructive" size="icon" onClick={() => handleRemoveSection(secaoIndex)} type="button">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {secao.perguntas.map((pergunta, perguntaIndex) => (
                                    <Pergunta
                                        key={`dynamic-${secaoIndex}-${perguntaIndex}`}
                                        secaoIndex={secaoIndex}
                                        perguntaIndex={perguntaIndex}
                                        pergunta={pergunta}
                                        isAvulsa={true}
                                        theme={theme}
                                        language={language}
                                        handlePerguntaChange={handleQuestionChange}
                                        handleRemovePergunta={handleRemoveQuestion}
                                        handleAddOpcao={handleAddOpcao}
                                        handleRemoveOpcao={handleRemoveOpcao}
                                        handleOpcaoChange={handleOpcaoChange}
                                        respostas={respostas}
                                        fotos={fotos}
                                        uploadingPhotos={uploadingPhotos}
                                        handleAnswerChange={handleAnswerChange}
                                        handleImageUpload={handleImageUpload}
                                        handleMultipleImageUpload={handleMultipleImageUpload}
                                        handleRemoveImage={handleRemoveImage}
                                        handleLegendChange={handleLegendChange}
                                        openCamera={openCamera}
                                        openSignatureDialog={openSignatureDialog}
                                    />
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddQuestion(secaoIndex)}
                                    type="button"
                                    className={`w-full ${isDark ? 'border-gray-600 hover:bg-gray-700' : ''}`}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> {t.addQuestion}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    <Button
                        variant="secondary"
                        onClick={handleAddSection}
                        type="button"
                        className="w-full"
                    >
                        <Plus className="mr-2 h-4 w-4" /> {t.addSection}
                    </Button>
                </div>
            )}

            {!isAvulsa && formulario?.secoes.length > 0 && formulario.secoes.map((secao, secaoIndex) => {
                return (
                    <div
                        key={secaoIndex}
                        className={`p-4 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}
                    >
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                            <h3 className="text-lg font-semibold">{secao.nome_secao}</h3>
                        </div>

                        <div className="space-y-4">
                            {secao.perguntas?.map((pergunta, perguntaIndex) => (
                                <Pergunta
                                    key={perguntaIndex}
                                    secaoIndex={secaoIndex}
                                    perguntaIndex={perguntaIndex}
                                    pergunta={pergunta}
                                    isAvulsa={false} // Not ad-hoc, so no editing UI
                                    theme={theme}
                                    language={language}
                                    handlePerguntaChange={handleQuestionChange} // Not used when isAvulsa is false, but required prop
                                    handleRemovePergunta={handleRemoveQuestion} // Not used
                                    handleAddOpcao={handleAddOpcao} // Not used
                                    handleRemoveOpcao={handleRemoveOpcao} // Not used
                                    handleOpcaoChange={handleOpcaoChange} // Not used
                                    respostas={respostas}
                                    fotos={fotos}
                                    uploadingPhotos={uploadingPhotos}
                                    handleAnswerChange={handleAnswerChange}
                                    handleImageUpload={handleImageUpload}
                                    handleMultipleImageUpload={handleMultipleImageUpload}
                                    handleRemoveImage={handleRemoveImage}
                                    handleLegendChange={handleLegendChange}
                                    openCamera={openCamera}
                                    openSignatureDialog={openSignatureDialog}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
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