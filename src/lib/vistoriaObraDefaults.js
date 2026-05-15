export const OP = [
  { texto: 'Finalizado', cor: 'green' },
  { texto: 'Em andamento', cor: 'blue' },
  { texto: 'Pendente', cor: 'red' },
  { texto: 'Não se Aplica', cor: 'yellow' },
  { texto: 'Informativo', cor: 'purple' },
];

export const OP_LAUDOS = [
  { texto: 'Conforme', cor: 'green' },
  { texto: 'Não Conforme', cor: 'red' },
  { texto: 'Pendente', cor: 'red' },
  { texto: 'Não se Aplica', cor: 'yellow' },
  { texto: 'Informativo', cor: 'purple' },
];

const q = (pergunta, tipo = 'select_with_photo', opcoes = OP) => ({ pergunta, tipo, opcoes, resposta: '', observacao: '', foto: null });
const ql = (pergunta) => q(pergunta, 'select', OP_LAUDOS);

export const DEFAULT_SECOES = [
  {
    nome_secao: 'ARQUITETURA',
    perguntas: [
      q('Validação do layout proposto - Divisórias, conforme projeto aprovado'),
      q('Validação do layout proposto - Piso, conforme projeto aprovado'),
      q('Validação do layout proposto - Forro, conforme projeto aprovado'),
      q('Validação dos elementos de fachada, conforme projeto aprovado'),
      q('Validação das readequações nas áreas comuns - Hall dos elevadores ou corredores ou escadas de emergência'),
      q('Validação das readequações nas áreas comuns - Área externa ou subsolos ou coberturas'),
      q('Validação das instalações nas áreas comuns - Áreas técnicas do condomínio para certificar alterações'),
      q('Validação das proteções das áreas comuns'),
      q('Verificação das paredes divisórias entre conjuntos para certificar que não foram passadas instalações ou realizadas furações'),
      q('Validação das intervenções estruturais em lajes e vigas, quando aplicável, conforme projeto aprovado'),
      q('Validação de reforços estruturais, quando aplicável, conforme projeto aprovado'),
      q('Validação de proteção passiva, quando aplicável'),
      q('Validação da impermeabilização das áreas molhadas'),
      q('Verificação possíveis infiltrações no ambiente diretamente abaixo das áreas impermeabilizadas, junto ao condomínio'),
    ],
  },
  {
    nome_secao: 'INSTALAÇÕES ELÉTRICAS E SISTEMAS ELETRÔNICOS',
    perguntas: [
      q('Verificação do quadro elétrico de alimentação do condomínio, para certificar alterações, quando aprovado em projeto'),
      q('Validação dos quadros elétricos dos conjuntos, conforme projeto aprovado'),
      q('Validação do caminhamento das infras estruturas (elétrica e de sistemas), conforme projeto aprovado'),
      q('Verificação do aterramento do piso elevado e conexão com quadro elétrico (Atentar-se se não foi aterrado junto à fachada)'),
      q('Validação das portas automáticas ou com controle de acesso, quando aplicável, conforme projeto aprovado'),
    ],
  },
  {
    nome_secao: 'INSTALAÇÕES HIDRÁULICAS',
    perguntas: [
      q('Validação do caminhamento das tubulações hidrossanitárias, caimentos e suas dimensões e posicionamento conforme projeto aprovado'),
      q('Validação das interligações dos equipamentos de captação com as redes de coleta de efluentes dedicadas (Esgoto à Vácuo, Esgoto Gorduroso, Esgoto Comum, Dreno de Condensado)'),
      q('Validação da interligação das novas tubulações de água fria no Medidor, quando aplicável'),
      q('Validação dos dispositivos redutores de vazão nos novos pontos de água fria (máquina de café e filtros), quando aplicável'),
      q('Validação das instalações de Louças e metais sanitários, quando aplicável, conforme diretriz LEED e manual de obra'),
    ],
  },
  {
    nome_secao: 'INSTALAÇÕES DE COMBATE A INCÊNDIO, DETECÇÃO E ALARME',
    perguntas: [
      q('Validação do caminhamento da tubulação de sprinkler e suas dimensões e posicionamento (incluindo altura em áreas sem forro) dos bicos conforme projeto aprovado'),
      q('Validação do caminhamento dos hidrantes remanejados e/ou novos conforme projeto, quando aplicável, aprovado pelo consultor de bombeiro'),
      q('Validação de compartimentações de incêndio e detalhes conforme normas (1m para cada lado em fachadas) quando aplicável, aprovado pelo consultor de bombeiro'),
      q('Validação dos posicionamentos dos extintores conforme projeto aprovado'),
      q('Validação do posicionamento dos pontos de detectores fumaça conforme projeto aprovado'),
      q('Validação dos posicionamentos dos acionadores manuais conforme projeto aprovado'),
      q('Validação dos posicionamentos dos dispositivos áudio-visual (sonofletores) conforme projeto aprovado'),
      q('Validação dos posicionamentos das luminárias de emergência conforme projeto aprovado'),
      q('Validação dos posicionamentos das sinalizações de emergência conforme projeto aprovado'),
      q('Validação da instalação de hotline conforme projeto aprovado'),
      q('Validação do aumento das portas de rota de fuga, quando aplicável, aprovado pelo consultor de bombeiro'),
      q('Validação dos módulos de acionamentos para dispositivos de liberação em caso de incêndio: Extração de Fumaça, Portas de Acesso'),
    ],
  },
  {
    nome_secao: 'INSTALAÇÕES DE AR CONDICIONADO',
    perguntas: [
      q('Validação do caminhamento de dutos de ar condicionado e suas dimensões conforme projeto aprovado'),
      q('Verificação das instalações dos equipamentos de ar condicionado novos e/ou remanejados, conforme projeto aprovado'),
      q('Validação do caminhamento de dutos de exaustão e suas dimensões conforme projeto aprovado'),
      q('Validação do sistema de exaustão para copa ou cozinha, quando aplicável, conforme projeto aprovado'),
      q('Validação do caminhamento dos dutos do sistema de extração de fumaça, e suas dimensões conforme projeto aprovado'),
      q('Validação do material utilizado para isolamento dos dutos de extração de fumaça ou exaustão de gordura conforme projeto aprovado'),
      q('Validação do posicionamento das grelhas de extração de fumaça conforme projeto aprovado'),
      q('Validação do posicionamento das grelhas de insuflamento de ar limpo para o sistema de extração de fumaça conforme projeto aprovado'),
      q('Validação de alçapões para manutenções dos equipamentos, conforme orientação do condomínio'),
    ],
  },
  {
    nome_secao: 'LAUDOS',
    perguntas: [
      ql('Apresentação do laudo de impermeabilização'),
      ql('Apresentação da ART do laudo de impermeabilização'),
      ql('Apresentação do laudo de comissionamento dos detectores e equipamentos do SDAI'),
      ql('Apresentação da ART do laudo de comissionamento dos detectores e equipamentos do SDAI'),
      ql('Apresentação do laudo de pressurização dos sprinklers'),
      ql('Apresentação da ART do laudo de pressurização dos sprinklers'),
      ql('Apresentação do certificado de calibração do manômetro utilizado do teste de pressurização dos sprinklers'),
      ql('Apresentação do laudo de funcionamento e comissionamento dos sistemas de ar condicionado'),
      ql('Apresentação da ART do laudo de funcionamento e comissionamento dos sistemas de ar condicionado'),
      ql('Apresentação de relatório fotográfico das instalações em geral no entreforro'),
    ],
  },
  {
    nome_secao: 'PROJETOS AS BUILT',
    perguntas: [
      { pergunta: 'Apresentação dos projetos as builts', tipo: 'select', opcoes: [], resposta: '', observacao: '', foto: null },
    ],
  },
  {
    nome_secao: 'STATUS/VISTORIA DA OBRA',
    perguntas: [
      { pergunta: 'Status da Vistoria', tipo: 'select', opcoes: [{ texto: 'Liberado Para Ocupação', cor: 'green' }, { texto: 'Não Liberado para Ocupação', cor: 'red' }], resposta: '', observacao: '', foto: null },
    ],
  },
  {
    nome_secao: 'ASSINATURAS',
    perguntas: [
      { pergunta: 'Assinatura do consultor', tipo: 'signature', opcoes: [], resposta: '', observacao: '', foto: null },
      { pergunta: 'Assinatura do Locatário', tipo: 'signature', opcoes: [], resposta: '', observacao: '', foto: null },
      { pergunta: 'Assinatura do Condomínio', tipo: 'signature', opcoes: [], resposta: '', observacao: '', foto: null },
    ],
  },
];
