import React, { lazy, Suspense } from "react";
import Layout from "./Layout.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";

// Lazy-load large pages to reduce initial bundle size
const Empreendimentos = lazy(() => import("./Empreendimentos"));
const Usuarios = lazy(() => import("./Usuarios"));
const Empreendimento = lazy(() => import("./Empreendimento"));
const Unidade = lazy(() => import("./Unidade"));
const EditarEmpreendimento = lazy(() => import("./EditarEmpreendimento"));
const EditarRegistro = lazy(() => import("./EditarRegistro"));
const RelatorioUnidade = lazy(() => import("./RelatorioUnidade"));
const VisualizarRelatorio = lazy(() => import("./VisualizarRelatorio"));
const UnidadeDocumentos = lazy(() => import("./UnidadeDocumentos"));
const UnidadeRegistros = lazy(() => import("./UnidadeRegistros"));
const NovaEmissao = lazy(() => import("./NovaEmissao"));
const UnidadeAnalises = lazy(() => import("./UnidadeAnalises"));
const NovaEmissaoAnalise = lazy(() => import("./NovaEmissaoAnalise"));
const EmpreendimentoRelatorioAnaliseTecnica = lazy(() => import("./EmpreendimentoRelatorioAnaliseTecnica"));
const EditarRelatorioAnaliseTecnica = lazy(() => import("./EditarRelatorioAnaliseTecnica"));
const VisualizarRelatorioAnaliseTecnica = lazy(() => import("./VisualizarRelatorioAnaliseTecnica"));
const UnidadeKickOff = lazy(() => import("./UnidadeKickOff"));
const NovaEmissaoVistoria = lazy(() => import("./NovaEmissaoVistoria"));
const RelatorioVistoria = lazy(() => import("./RelatorioVistoria"));
const VisualizarRelatorioVistoria = lazy(() => import("./VisualizarRelatorioVistoria"));
const AdicionarVistoriaFromGeral = lazy(() => import("./AdicionarVistoriaFromGeral"));
const RelatorioAnalise = lazy(() => import("./RelatorioAnalise"));
const VisualizarRelatorioAnalise = lazy(() => import("./VisualizarRelatorioAnalise"));
const RelatorioKickOff = lazy(() => import("./RelatorioKickOff"));
const VisualizarRelatorioKickOff = lazy(() => import("./VisualizarRelatorioKickOff"));
const GerenciarFormularios = lazy(() => import("./GerenciarFormularios"));
const NovaVistoriaFormulario = lazy(() => import("./NovaVistoriaFormulario"));
const IniciarVistoria = lazy(() => import("./IniciarVistoria"));
const PreencherVistoria = lazy(() => import("./PreencherVistoria"));
const UnidadeVistoria = lazy(() => import("./UnidadeVistoria"));

const PreencherTermoDeAceite = lazy(() => import("./PreencherTermoDeAceite"));
const VisualizarTermoAceite = lazy(() => import("./VisualizarTermoAceite"));
const RelatorioVistoriaObras = lazy(() => import("./RelatorioVistoriaObras"));
const GaleriaRelatorio = lazy(() => import("./GaleriaRelatorio"));
const Planejamento = lazy(() => import("./Planejamento"));
const AtividadesPadrao = lazy(() => import("./AtividadesPadrao"));
// NovoDiarioObra was renamed/moved to NovoRDO — import the existing file
const NovoDiarioObra = lazy(() => import("./NovoRDO"));
const VisualizarDiarioObra = lazy(() => import("./VisualizarDiarioObra"));
const EditarDiarioObra = lazy(() => import("./EditarDiarioObra"));
const EmpreendimentoDiariosObra = lazy(() => import("./EmpreendimentoDiariosObra"));
const EmpreendimentoAmostras = lazy(() => import("./EmpreendimentoAmostras"));
const NovaAprovacaoAmostra = lazy(() => import("./NovaAprovacaoAmostra"));
const EditarAprovacaoAmostra = lazy(() => import("./EditarAprovacaoAmostra"));
const VisualizarAprovacaoAmostra = lazy(() => import("./VisualizarAprovacaoAmostra"));
const EmpreendimentoVistoriasTerminalidade = lazy(() => import("./EmpreendimentoVistoriasTerminalidade"));
const EmpreendimentoAtaReuniao = lazy(() => import("./EmpreendimentoAtaReuniao"));
const EmpreendimentoAtasReuniao = lazy(() => import("./EmpreendimentoAtasReuniao"));
const VisualizarAtaReuniao = lazy(() => import("./VisualizarAtaReuniao"));
const NovaVistoriaTerminalidade = lazy(() => import("./NovaVistoriaTerminalidade"));
const VisualizarVistoriaTerminalidade = lazy(() => import("./VisualizarVistoriaTerminalidade"));
const EditarVistoriaTerminalidade = lazy(() => import("./EditarVistoriaTerminalidade"));
const GaleriaVistoriaTerminalidade = lazy(() => import("./GaleriaVistoriaTerminalidade"));
const EmpreendimentoRelatoriosSemanais = lazy(() => import("./EmpreendimentoRelatoriosSemanais"));
const NovoRelatorioSemanal = lazy(() => import("./NovoRelatorioSemanal"));
const EmpreendimentoPrimeirosServicos = lazy(() => import("./EmpreendimentoPrimeirosServicos"));

