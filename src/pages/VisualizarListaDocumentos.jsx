import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RDO, Empreendimento } from '@/api/entities';
import { getUploadUrl } from '@/api/config';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';

// Função para formatar dia da semana
const formatarDiaSemana = (data) => {
  if (!data) return '';
  const date = new Date(data + 'T00:00:00');
  const days = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado'];
  return days[date.getDay()];
};

// Função para normalizar dia da semana (converte curto para completo)
const normalizarDiaSemana = (dia) => {
  const diasNormalizados = {
    'Domingo': 'Domingo',
    'Segunda': 'Segunda-Feira',
    'Terça': 'Terça-Feira',
    'Quarta': 'Quarta-Feira',
    'Quinta': 'Quinta-Feira',
    'Sexta': 'Sexta-Feira',
    'Sábado': 'Sábado',
    'Segunda-Feira': 'Segunda-Feira',
    'Terça-Feira': 'Terça-Feira',
    'Quarta-Feira': 'Quarta-Feira',
    'Quinta-Feira': 'Quinta-Feira',
    'Sexta-Feira': 'Sexta-Feira'
  };
  return diasNormalizados[dia] || dia;
};

const translations = {
  pt: {
    backToList: "Voltar à Lista",
    print: "Imprimir",
    documentList: "RELATÓRIO DIÁRIO DE OBRA (RDO)",
    reportInfo: "RELATÓRIO",
    number: "Nº",
    date: "DATA",
    dayOfWeek: "DIA DA SEMANA",
    work: "OBRA",
    location: "LOCAL",
    contractor: "CONTRATADA",
    responsible: "RESPONSÁVEL",
    contract: "CONTRATO",
    contractualDeadline: "Prazo Contratual",
    elapsedTime: "Prazo Decorrido",
    remainingTime: "Prazo a Vencer",
    days: "dias",
    weatherCondition: "Condição Climática",
    time: "Tempo",
    condition: "Condição",
    morning: "Manhã",
    afternoon: "Tarde",
    fieldTeams: "Equipe de Campo / Mão de Obra",
    juniorEngineer: "Engenheiro Pleno",
    seniorEngineer: "Engenheiro Sênior",
    administrative: "Administrativo",
    thirdParty: "Terceiros",
    activitiesPerformed: "Atividades Realizadas",
    occurrences: "Ocorrências",
    photographicRecords: "Registros Fotográficos",
    observations: "Observações"
  },
  en: {
    backToList: "Back to List",
    print: "Print",
    documentList: "DAILY WORK REPORT (RDO)",
    reportInfo: "REPORT",
    number: "No.",
    date: "DATE",
    dayOfWeek: "DAY OF WEEK",
    work: "WORK",
    location: "LOCATION",
    contractor: "CONTRACTOR",
    responsible: "RESPONSIBLE",
    contract: "CONTRACT",
    contractualDeadline: "Contractual Deadline",
    elapsedTime: "Elapsed Time",
    remainingTime: "Remaining Time",
    days: "days",
    weatherCondition: "Weather Condition",
    time: "Weather",
    condition: "Condition",
    morning: "Morning",
    afternoon: "Afternoon",
    fieldTeams: "Field Teams / Labor",
    juniorEngineer: "Junior Engineer",
    seniorEngineer: "Senior Engineer",
    administrative: "Administrative",
    thirdParty: "Third Party",
    activitiesPerformed: "Activities Performed",
    occurrences: "Occurrences",
    photographicRecords: "Photographic Records",
    observations: "Observations"
  }
};

