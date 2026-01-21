import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Empreendimentos from "./Empreendimentos";

import Usuarios from "./Usuarios";

import Empreendimento from "./Empreendimento";

import Unidade from "./Unidade";

import EditarEmpreendimento from "./EditarEmpreendimento";

import EditarRegistro from "./EditarRegistro";

import RelatorioUnidade from "./RelatorioUnidade";

import VisualizarRelatorio from "./VisualizarRelatorio";

import UnidadeDocumentos from "./UnidadeDocumentos";

import UnidadeRegistros from "./UnidadeRegistros";

import NovaEmissao from "./NovaEmissao";

import UnidadeAnalises from "./UnidadeAnalises";

import NovaEmissaoAnalise from "./NovaEmissaoAnalise";

import UnidadeKickOff from "./UnidadeKickOff";

import NovaEmissaoVistoria from "./NovaEmissaoVistoria";

import RelatorioVistoria from "./RelatorioVistoria";

import VisualizarRelatorioVistoria from "./VisualizarRelatorioVistoria";

import AdicionarVistoriaFromGeral from "./AdicionarVistoriaFromGeral";

import RelatorioAnalise from "./RelatorioAnalise";

import VisualizarRelatorioAnalise from "./VisualizarRelatorioAnalise";

import RelatorioKickOff from "./RelatorioKickOff";

import VisualizarRelatorioKickOff from "./VisualizarRelatorioKickOff";

import GerenciarFormularios from "./GerenciarFormularios";

import NovaVistoriaFormulario from "./NovaVistoriaFormulario";

import IniciarVistoria from "./IniciarVistoria";

import PreencherVistoria from "./PreencherVistoria";

import UnidadeVistoria from "./UnidadeVistoria";

import RelatorioVistoriaObras from "./RelatorioVistoriaObras";

import GaleriaRelatorio from "./GaleriaRelatorio";

import Planejamento from "./Planejamento";

import AtividadesPadrao from "./AtividadesPadrao";

import NovoDiarioObra from "./NovoDiarioObra";

import VisualizarDiarioObra from "./VisualizarDiarioObra";

import EditarDiarioObra from "./EditarDiarioObra";

import EmpreendimentoDiariosObra from "./EmpreendimentoDiariosObra";

import EmpreendimentoAmostras from "./EmpreendimentoAmostras";

import NovaAprovacaoAmostra from "./NovaAprovacaoAmostra";

import EditarAprovacaoAmostra from "./EditarAprovacaoAmostra";

import VisualizarAprovacaoAmostra from "./VisualizarAprovacaoAmostra";

import EmpreendimentoVistoriasTerminalidade from "./EmpreendimentoVistoriasTerminalidade";

import NovaVistoriaTerminalidade from "./NovaVistoriaTerminalidade";

import VisualizarVistoriaTerminalidade from "./VisualizarVistoriaTerminalidade";

import EditarVistoriaTerminalidade from "./EditarVistoriaTerminalidade";

import GaleriaVistoriaTerminalidade from "./GaleriaVistoriaTerminalidade";

import EmpreendimentoRelatoriosSemanais from "./EmpreendimentoRelatoriosSemanais";

import NovoRelatorioSemanal from "./NovoRelatorioSemanal";

import EmpreendimentoPrimeirosServicos from "./EmpreendimentoPrimeirosServicos";

import NovoRelatorioPrimeirosServicos from "./NovoRelatorioPrimeirosServicos";

import EditarRelatorioPrimeirosServicos from "./EditarRelatorioPrimeirosServicos";

import VisualizarRelatorioPrimeirosServicos from "./VisualizarRelatorioPrimeirosServicos";

import EditarRelatorioSemanal from "./EditarRelatorioSemanal";

import VisualizarRelatorioSemanal from "./VisualizarRelatorioSemanal";

import AtualizarFormularioEmMassa from "./AtualizarFormularioEmMassa";

import EmpreendimentoInspecaoHidrantes from "./EmpreendimentoInspecaoHidrantes";

import NovaInspecaoHidrantes from "./NovaInspecaoHidrantes";

import EditarInspecaoHidrantes from "./EditarInspecaoHidrantes";

import VisualizarInspecaoHidrantes from "./VisualizarInspecaoHidrantes";

import EmpreendimentoInspecaoSprinklers from "./EmpreendimentoInspecaoSprinklers";