const EmpreendimentoTermosAceite = lazy(() => import("./EmpreendimentoTermosAceite"));
const EmpreendimentoRelatoriosSaida = lazy(() => import("./EmpreendimentoRelatoriosSaida"));
const PreencherRelatorioSaida = lazy(() => import("./PreencherRelatorioSaida"));
const VisualizarRelatorioSaida = lazy(() => import("./VisualizarRelatorioSaida"));

const NovoRelatorioPrimeirosServicos = lazy(() => import("./NovoRelatorioPrimeirosServicos"));

const EditarRelatorioPrimeirosServicos = lazy(() => import("./EditarRelatorioPrimeirosServicos"));

const VisualizarRelatorioPrimeirosServicos = lazy(() => import("./VisualizarRelatorioPrimeirosServicos"));

const EditarRelatorioSemanal = lazy(() => import("./EditarRelatorioSemanal"));

const VisualizarRelatorioSemanal = lazy(() => import("./VisualizarRelatorioSemanal"));

const AtualizarFormularioEmMassa = lazy(() => import("./AtualizarFormularioEmMassa"));

const EmpreendimentoInspecaoHidrantes = lazy(() => import("./EmpreendimentoInspecaoHidrantes"));

const NovaInspecaoHidrantes = lazy(() => import("./NovaInspecaoHidrantes"));

const NovaInspecaoHidraulica = lazy(() => import("./NovaInspecaoHidraulica"));

const EditarInspecaoHidrantes = lazy(() => import("./EditarInspecaoHidrantes"));

const VisualizarInspecaoHidrantes = lazy(() => import("./VisualizarInspecaoHidrantes"));
const EditarInspecaoHidraulica = lazy(() => import("./EditarInspecaoHidraulica"));
const VisualizarInspecaoHidraulica = lazy(() => import("./VisualizarInspecaoHidraulica"));

// Novo componente para Inspeção Hidráulica
const EmpreendimentoInspecaoHidraulica = lazy(() => import("./EmpreendimentoInspecaoHidraulica"));

const EmpreendimentoInspecaoSprinklers = lazy(() => import("./EmpreendimentoInspecaoSprinklers"));

const NovaInspecaoSprinklers = lazy(() => import("./NovaInspecaoSprinklers"));

const EditarInspecaoSprinklers = lazy(() => import("./EditarInspecaoSprinklers"));

const VisualizarInspecaoSprinklers = lazy(() => import("./VisualizarInspecaoSprinklers"));

const EmpreendimentoInspecaoAlarme = lazy(() => import("./EmpreendimentoInspecaoAlarme"));

const NovaInspecaoAlarme = lazy(() => import("./NovaInspecaoAlarme"));

const EditarInspecaoAlarme = lazy(() => import("./EditarInspecaoAlarme"));

const VisualizarInspecaoAlarme = lazy(() => import("./VisualizarInspecaoAlarme"));

const NovaInspecaoArCondicionado = lazy(() => import("./NovaInspecaoArCondicionado"));

const EditarInspecaoArCondicionado = lazy(() => import("./EditarInspecaoArCondicionado"));

