
export enum DemandStatus {
  ENTRADA = 'Fila de Avaliação',
  QUALIFICACAO = 'Qualificação',
  FILA = 'Fila',
  EXECUCAO = 'Execução',
  VALIDACAO = 'Validação',
  CONCLUIDO = 'Concluído',
  CANCELADO = 'Cancelado' // Arquivado
}

export enum DemandType {
  SYSTEM = 'Sistema',
  TASK = 'Tarefa'
}

export enum Complexity {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta'
}

export interface Area {
  id: string;
  name: string;
  description: string;
}

export interface Coordination {
  id: string;
  name: string;
  description: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  coordinationId: string; // FK → coordinations (Coordenação Técnica)
  email: string;
}

// Role Based Access Control
export type UserRole = 'GESTAO' | 'TIME';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface SLAConfig {
  id: string;
  categoryId: string;
  complexity: Complexity;
  slaHours: number; // Target hours to complete
}

export interface WorkflowLog {
  from: DemandStatus;
  to: DemandStatus;
  timestamp: string;
}

export interface HistoryLog {
  timestamp: string;
  action: 'Criação' | 'Edição' | 'Cancelamento' | 'Conclusão' | 'Priorização' | 'Restauração' | 'Exclusão';
  details: string; // Ex: "Alterou Título de X para Y"
  user: string; // Mocked user
}

// Structure prepared for SQL Table: Demands
export interface Demand {
  id: string; // Primary Key (UUID or String)
  title: string; // VARCHAR
  description: string; // TEXT
  personId: string; // Foreign Key -> People.id
  areaId: string; // Foreign Key -> Coordinations.id (Technical Coordination)
  requesterName: string; // VARCHAR
  requesterAreaId: string; // Foreign Key -> Areas.id (Requester Area)
  category: string; // VARCHAR or FK
  type: DemandType; // ENUM
  status: DemandStatus; // ENUM
  complexity: Complexity; // ENUM
  effort: number; // INT (Hours)
  agreedDeadline?: string; // DATE or TIMESTAMP
  createdAt: string; // TIMESTAMP
  startedAt?: string; // TIMESTAMP
  finishedAt?: string; // TIMESTAMP
  cancellationReason?: string; // TEXT
  delayJustification?: string; // TEXT
  deliverySummary?: string; // TEXT - New Field
  isPriority?: boolean; // New Field
  logs: WorkflowLog[]; // JSONB or Separate Table
  history: HistoryLog[]; // JSONB or Separate Table
  statusTimestamps?: Partial<Record<DemandStatus, string>>; // JSONB
}

export interface FilterState {
  areaId: string | 'all';
  requesterAreaId: string | 'all';
  personId: string | 'all';
  status: DemandStatus | 'all';
  type: DemandType | 'all';
}