import NovaInspecaoSprinklers from "./NovaInspecaoSprinklers";

import EditarInspecaoSprinklers from "./EditarInspecaoSprinklers";

import VisualizarInspecaoSprinklers from "./VisualizarInspecaoSprinklers";

import EmpreendimentoInspecaoAlarme from "./EmpreendimentoInspecaoAlarme";

import NovaInspecaoAlarme from "./NovaInspecaoAlarme";

import EditarInspecaoAlarme from "./EditarInspecaoAlarme";

import VisualizarInspecaoAlarme from "./VisualizarInspecaoAlarme";

import NovaInspecaoArCondicionado from "./NovaInspecaoArCondicionado";

import EditarInspecaoArCondicionado from "./EditarInspecaoArCondicionado";

import VisualizarInspecaoArCondicionado from "./VisualizarInspecaoArCondicionado";

import EmpreendimentoInspecaoArCondicionado from "./EmpreendimentoInspecaoArCondicionado";

import EmpreendimentoInspecaoControleAcesso from "./EmpreendimentoInspecaoControleAcesso";

import NovaInspecaoControleAcesso from "./NovaInspecaoControleAcesso";

import VisualizarInspecaoControleAcesso from "./VisualizarInspecaoControleAcesso";

import EditarInspecaoControleAcesso from "./EditarInspecaoControleAcesso";

import NovaInspecaoCFTV from "./NovaInspecaoCFTV";

import EditarInspecaoCFTV from "./EditarInspecaoCFTV";

import EmpreendimentoInspecaoCFTV from "./EmpreendimentoInspecaoCFTV";

import VisualizarInspecaoCFTV from "./VisualizarInspecaoCFTV";

import EmpreendimentoInspecaoSDAI from "./EmpreendimentoInspecaoSDAI";

import NovaInspecaoSDAI from "./NovaInspecaoSDAI";

import EditarInspecaoSDAI from "./EditarInspecaoSDAI";

import VisualizarInspecaoSDAI from "./VisualizarInspecaoSDAI";

import DashboardCliente from "./DashboardCliente";

import RelatoriosCliente from "./RelatoriosCliente";

import NovaInspecaoEletrica from "./NovaInspecaoEletrica";

import EditarInspecaoEletrica from "./EditarInspecaoEletrica";

import EmpreendimentoInspecaoEletrica from "./EmpreendimentoInspecaoEletrica";

import VisualizarInspecaoEletrica from "./VisualizarInspecaoEletrica";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import Login from "./Login.jsx";
import Register from "./Register.jsx";

const PAGES = {

    Dashboard: Dashboard,

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

    NovaVistoriaTerminalidade: NovaVistoriaTerminalidade,

    VisualizarVistoriaTerminalidade: VisualizarVistoriaTerminalidade,

    EditarVistoriaTerminalidade: EditarVistoriaTerminalidade,

    GaleriaVistoriaTerminalidade: GaleriaVistoriaTerminalidade,

    EmpreendimentoRelatoriosSemanais: EmpreendimentoRelatoriosSemanais,

    NovoRelatorioSemanal: NovoRelatorioSemanal,

    EmpreendimentoPrimeirosServicos: EmpreendimentoPrimeirosServicos,

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
            <Routes>

                <Route path="/" element={hasToken() ? <Dashboard /> : <Login />} />
                {/* Garantir variação minúscula com guarda */}
                <Route path="/dashboard" element={hasToken() ? <Dashboard /> : <Login />} />


                <Route path="/Dashboard" element={hasToken() ? <Dashboard /> : <Login />} />

                <Route path="/Empreendimentos" element={hasToken() ? <Empreendimentos /> : <Login />} />
                <Route path="/empreendimentos" element={hasToken() ? <Empreendimentos /> : <Login />} />
                <Route path="/Login" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/Register" element={<Register />} />
                <Route path="/register" element={<Register />} />
                {/* Catch-all: exige login para qualquer rota */}
                <Route path="*" element={hasToken() ? <Dashboard /> : <Login />} />

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

                <Route path="/NovaInspecaoHidrantes" element={<NovaInspecaoHidrantes />} />

                <Route path="/EditarInspecaoHidrantes" element={<EditarInspecaoHidrantes />} />

                <Route path="/VisualizarInspecaoHidrantes" element={<VisualizarInspecaoHidrantes />} />

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

            </Routes>
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