const VisualizarInspecaoArCondicionado = lazy(() => import("./VisualizarInspecaoArCondicionado"));

const EmpreendimentoInspecaoArCondicionado = lazy(() => import("./EmpreendimentoInspecaoArCondicionado"));

const EmpreendimentoInspecaoControleAcesso = lazy(() => import("./EmpreendimentoInspecaoControleAcesso"));

const NovaInspecaoControleAcesso = lazy(() => import("./NovaInspecaoControleAcesso"));

const VisualizarInspecaoControleAcesso = lazy(() => import("./VisualizarInspecaoControleAcesso"));

const EditarInspecaoControleAcesso = lazy(() => import("./EditarInspecaoControleAcesso"));

const NovaInspecaoCFTV = lazy(() => import("./NovaInspecaoCFTV"));

const EditarInspecaoCFTV = lazy(() => import("./EditarInspecaoCFTV"));

const EmpreendimentoInspecaoCFTV = lazy(() => import("./EmpreendimentoInspecaoCFTV"));

const VisualizarInspecaoCFTV = lazy(() => import("./VisualizarInspecaoCFTV"));

const EmpreendimentoInspecaoSDAI = lazy(() => import("./EmpreendimentoInspecaoSDAI"));

const NovaInspecaoSDAI = lazy(() => import("./NovaInspecaoSDAI"));

const EditarInspecaoSDAI = lazy(() => import("./EditarInspecaoSDAI"));

const VisualizarInspecaoSDAI = lazy(() => import("./VisualizarInspecaoSDAI"));

const DashboardCliente = lazy(() => import("./DashboardCliente"));

const RelatoriosCliente = lazy(() => import("./RelatoriosCliente"));

const NovaInspecaoEletrica = lazy(() => import("./NovaInspecaoEletrica"));

const EditarInspecaoEletrica = lazy(() => import("./EditarInspecaoEletrica"));

const EmpreendimentoInspecaoEletrica = lazy(() => import("./EmpreendimentoInspecaoEletrica"));

const VisualizarInspecaoEletrica = lazy(() => import("./VisualizarInspecaoEletrica"));

const VisualizarListaDocumentos = lazy(() => import("./VisualizarListaDocumentos"));

const EmpreendimentoListaDocumentos = lazy(() => import("./EmpreendimentoListaDocumentos"));

const NovoRDO = lazy(() => import("./NovoRDO"));

const EditarListaDocumentos = lazy(() => import("./EditarListaDocumentos"));

const VisualizarListaDocumentosReport = lazy(() => import("./VisualizarListaDocumentosReport"));

const NovoListaDocumentosReport = lazy(() => import("./NovoListaDocumentosReport"));

const EmpreendimentoListaDocumentosReport = lazy(() => import("./EmpreendimentoListaDocumentosReport"));