// Componente ReportPage com cabeçalho e rodapé
const ReportPage = ({ children, pageNumber, totalPages, documento, empreendimento }) => {
  const logoHorizontalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png";
  const HEADER_HEIGHT = '80px';
  const FOOTER_HEIGHT = '45px';

  return (
    <div className="report-page w-[210mm] h-[297mm] mx-auto bg-white shadow-lg my-8 print:my-0 print:shadow-none relative" style={{ overflow: 'hidden' }}>
      {pageNumber > 1 && (
        <div
          className="flex justify-between items-center p-4 border-b border-gray-200"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT }}
        >
          <img src={logoHorizontalUrl} alt="Logo Interativa Engenharia" className="h-12" />
          <div className="text-right">
            <h2 className="text-sm font-bold text-gray-800 uppercase">
              RELATÓRIO DIÁRIO DE OBRA (RDO)
            </h2>
            <p className="text-xs text-gray-600">
              {empreendimento?.nome_empreendimento}
            </p>
            <p className="text-xs font-medium text-gray-800 mt-1">
              {documento?.data_relatorio ? new Date(documento.data_relatorio + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
            </p>
          </div>
        </div>
      )}

      <div
        className="overflow-hidden"
        style={{
          paddingTop: pageNumber > 1 ? HEADER_HEIGHT : '0px',
          paddingBottom: pageNumber > 1 ? `calc(${FOOTER_HEIGHT} + 10px)` : '0px',
        }}
      >
        {children}
      </div>

      {pageNumber > 1 && (
        <div
          className="px-3 py-1 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT }}
        >
          <div className="flex-1 text-left">
            <span className="font-medium">Arquivo:</span>
            <br />
            <span>{documento?.nome_arquivo || 'N/A'}</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span>INTERATIVA ENGENHARIA</span>
            <span>www.interativaengenharia.com.br</span>
          </div>
          <div className="flex-1 text-right">
            <span>Página {pageNumber} de {totalPages}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Função para calcular o peso de uma seção
const calculateSectionWeight = (section) => {
  if (!section) return 0;

  // Seções grandes (tabelas)
  if (section.type === 'weather' || section.type === 'fieldTeams') return 2;
  if (section.type === 'activities' || section.type === 'occurrences') {
    const items = section.items?.length || 0;
    return 1 + Math.ceil(items / 10); // 10 itens por unidade de peso
  }
  if (section.type === 'observations') {
    const length = section.content?.length || 0;
    return 1 + Math.ceil(length / 500); // 500 caracteres por unidade
  }

  // Seções pequenas (campos de dados)
  return 1;
};

// Função para dividir o conteúdo em páginas
const paginateContent = (documento, empreendimento, t) => {
  const pages = [];
  const MAX_WEIGHT_PER_PAGE = 10; // Peso máximo por página

  // Estrutura do conteúdo em seções
  const sections = [
    {
      id: 'header',
      type: 'header',
      weight: 1,
      render: () => (
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">{t.documentList}</h1>
        </div>
      )
    },
    {
      id: 'reportInfo',
      type: 'info',
      weight: 1,
      render: () => (
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="border border-gray-300 p-2">
              <p className="text-xs font-semibold text-gray-600">{t.reportInfo} {t.number}</p>
              <p className="text-sm font-bold">{documento.numero_relatorio || '-'}</p>
            </div>
            <div className="border border-gray-300 p-2">
              <p className="text-xs font-semibold text-gray-600">{t.date}</p>
              <p className="text-sm font-bold">
                {documento.data_relatorio ? new Date(documento.data_relatorio + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
              </p>
            </div>
            <div className="border border-gray-300 p-2">
              <p className="text-xs font-semibold text-gray-600">{t.dayOfWeek}</p>
              <p className="text-sm font-bold">{normalizarDiaSemana(documento.dia_semana) || formatarDiaSemana(documento.data_relatorio) || '-'}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'workInfo',
      type: 'info',
      weight: 1,
      render: () => (
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="border border-gray-300 p-2">
              <p className="text-xs font-semibold text-gray-600">{t.work}</p>
              <p className="text-sm">{documento.obra_nome || '-'}</p>
            </div>
            <div className="border border-gray-300 p-2">
              <p className="text-xs font-semibold text-gray-600">{t.location}</p>
              <p className="text-sm">{documento.obra_local || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-300 p-2">
              <p className="text-xs font-semibold text-gray-600">{t.contractor}</p>
              <p className="text-sm">{documento.contratada || '-'}</p>
            </div>
            <div className="border border-gray-300 p-2">
              <p className="text-xs font-semibold text-gray-600">{t.responsible}</p>
              <p className="text-sm">{documento.responsavel || '-'}</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Adicionar seção de contrato se existir
  if (documento.contrato || documento.prazo_contratual) {
    sections.push({
      id: 'contract',
      type: 'info',
      weight: 1,
      render: () => (
        <div className="mb-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="border border-gray-300 p-2">
              <p className="text-xs font-semibold text-gray-600">{t.contract}</p>
              <p className="text-sm">{documento.contrato || '-'}</p>
            </div>
            <div className="border border-gray-300 p-2">
              <p className="text-xs font-semibold text-gray-600">{t.contractualDeadline}</p>
              <p className="text-sm">{documento.prazo_contratual ? `${documento.prazo_contratual} ${t.days}` : '-'}</p>
            </div>
            <div className="border border-gray-300 p-2">
              <p className="text-xs font-semibold text-gray-600">{t.elapsedTime}</p>
              <p className="text-sm">{documento.prazo_decorrido ? `${documento.prazo_decorrido} ${t.days}` : '-'}</p>
            </div>
            <div className="border border-gray-300 p-2">
              <p className="text-xs font-semibold text-gray-600">{t.remainingTime}</p>
              <p className="text-sm">{documento.prazo_vencer ? `${documento.prazo_vencer} ${t.days}` : '-'}</p>
            </div>
          </div>
        </div>
      )
    });
  }

  // Adicionar condição climática
  if (documento.condicao_climatica) {
    sections.push({
      id: 'weather',
      type: 'weather',
      weight: 2,
      render: () => (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2 bg-gray-100 p-2">{t.weatherCondition}</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2 text-xs font-semibold text-left w-32"></th>
                <th className="border border-gray-300 p-2 text-xs font-semibold text-center">{t.time}</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold text-center">{t.condition}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 text-sm font-semibold">{t.morning}</td>
                <td className="border border-gray-300 p-2 text-sm text-center">{documento.condicao_climatica.manha_tempo || '-'}</td>
                <td className="border border-gray-300 p-2 text-sm text-center">{documento.condicao_climatica.manha_condicao || '-'}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 text-sm font-semibold">{t.afternoon}</td>
                <td className="border border-gray-300 p-2 text-sm text-center">{documento.condicao_climatica.tarde_tempo || '-'}</td>
                <td className="border border-gray-300 p-2 text-sm text-center">{documento.condicao_climatica.tarde_condicao || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    });
  }

  // Adicionar equipe de campo
  if (documento.equipes_campo) {
    sections.push({
      id: 'fieldTeams',
      type: 'fieldTeams',
      weight: 2,
      render: () => (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2 bg-gray-100 p-2">{t.fieldTeams}</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2 text-xs font-semibold text-center">{t.juniorEngineer}</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold text-center">{t.seniorEngineer}</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold text-center">{t.administrative}</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold text-center">{t.thirdParty}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 text-sm text-center">{documento.equipes_campo.engenheiro_pleno || 0}</td>
                <td className="border border-gray-300 p-2 text-sm text-center">{documento.equipes_campo.engenheiro_senior || 0}</td>
                <td className="border border-gray-300 p-2 text-sm text-center">{documento.equipes_campo.administrativo || 0}</td>
                <td className="border border-gray-300 p-2 text-sm text-center">{documento.equipes_campo.terceiros || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )
    });
  }

  // Adicionar atividades em grupos
  if (documento.atividades_realizadas && documento.atividades_realizadas.length > 0) {
    const itemsPerGroup = 10;
    const atividadeGroups = [];
    for (let i = 0; i < documento.atividades_realizadas.length; i += itemsPerGroup) {
      atividadeGroups.push(documento.atividades_realizadas.slice(i, i + itemsPerGroup));
    }

    atividadeGroups.forEach((group, groupIdx) => {
      sections.push({
        id: `activities-${groupIdx}`,
        type: 'activities',
        items: group,
        weight: 7,
        render: () => (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-2 bg-gray-100 p-2">{t.activitiesPerformed}</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2 text-xs font-semibold text-center w-16">Nº</th>
                  <th className="border border-gray-300 p-2 text-xs font-semibold text-left">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {group.map((ativ, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-2 text-sm text-center">{ativ.numero}</td>
                    <td className="border border-gray-300 p-2 text-sm" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{ativ.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      });
    });
  }

  // Adicionar ocorrências
  if (documento.ocorrencias && documento.ocorrencias.length > 0) {
    sections.push({
      id: 'occurrences',
      type: 'occurrences',
      items: documento.ocorrencias,
      weight: 8,
      render: () => (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2 bg-gray-100 p-2">{t.occurrences}</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2 text-xs font-semibold text-center w-16">Nº</th>
                <th className="border border-gray-300 p-2 text-xs font-semibold text-left">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {documento.ocorrencias.map((ocor, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 p-2 text-sm text-center">{ocor.numero}</td>
                  <td className="border border-gray-300 p-2 text-sm" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{ocor.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    });
  }

  // Adicionar registros fotográficos em grupos de 4 por página
  if (documento.fotos && documento.fotos.length > 0) {
    const fotoGroups = [];
    for (let i = 0; i < documento.fotos.length; i += 4) {
      fotoGroups.push(documento.fotos.slice(i, i + 4));
    }

    fotoGroups.forEach((fotos, groupIdx) => {
      const isLastGroup = groupIdx === fotoGroups.length - 1;
      sections.push({
        id: `photos-${groupIdx}`,
        type: 'photos',
        items: fotos,
        weight: isLastGroup ? 23 : 20,
        render: () => (
          <div className="mb-6">
            {groupIdx === 0 && <h3 className="text-sm font-bold text-gray-900 mb-2 bg-gray-100 p-2">{t.photographicRecords}</h3>}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {fotos.map((foto, idx) => (
                <div key={idx} className="border border-gray-300 p-2">
                  <img
                    src={getUploadUrl(foto.url) || foto.url}
                    alt={foto.legenda || `Foto`}
                    className="w-full h-48 object-cover rounded mb-2"
                    crossOrigin="anonymous"
                    loading="eager"
                    onError={(e) => {
                      console.error('❌ Erro ao carregar imagem:', {
                        src: e.target.src,
                        originalUrl: foto.url,
                        processedUrl: getUploadUrl(foto.url)
                      });
                      e.target.style.border = '2px solid red';
                    }}
                  />
                  {foto.legenda && (
                    <p className="text-xs text-gray-700 text-center">{foto.legenda}</p>
                  )}
                </div>
              ))}
            </div>
            {isLastGroup && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4 bg-gray-100 p-2">Assinaturas</h3>
                <div className="grid grid-cols-2 gap-8">
                  {documento.assinaturas && documento.assinaturas.length > 0 ? (
                    documento.assinaturas.map((ass, idx) => (
                      <div key={idx} className="text-center">
                        {ass.assinatura_imagem ? (
                          <img
                            src={ass.assinatura_imagem}
                            alt={`Assinatura ${ass.parte || ass.nome}`}
                            className="w-full h-24 object-contain mb-2"
                          />
                        ) : (
                          <div className="border-b border-gray-400 h-6 mb-2"></div>
                        )}
                        <p className="text-xs font-semibold mt-2">{ass.parte || 'Signatário'}</p>
                        {ass.nome && <p className="text-xs text-gray-600">{ass.nome}</p>}
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="border-t border-gray-400 pt-2 min-h-24"></div>
                        <p className="text-xs font-semibold mt-2">Responsável pela Obra</p>
                      </div>
                      <div className="text-center">
                        <div className="border-t border-gray-400 pt-2 min-h-24"></div>
                        <p className="text-xs font-semibold mt-2">Gerenciadora / Fiscal</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      });
    });
  } else {
    // Se não houver fotos, adicionar assinaturas como seção separada
    sections.push({
      id: 'signatures',
      type: 'signatures',
      weight: 3,
      render: () => (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 bg-gray-100 p-2">Assinaturas</h3>
          <div className="grid grid-cols-2 gap-8">
            {documento.assinaturas && documento.assinaturas.length > 0 ? (
              documento.assinaturas.map((ass, idx) => (
                <div key={idx} className="text-center">
                  {ass.assinatura_imagem ? (
                    <img
                      src={ass.assinatura_imagem}
                      alt={`Assinatura ${ass.parte || ass.nome}`}
                      className="w-full h-24 object-contain mb-2"
                    />
                  ) : (
                    <div className="border-b border-gray-400 h-6 mb-2"></div>
                  )}
                  <p className="text-xs font-semibold mt-2">{ass.parte || 'Signatário'}</p>
                  {ass.nome && <p className="text-xs text-gray-600">{ass.nome}</p>}
                </div>
              ))
            ) : (
              <>
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-2 min-h-24"></div>
                  <p className="text-xs font-semibold mt-2">Responsável pela Obra</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-2 min-h-24"></div>
                  <p className="text-xs font-semibold mt-2">Gerenciadora / Fiscal</p>
                </div>
              </>
            )}
          </div>
        </div>
      )
    });
  }

  // Adicionar observações
  if (documento.observacoes) {
    sections.push({
      id: 'observations',
      type: 'observations',
      content: documento.observacoes,
      weight: 2 + Math.ceil(documento.observacoes.length / 500),
      render: () => (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2 bg-gray-100 p-2">{t.observations}</h3>
          <div className="border border-gray-300 p-3">
            <p className="text-sm whitespace-pre-wrap">{documento.observacoes}</p>
          </div>
        </div>
      )
    });
  }

  // Dividir seções em páginas
  let currentPageSections = [];
  let currentPageWeight = 0;

  sections.forEach((section, index) => {
    // Se adicionar esta seção ultrapassar o limite E já tem conteúdo na página, criar nova página
    if (currentPageWeight + section.weight > MAX_WEIGHT_PER_PAGE && currentPageSections.length > 0) {
      pages.push([...currentPageSections]);
      currentPageSections = [];
      currentPageWeight = 0;
    }

    currentPageSections.push(section);
    currentPageWeight += section.weight;
  });

  // Adicionar última página se houver seções restantes
  if (currentPageSections.length > 0) {
    pages.push(currentPageSections);
  }

  return pages;
};

export default function VisualizarListaDocumentos({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const documentoId = urlParams.get('documentoId');

  const [documento, setDocumento] = useState(null);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(initialLanguage || 'pt');

  const t = translations[language];

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(localStorage.getItem('language') || 'pt');
    window.addEventListener('language-change', handleLanguageChange);
    handleLanguageChange();
    return () => window.removeEventListener('language-change', handleLanguageChange);
  }, []);

  useEffect(() => {
    if (documentoId) {
      loadData();
    }
  }, [documentoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docData = await RDO.get(documentoId);
      setDocumento(docData);

      if (docData.id_empreendimento) {
        const empData = await Empreendimento.get(docData.id_empreendimento);
        setEmpreendimento(empData);
      }
    } catch (error) {
      console.error("Erro ao carregar documento:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    // Aguardar todas as imagens carregarem antes de imprimir
    const images = document.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => {
          console.warn('Erro ao carregar imagem:', img.src);
          resolve(); // Continua mesmo com erro
        };
        // Timeout de 5 segundos por imagem
        setTimeout(resolve, 5000);
      });
    });

    try {
      await Promise.all(imagePromises);
      // Pequeno delay adicional para garantir renderização
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Erro ao aguardar carregamento de imagens:', error);
    }

    window.print();
  };

  if (loading || !documento) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Carregando documento...</p>
      </div>
    );
  }

  const year = new Date(documento.data_relatorio || Date.now()).getFullYear();
  const coverFrameUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png";
  const redDecorativeElementUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
  const bottomRightFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
  const logoInterativaUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
  const logoInterativaBrancoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png";
  const redColor = '#CE2D2D';
  const empreendimentoImageUrl = getUploadUrl(empreendimento?.foto_empreendimento) || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80';

  // Paginar conteúdo
  const contentPages = paginateContent(documento, empreendimento, t);
  const totalPages = contentPages.length + 1; // +1 para a capa

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Botões de ação - não imprimem */}
      <div className="print:hidden bg-white border-b sticky top-0 z-10 px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl(`EmpreendimentoListaDocumentos?empreendimentoId=${documento.id_empreendimento}`))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.backToList}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              {t.print}
            </Button>
          </div>
        </div>
      </div>

      {/* Capa */}
      <div className="report-page relative w-[210mm] h-[297mm] mx-auto bg-white shadow-lg my-8 print:my-0 print:shadow-none overflow-hidden" style={{ margin: '20px auto', padding: 5 }}>
        <div
          className="absolute w-full h-full bg-center bg-no-repeat z-10"
          style={{
            backgroundImage: `url(${empreendimentoImageUrl})`,
            backgroundSize: 'cover',
            opacity: 0.2,
            top: '-10px',
            left: '-10px',
            width: 'calc(100% + 20px)',
            height: 'calc(100% + 20px)',
          }}
        />

        <div
          className="absolute top-0 left-0 w-full h-full bg-contain bg-left-top bg-no-repeat z-20"
          style={{
            backgroundImage: `url(${coverFrameUrl})`,
            height: '150%',
          }}
        />

        <div
          className="absolute z-50"
          style={{
            top: '25px',
            left: '11px',
            width: '350px',
            height: '170px',
          }}
        >
          <img
            src={logoInterativaUrl}
            alt="Logo Interativa"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
          />
        </div>

        <div
          className="absolute flex items-center justify-center z-40"
          style={{
            top: '23%', left: '11%', width: '22.7%', height: '25%',
            transform: 'rotate(27deg)',
          }}
        >
          <span className="font-normal" style={{ fontSize: '60px', fontFamily: "'Inter', sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.2)', color: 'white' }}>
            {year}
          </span>
        </div>

        <div className="absolute z-30" style={{ top: '10%', right: '8%', width: '50%', textAlign: 'right' }}>
          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1', marginBottom: '4px' }}>
            RELATÓRIO
          </h1>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '29.5px', color: redColor, letterSpacing: '4px' }}>
            DIÁRIO DE OBRA (RDO)
          </h2>
        </div>

        <div className="absolute z-30" style={{ top: '50%', right: '2%', width: '40%', padding: '1.3% 2.5%', textAlign: 'center' }}>
          <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '5px', color: 'black' }}>
            GERENCIAMENTO DE OBRA
          </h1>
        </div>

        <div
          className="absolute z-20"
          style={{
            top: '-350px', right: '-30%', width: '1700px', height: '1150px',
            backgroundColor: redColor,
            WebkitMaskImage: `url(${redDecorativeElementUrl})`,
            maskImage: `url(${redDecorativeElementUrl})`,
            WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center', maskPosition: 'center',
          }}
        />

        <div
          className="absolute z-50"
          style={{
            top: '-10%', right: '-20%', width: '1800px', height: '800px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <img
            src={logoInterativaBrancoUrl}
            alt="Logo Interativa"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        <div
          className="absolute right-0 w-full h-full bg-no-repeat z-40"
          style={{
            bottom: '-5%',
            backgroundImage: `url('${bottomRightFrameUrl}')`,
            height: '1000%', backgroundSize: '230% auto', backgroundPosition: '65% 100%',
          }}
        />

        <div
          className="absolute z-10"
          style={{
            bottom: '0%', left: '0%', width: '450px', height: '800px',
            borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            clipPath: 'polygon(0 0%, 100% 23%, 100% 100%, 0% 100%)'
          }}
        >
          <img
            src={empreendimentoImageUrl}
            alt={empreendimento?.nome_empreendimento || 'Foto do empreendimento'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div className="absolute flex items-center justify-center z-50" style={{ bottom: '0', left: '0', right: '0', height: '65px', backgroundColor: redColor, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 5% 100%)', paddingLeft: '15%', paddingRight: '5%' }}>
          <span className="text-white w-full" style={{ fontSize: '32px', letterSpacing: '1px', fontWeight: 'normal', fontFamily: 'Poppins', textAlign: 'center', lineHeight: '1.2' }}>
            {empreendimento?.nome_empreendimento || 'Empreendimento'}
          </span>
        </div>
      </div>

      {/* Páginas de Conteúdo */}
      {contentPages.map((pageSections, pageIndex) => (
        <ReportPage
          key={pageIndex}
          pageNumber={pageIndex + 2}
          totalPages={totalPages}
          documento={documento}
          empreendimento={empreendimento}
        >
          <div className="px-12 py-6">
            {pageSections.map((section) => (
              <div key={section.id}>
                {section.render()}
              </div>
            ))}
          </div>
        </ReportPage>
      ))}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');
        
        @media print {
          .print\\:hidden { display: none !important; }
          .report-page {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0;
            overflow: hidden;
            box-shadow: none;
            page-break-after: always;
            page-break-inside: avoid;
          }
          .report-page:last-child { 
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: 'Poppins', 'Inter', sans-serif;
            overflow: hidden;
          }
          @page { 
            size: A4; 
            margin: 0;
          }
          @page:last {
            margin: 0;
          }
        }
        
        @media screen {
          .report-page {
            width: 210mm;
            height: 297mm;
            margin: 20px auto;
            padding: 0;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            background: white;
            position: relative;
            overflow: hidden;
          }
          .report-page:first-child {
            margin: 0 auto 20px auto;
          }
        }
      `}</style>
    </div>
  );
}