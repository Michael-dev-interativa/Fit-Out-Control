# API RDO (Relatório Diário de Obra)

## Descrição
Entidade para gerenciar Relatórios Diários de Obra (RDO) associados a empreendimentos.

## Endpoints

### 1. Listar RDOs
```
GET /api/rdos
GET /api/rdos?id_empreendimento=123
GET /api/rdos?order=-data_relatorio
```

**Resposta:**
```json
[
  {
    "id": 1,
    "id_empreendimento": 123,
    "tipo_documento": "RDO",
    "numero_relatorio": "RDO-001",
    "data_relatorio": "2026-02-03",
    "dia_semana": "Segunda-feira",
    "obra_nome": "Edifício Comercial XYZ",
    "obra_local": "São Paulo, SP",
    "contratada": "Construtora ABC",
    "responsavel": "João Silva",
    "contrato": "CONT-2025-001",
    "prazo_contratual": "365 dias",
    "prazo_decorrido": "45 dias",
    "prazo_vencer": "320 dias",
    "condicao_climatica": [
      { "periodo": "Manhã", "condicao": "Ensolarado" },
      { "periodo": "Tarde", "condicao": "Parcialmente nublado" }
    ],
    "equipes_campo": [
      { "equipe": "Alvenaria", "qtd_funcionarios": 8 },
      { "equipe": "Elétrica", "qtd_funcionarios": 4 }
    ],
    "atividades_realizadas": [
      {
        "descricao": "Execução de alvenaria do 3º pavimento",
        "local": "Pavimento 3",
        "responsavel": "Carlos Santos"
      }
    ],
    "ocorrencias": [
      {
        "tipo": "Observação",
        "descricao": "Aguardando entrega de material elétrico",
        "criticidade": "Baixa"
      }
    ],
    "fotos": [
      { "url": "/uploads/foto1.jpg", "descricao": "Vista frontal da obra" },
      { "url": "/uploads/foto2.jpg", "descricao": "Detalhe da alvenaria" }
    ],
    "assinaturas": {
      "responsavel_obra": "data:image/png;base64,...",
      "fiscal": "data:image/png;base64,..."
    },
    "observacoes": "Clima favorável para execução dos serviços",
    "status_documento": "Aprovado",
    "created_at": "2026-02-03T10:00:00Z",
    "updated_at": "2026-02-03T10:00:00Z"
  }
]
```

### 2. Buscar RDO por ID
```
GET /api/rdos/:id
```

**Resposta:** Objeto RDO único

### 3. Criar RDO
```
POST /api/rdos
Content-Type: application/json

{
  "id_empreendimento": 123,
  "tipo_documento": "RDO",
  "numero_relatorio": "RDO-001",
  "data_relatorio": "2026-02-03",
  "dia_semana": "Segunda-feira",
  "obra_nome": "Edifício Comercial XYZ",
  "obra_local": "São Paulo, SP",
  "contratada": "Construtora ABC",
  "responsavel": "João Silva",
  "contrato": "CONT-2025-001",
  "prazo_contratual": "365 dias",
  "prazo_decorrido": "45 dias",
  "prazo_vencer": "320 dias",
  "condicao_climatica": [
    { "periodo": "Manhã", "condicao": "Ensolarado" }
  ],
  "equipes_campo": [
    { "equipe": "Alvenaria", "qtd_funcionarios": 8 }
  ],
  "atividades_realizadas": [
    { "descricao": "Execução de alvenaria", "local": "Pavimento 3" }
  ],
  "ocorrencias": [],
  "fotos": [],
  "assinaturas": {},
  "observacoes": "Clima favorável",
  "status_documento": "Rascunho"
}
```

### 4. Atualizar RDO
```
PUT /api/rdos/:id
Content-Type: application/json

{
  "status_documento": "Aprovado",
  "observacoes": "Documento revisado e aprovado"
}
```

### 5. Deletar RDO
```
DELETE /api/rdos/:id
```

## Uso no Frontend

```javascript
import { RDO } from '@/api/entities';

// Listar RDOs de um empreendimento
const rdos = await RDO.filter({ id_empreendimento: 123 }, '-data_relatorio');

// Buscar RDO específico
const rdo = await RDO.get(1);

// Criar novo RDO
const novoRDO = await RDO.create({
  id_empreendimento: 123,
  tipo_documento: 'RDO',
  numero_relatorio: 'RDO-001',
  data_relatorio: '2026-02-03',
  // ... outros campos
});

// Atualizar RDO
const atualizado = await RDO.update(1, {
  status_documento: 'Aprovado'
});

// Deletar RDO
await RDO.delete(1);
```

## Campos JSONB

### condicao_climatica
Array de objetos com informações climáticas:
```json
[
  { "periodo": "Manhã", "condicao": "Ensolarado", "temperatura": "25°C" },
  { "periodo": "Tarde", "condicao": "Chuvoso", "temperatura": "22°C" }
]
```

### equipes_campo
Array de objetos com equipes presentes:
```json
[
  { "equipe": "Alvenaria", "qtd_funcionarios": 8, "empresa": "Construtora ABC" },
  { "equipe": "Elétrica", "qtd_funcionarios": 4, "empresa": "Elétrica XYZ" }
]
```

### atividades_realizadas
Array de objetos com atividades executadas:
```json
[
  {
    "descricao": "Execução de alvenaria",
    "local": "Pavimento 3",
    "responsavel": "Carlos Santos",
    "horas": 8,
    "percentual_concluido": 75
  }
]
```

### ocorrencias
Array de objetos com ocorrências:
```json
[
  {
    "tipo": "Problema",
    "descricao": "Falta de material",
    "criticidade": "Alta",
    "responsavel": "João Silva",
    "prazo_solucao": "2026-02-04"
  }
]
```

### fotos
Array de objetos com fotos:
```json
[
  {
    "url": "/uploads/foto1.jpg",
    "descricao": "Vista frontal",
    "timestamp": "2026-02-03T10:30:00Z"
  }
]
```

### assinaturas
Objeto com assinaturas digitais (base64):
```json
{
  "responsavel_obra": "data:image/png;base64,...",
  "fiscal": "data:image/png;base64,...",
  "engenheiro": "data:image/png;base64,..."
}
```