const EditarListaDocumentosReport = lazy(() => import("./EditarListaDocumentosReport"));

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {

    // Dashboard removed: redirects elsewhere

    Empreendimentos: Empreendimentos,

    Usuarios: Usuarios,

    Empreendimento: Empreendimento,

    Unidade: Unidade,

    EditarEmpreendimento: EditarEmpreendimento,

    EditarRegistro: EditarRegistro,

    RelatorioUnidade: RelatorioUnidade,

    VisualizarRelatorio: VisualizarRelatorio,

    UnidadeDocumentos: UnidadeDocumentos,

    UnidadeRegistros: UnidadeRegistros,

    NovaEmissao: NovaEmissao,

    UnidadeAnalises: UnidadeAnalises,

    NovaEmissaoAnalise: NovaEmissaoAnalise,

    EmpreendimentoRelatorioAnaliseTecnica: EmpreendimentoRelatorioAnaliseTecnica,

    EditarRelatorioAnaliseTecnica: EditarRelatorioAnaliseTecnica,

    VisualizarRelatorioAnaliseTecnica: VisualizarRelatorioAnaliseTecnica,

    UnidadeKickOff: UnidadeKickOff,

    NovaEmissaoVistoria: NovaEmissaoVistoria,

    RelatorioVistoria: RelatorioVistoria,

    VisualizarRelatorioVistoria: VisualizarRelatorioVistoria,

    AdicionarVistoriaFromGeral: AdicionarVistoriaFromGeral,

    RelatorioAnalise: RelatorioAnalise,

    VisualizarRelatorioAnalise: VisualizarRelatorioAnalise,

    RelatorioKickOff: RelatorioKickOff,

    VisualizarRelatorioKickOff: VisualizarRelatorioKickOff,

    GerenciarFormularios: GerenciarFormularios,

    NovaVistoriaFormulario: NovaVistoriaFormulario,

    IniciarVistoria: IniciarVistoria,

    PreencherVistoria: PreencherVistoria,

    PreencherTermoDeAceite: PreencherTermoDeAceite,
    VisualizarTermoAceite: VisualizarTermoAceite,

    UnidadeVistoria: UnidadeVistoria,

    RelatorioVistoriaObras: RelatorioVistoriaObras,

    GaleriaRelatorio: GaleriaRelatorio,

    Planejamento: Planejamento,

    AtividadesPadrao: AtividadesPadrao,

    NovoDiarioObra: NovoDiarioObra,

    VisualizarDiarioObra: VisualizarDiarioObra,

    EditarDiarioObra: EditarDiarioObra,

    EmpreendimentoDiariosObra: EmpreendimentoDiariosObra,

    EmpreendimentoAmostras: EmpreendimentoAmostras,

    NovaAprovacaoAmostra: NovaAprovacaoAmostra,

    EditarAprovacaoAmostra: EditarAprovacaoAmostra,

    VisualizarAprovacaoAmostra: VisualizarAprovacaoAmostra,

    EmpreendimentoVistoriasTerminalidade: EmpreendimentoVistoriasTerminalidade,

    EmpreendimentoAtaReuniao: EmpreendimentoAtaReuniao,
    EmpreendimentoAtasReuniao: EmpreendimentoAtasReuniao,

    NovaVistoriaTerminalidade: NovaVistoriaTerminalidade,

    VisualizarVistoriaTerminalidade: VisualizarVistoriaTerminalidade,

    EditarVistoriaTerminalidade: EditarVistoriaTerminalidade,

    GaleriaVistoriaTerminalidade: GaleriaVistoriaTerminalidade,

    EmpreendimentoRelatoriosSemanais: EmpreendimentoRelatoriosSemanais,

    NovoRelatorioSemanal: NovoRelatorioSemanal,

    EmpreendimentoPrimeirosServicos: EmpreendimentoPrimeirosServicos,

    EmpreendimentoTermosAceite: EmpreendimentoTermosAceite,
    EmpreendimentoRelatoriosSaida: EmpreendimentoRelatoriosSaida,
    PreencherRelatorioSaida: PreencherRelatorioSaida,
    VisualizarRelatorioSaida: VisualizarRelatorioSaida,

    NovoRelatorioPrimeirosServicos: NovoRelatorioPrimeirosServicos,

    EditarRelatorioPrimeirosServicos: EditarRelatorioPrimeirosServicos,

    VisualizarRelatorioPrimeirosServicos: VisualizarRelatorioPrimeirosServicos,

    EditarRelatorioSemanal: EditarRelatorioSemanal,

    VisualizarRelatorioSemanal: VisualizarRelatorioSemanal,

    AtualizarFormularioEmMassa: AtualizarFormularioEmMassa,

    EmpreendimentoInspecaoHidrantes: EmpreendimentoInspecaoHidrantes,

    NovaInspecaoHidrantes: NovaInspecaoHidrantes,

    EditarInspecaoHidrantes: EditarInspecaoHidrantes,

    VisualizarInspecaoHidrantes: VisualizarInspecaoHidrantes,
    NovaInspecaoHidraulica: NovaInspecaoHidraulica,
    EditarInspecaoHidraulica: EditarInspecaoHidraulica,
    VisualizarInspecaoHidraulica: VisualizarInspecaoHidraulica,

    EmpreendimentoInspecaoSprinklers: EmpreendimentoInspecaoSprinklers,

    NovaInspecaoSprinklers: NovaInspecaoSprinklers,

    EditarInspecaoSprinklers: EditarInspecaoSprinklers,

    VisualizarInspecaoSprinklers: VisualizarInspecaoSprinklers,

    EmpreendimentoInspecaoAlarme: EmpreendimentoInspecaoAlarme,

    NovaInspecaoAlarme: NovaInspecaoAlarme,

    EditarInspecaoAlarme: EditarInspecaoAlarme,

    VisualizarInspecaoAlarme: VisualizarInspecaoAlarme,

    NovaInspecaoArCondicionado: NovaInspecaoArCondicionado,

    EditarInspecaoArCondicionado: EditarInspecaoArCondicionado,

    VisualizarInspecaoArCondicionado: VisualizarInspecaoArCondicionado,

    EmpreendimentoInspecaoArCondicionado: EmpreendimentoInspecaoArCondicionado,

    EmpreendimentoInspecaoControleAcesso: EmpreendimentoInspecaoControleAcesso,

    NovaInspecaoControleAcesso: NovaInspecaoControleAcesso,

    VisualizarInspecaoControleAcesso: VisualizarInspecaoControleAcesso,

    EditarInspecaoControleAcesso: EditarInspecaoControleAcesso,

    NovaInspecaoCFTV: NovaInspecaoCFTV,

    EditarInspecaoCFTV: EditarInspecaoCFTV,

    EmpreendimentoInspecaoCFTV: EmpreendimentoInspecaoCFTV,

    VisualizarInspecaoCFTV: VisualizarInspecaoCFTV,

    EmpreendimentoInspecaoSDAI: EmpreendimentoInspecaoSDAI,

    NovaInspecaoSDAI: NovaInspecaoSDAI,

    EditarInspecaoSDAI: EditarInspecaoSDAI,

    VisualizarInspecaoSDAI: VisualizarInspecaoSDAI,

    DashboardCliente: DashboardCliente,

    RelatoriosCliente: RelatoriosCliente,

    NovaInspecaoEletrica: NovaInspecaoEletrica,

    EditarInspecaoEletrica: EditarInspecaoEletrica,

    EmpreendimentoInspecaoEletrica: EmpreendimentoInspecaoEletrica,

    VisualizarInspecaoEletrica: VisualizarInspecaoEletrica,

    VisualizarListaDocumentos: VisualizarListaDocumentos,

    EmpreendimentoListaDocumentos: EmpreendimentoListaDocumentos,

    NovoRDO: NovoRDO,

    EditarListaDocumentos: EditarListaDocumentos,

    VisualizarListaDocumentosReport: VisualizarListaDocumentosReport,

    NovoListaDocumentosReport: NovoListaDocumentosReport,

    EmpreendimentoListaDocumentosReport: EmpreendimentoListaDocumentosReport,

    EditarListaDocumentosReport: EditarListaDocumentosReport,
    Login: Login,
    Register: Register,

}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const hasToken = () => {
        try { return !!(localStorage.getItem('authToken') || localStorage.getItem('token')); } catch { return false; }
    };
    let currentPage = _getCurrentPage(location.pathname);
    if (location.pathname === '/' && !hasToken()) currentPage = 'Login';

    return (
        <Layout currentPageName={currentPage}>
            <Suspense fallback={<div className="p-6">Carregando...</div>}>
                <Routes>

                    <Route path="/" element={hasToken() ? <Empreendimentos /> : <Login />} />
                    {/* Garantir variação minúscula com guarda */}
                    <Route path="/dashboard" element={hasToken() ? <Empreendimentos /> : <Login />} />


                    <Route path="/Dashboard" element={hasToken() ? <Empreendimentos /> : <Login />} />

                    <Route path="/Empreendimentos" element={hasToken() ? <Empreendimentos /> : <Login />} />
                    <Route path="/empreendimentos" element={hasToken() ? <Empreendimentos /> : <Login />} />
                    <Route path="/Login" element={<Login />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/Register" element={<Register />} />
                    <Route path="/register" element={<Register />} />
                    {/* Catch-all: exige login para qualquer rota -- movido para o final das rotas */}

                    <Route path="/Usuarios" element={<Usuarios />} />

                    <Route path="/Empreendimento" element={<Empreendimento />} />

                    <Route path="/Unidade" element={<Unidade />} />

                    <Route path="/EditarEmpreendimento" element={<EditarEmpreendimento />} />

                    <Route path="/EditarRegistro" element={<EditarRegistro />} />

                    <Route path="/RelatorioUnidade" element={<RelatorioUnidade />} />

                    <Route path="/VisualizarRelatorio" element={<VisualizarRelatorio />} />

                    <Route path="/UnidadeDocumentos" element={<UnidadeDocumentos />} />

                    <Route path="/UnidadeRegistros" element={<UnidadeRegistros />} />

                    <Route path="/NovaEmissao" element={<NovaEmissao />} />

                    <Route path="/UnidadeAnalises" element={<UnidadeAnalises />} />

                    <Route path="/NovaEmissaoAnalise" element={<NovaEmissaoAnalise />} />
                    <Route path="/NovoRelatorioAnaliseTecnica" element={<NovaEmissaoAnalise />} />

                    <Route path="/EmpreendimentoRelatorioAnaliseTecnica" element={<EmpreendimentoRelatorioAnaliseTecnica />} />

                    <Route path="/EditarRelatorioAnaliseTecnica" element={<EditarRelatorioAnaliseTecnica />} />

                    <Route path="/VisualizarRelatorioAnaliseTecnica" element={<VisualizarRelatorioAnaliseTecnica />} />

                    <Route path="/UnidadeKickOff" element={<UnidadeKickOff />} />

                    <Route path="/NovaEmissaoVistoria" element={<NovaEmissaoVistoria />} />

                    <Route path="/RelatorioVistoria" element={<RelatorioVistoria />} />

                    <Route path="/VisualizarRelatorioVistoria" element={<VisualizarRelatorioVistoria />} />

                    <Route path="/AdicionarVistoriaFromGeral" element={<AdicionarVistoriaFromGeral />} />

                    <Route path="/RelatorioAnalise" element={<RelatorioAnalise />} />

                    <Route path="/VisualizarRelatorioAnalise" element={<VisualizarRelatorioAnalise />} />

                    <Route path="/RelatorioKickOff" element={<RelatorioKickOff />} />

                    <Route path="/VisualizarRelatorioKickOff" element={<VisualizarRelatorioKickOff />} />

                    <Route path="/GerenciarFormularios" element={<GerenciarFormularios />} />

                    <Route path="/NovaVistoriaFormulario" element={<NovaVistoriaFormulario />} />

                    <Route path="/IniciarVistoria" element={<IniciarVistoria />} />

                    <Route path="/PreencherVistoria" element={<PreencherVistoria />} />
                    <Route path="/PreencherTermoDeAceite" element={<PreencherTermoDeAceite />} />
                    <Route path="/preenchertermodeaceite" element={<PreencherTermoDeAceite />} />
                    <Route path="/VisualizarTermoAceite" element={<VisualizarTermoAceite />} />
                    <Route path="/visualizartermodeaceite" element={<VisualizarTermoAceite />} />

                    <Route path="/UnidadeVistoria" element={<UnidadeVistoria />} />

                    <Route path="/RelatorioVistoriaObras" element={<RelatorioVistoriaObras />} />

                    <Route path="/GaleriaRelatorio" element={<GaleriaRelatorio />} />

                    <Route path="/Planejamento" element={<Planejamento />} />

                    <Route path="/AtividadesPadrao" element={<AtividadesPadrao />} />

                    <Route path="/NovoDiarioObra" element={<NovoDiarioObra />} />

                    <Route path="/VisualizarDiarioObra" element={<VisualizarDiarioObra />} />

                    <Route path="/EditarDiarioObra" element={<EditarDiarioObra />} />

                    <Route path="/EmpreendimentoDiariosObra" element={<EmpreendimentoDiariosObra />} />

                    <Route path="/EmpreendimentoAmostras" element={<EmpreendimentoAmostras />} />

                    <Route path="/NovaAprovacaoAmostra" element={<NovaAprovacaoAmostra />} />

                    <Route path="/EditarAprovacaoAmostra" element={<EditarAprovacaoAmostra />} />

                    <Route path="/VisualizarAprovacaoAmostra" element={<VisualizarAprovacaoAmostra />} />

                    <Route path="/EmpreendimentoVistoriasTerminalidade" element={<EmpreendimentoVistoriasTerminalidade />} />

                    <Route path="/EmpreendimentoAtaReuniao" element={<EmpreendimentoAtaReuniao />} />
                    <Route path="/empreendimentoatareuniao" element={<EmpreendimentoAtaReuniao />} />
                    <Route path="/EmpreendimentoAtasReuniao" element={<EmpreendimentoAtasReuniao />} />
                    <Route path="/empreendimentoatasreuniao" element={<EmpreendimentoAtasReuniao />} />
                    <Route path="/EmpreendimentoTermosAceite" element={<EmpreendimentoTermosAceite />} />
                    <Route path="/empreendimentotermosaceite" element={<EmpreendimentoTermosAceite />} />
                    <Route path="/EmpreendimentoRelatoriosSaida" element={<EmpreendimentoRelatoriosSaida />} />
                    <Route path="/PreencherRelatorioSaida" element={<PreencherRelatorioSaida />} />
                    <Route path="/VisualizarRelatorioSaida" element={<VisualizarRelatorioSaida />} />
                    <Route path="/VisualizarAtaReuniao" element={<VisualizarAtaReuniao />} />
                    <Route path="/visualizaratareuniao" element={<VisualizarAtaReuniao />} />

                    <Route path="/NovaVistoriaTerminalidade" element={<NovaVistoriaTerminalidade />} />

                    <Route path="/VisualizarVistoriaTerminalidade" element={<VisualizarVistoriaTerminalidade />} />

                    <Route path="/EditarVistoriaTerminalidade" element={<EditarVistoriaTerminalidade />} />

                    <Route path="/GaleriaVistoriaTerminalidade" element={<GaleriaVistoriaTerminalidade />} />

                    <Route path="/EmpreendimentoRelatoriosSemanais" element={<EmpreendimentoRelatoriosSemanais />} />

                    <Route path="/NovoRelatorioSemanal" element={<NovoRelatorioSemanal />} />

                    <Route path="/EmpreendimentoPrimeirosServicos" element={<EmpreendimentoPrimeirosServicos />} />

                    <Route path="/NovoRelatorioPrimeirosServicos" element={<NovoRelatorioPrimeirosServicos />} />

                    <Route path="/EditarRelatorioPrimeirosServicos" element={<EditarRelatorioPrimeirosServicos />} />

                    <Route path="/VisualizarRelatorioPrimeirosServicos" element={<VisualizarRelatorioPrimeirosServicos />} />

                    <Route path="/EditarRelatorioSemanal" element={<EditarRelatorioSemanal />} />

                    <Route path="/VisualizarRelatorioSemanal" element={<VisualizarRelatorioSemanal />} />

                    <Route path="/AtualizarFormularioEmMassa" element={<AtualizarFormularioEmMassa />} />

                    <Route path="/EmpreendimentoInspecaoHidrantes" element={<EmpreendimentoInspecaoHidrantes />} />

                    {/* Rota para Inspeção Hidráulica (componente dedicado) */}
                    <Route path="/EmpreendimentoInspecaoHidraulica" element={<EmpreendimentoInspecaoHidraulica />} />
                    <Route path="/empreendimentoinspecaohidraulica" element={<EmpreendimentoInspecaoHidraulica />} />

                    <Route path="/NovaInspecaoHidrantes" element={<NovaInspecaoHidrantes />} />

                    <Route path="/NovaInspecaoHidraulica" element={<NovaInspecaoHidraulica />} />
                    <Route path="/novainspecaohidraulica" element={<NovaInspecaoHidraulica />} />

                    <Route path="/EditarInspecaoHidrantes" element={<EditarInspecaoHidrantes />} />

                    <Route path="/VisualizarInspecaoHidrantes" element={<VisualizarInspecaoHidrantes />} />

                    <Route path="/EditarInspecaoHidraulica" element={<EditarInspecaoHidraulica />} />
                    <Route path="/editarinspecaohidraulica" element={<EditarInspecaoHidraulica />} />
                    <Route path="/VisualizarInspecaoHidraulica" element={<VisualizarInspecaoHidraulica />} />
                    <Route path="/visualizarinspecaohidraulica" element={<VisualizarInspecaoHidraulica />} />

                    <Route path="/EmpreendimentoInspecaoSprinklers" element={<EmpreendimentoInspecaoSprinklers />} />

                    <Route path="/NovaInspecaoSprinklers" element={<NovaInspecaoSprinklers />} />

                    <Route path="/EditarInspecaoSprinklers" element={<EditarInspecaoSprinklers />} />

                    <Route path="/VisualizarInspecaoSprinklers" element={<VisualizarInspecaoSprinklers />} />

                    <Route path="/EmpreendimentoInspecaoAlarme" element={<EmpreendimentoInspecaoAlarme />} />

                    <Route path="/NovaInspecaoAlarme" element={<NovaInspecaoAlarme />} />

                    <Route path="/EditarInspecaoAlarme" element={<EditarInspecaoAlarme />} />

                    <Route path="/VisualizarInspecaoAlarme" element={<VisualizarInspecaoAlarme />} />

                    <Route path="/NovaInspecaoArCondicionado" element={<NovaInspecaoArCondicionado />} />

                    <Route path="/EditarInspecaoArCondicionado" element={<EditarInspecaoArCondicionado />} />

                    <Route path="/VisualizarInspecaoArCondicionado" element={<VisualizarInspecaoArCondicionado />} />

                    <Route path="/EmpreendimentoInspecaoArCondicionado" element={<EmpreendimentoInspecaoArCondicionado />} />

                    <Route path="/EmpreendimentoInspecaoControleAcesso" element={<EmpreendimentoInspecaoControleAcesso />} />

                    <Route path="/NovaInspecaoControleAcesso" element={<NovaInspecaoControleAcesso />} />

                    <Route path="/VisualizarInspecaoControleAcesso" element={<VisualizarInspecaoControleAcesso />} />

                    <Route path="/EditarInspecaoControleAcesso" element={<EditarInspecaoControleAcesso />} />

                    <Route path="/NovaInspecaoCFTV" element={<NovaInspecaoCFTV />} />

                    <Route path="/EditarInspecaoCFTV" element={<EditarInspecaoCFTV />} />

                    <Route path="/EmpreendimentoInspecaoCFTV" element={<EmpreendimentoInspecaoCFTV />} />

                    <Route path="/VisualizarInspecaoCFTV" element={<VisualizarInspecaoCFTV />} />

                    <Route path="/EmpreendimentoInspecaoSDAI" element={<EmpreendimentoInspecaoSDAI />} />

                    <Route path="/NovaInspecaoSDAI" element={<NovaInspecaoSDAI />} />

                    <Route path="/EditarInspecaoSDAI" element={<EditarInspecaoSDAI />} />

                    <Route path="/VisualizarInspecaoSDAI" element={<VisualizarInspecaoSDAI />} />

                    <Route path="/DashboardCliente" element={<DashboardCliente />} />

                    <Route path="/RelatoriosCliente" element={<RelatoriosCliente />} />

                    <Route path="/NovaInspecaoEletrica" element={<NovaInspecaoEletrica />} />

                    <Route path="/EditarInspecaoEletrica" element={<EditarInspecaoEletrica />} />

                    <Route path="/EmpreendimentoInspecaoEletrica" element={<EmpreendimentoInspecaoEletrica />} />

                    <Route path="/VisualizarInspecaoEletrica" element={<VisualizarInspecaoEletrica />} />

                    <Route path="/VisualizarListaDocumentos" element={<VisualizarListaDocumentos />} />

                    <Route path="/EmpreendimentoListaDocumentos" element={<EmpreendimentoListaDocumentos />} />

                    <Route path="/NovoRDO" element={<NovoRDO />} />

                    <Route path="/EditarListaDocumentos" element={<EditarListaDocumentos />} />

                    <Route path="/VisualizarListaDocumentosReport" element={<VisualizarListaDocumentosReport />} />

                    <Route path="/NovoListaDocumentosReport" element={<NovoListaDocumentosReport />} />

                    <Route path="/EmpreendimentoListaDocumentosReport" element={<EmpreendimentoListaDocumentosReport />} />

                    <Route path="/EditarListaDocumentosReport" element={<EditarListaDocumentosReport />} />
                    {/* Catch-all: exige login para qualquer rota */}
                    <Route path="*" element={hasToken() ? <Empreendimentos /> : <Login />} />
                </Routes>
            </Suspense>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}