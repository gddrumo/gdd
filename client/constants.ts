
import { Area, Person, Demand, DemandStatus, DemandType, Complexity, Category, SLAConfig } from './types';

// Rumo Brand Palette
export const BRAND_COLORS = {
  BLUE: '#003A70', // Official Rumo Blue
  GREEN: '#32A6E6', // Updated to new Blue/Cyan for light backgrounds
  TEAL: '#00A99D',
  ORANGE: '#F58220',
  GRAY: '#666666'
};

export const MOCK_AREAS: Area[] = [
  { id: 'a1', name: 'Tecnologia', description: 'Desenvolvimento e Infraestrutura' },
  { id: 'a2', name: 'Marketing', description: 'Growth e Branding' },
  { id: 'a3', name: 'Operações', description: 'Logística e Atendimento' },
  { id: 'a4', name: 'Financeiro', description: 'Controladoria e FP&A' },
  { id: 'a5', name: 'Jurídico', description: 'Contratos e Compliance' },
  { id: 'req1', name: 'Recursos Humanos', description: 'RH e Depto Pessoal' },
  { id: 'req2', name: 'Diretoria Executiva', description: 'C-Level' }
];

export const MOCK_PEOPLE: Person[] = [
  { id: 'p1', name: 'Ana Silva', role: 'Tech Lead', coordinationId: 'a1', email: 'ana@gdd.com' },
  { id: 'p2', name: 'Carlos Souza', role: 'Dev Senior', coordinationId: 'a1', email: 'carlos@gdd.com' },
  { id: 'p3', name: 'Beatriz Lima', role: 'Marketing Manager', coordinationId: 'a2', email: 'bia@gdd.com' },
  { id: 'p4', name: 'João Santos', role: 'Analista Ops', coordinationId: 'a3', email: 'joao@gdd.com' },
  { id: 'p5', name: 'Fernanda Costa', role: 'Designer', coordinationId: 'a2', email: 'fer@gdd.com' },
  { id: 'p6', name: 'Ricardo Oliveira', role: 'DBA', coordinationId: 'a1', email: 'ricardo@gdd.com' },
  { id: 'p7', name: 'Mariana Dias', role: 'Advogada', coordinationId: 'a5', email: 'mariana@gdd.com' },
  { id: 'p8', name: 'Paulo Mendes', role: 'Analista Fin', coordinationId: 'a4', email: 'paulo@gdd.com' },
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Infraestrutura' },
  { id: 'c2', name: 'Desenvolvimento' },
  { id: 'c3', name: 'Design' },
  { id: 'c4', name: 'Processos' },
  { id: 'c5', name: 'Gestão' },
  { id: 'c6', name: 'Jurídico' },
  { id: 'c7', name: 'Compliance' },
  { id: 'c8', name: 'Geral' }
];

export const MOCK_SLAS: SLAConfig[] = [
  // Dev SLAs
  { id: 's1', categoryId: 'c2', complexity: Complexity.LOW, slaHours: 16 },
  { id: 's2', categoryId: 'c2', complexity: Complexity.MEDIUM, slaHours: 40 },
  { id: 's3', categoryId: 'c2', complexity: Complexity.HIGH, slaHours: 120 },
  // Infra SLAs
  { id: 's4', categoryId: 'c1', complexity: Complexity.LOW, slaHours: 8 },
  { id: 's5', categoryId: 'c1', complexity: Complexity.HIGH, slaHours: 48 },
];

// --- GENERATOR FOR 2025 DEMANDS ---
export const generateMockDemands = (): Demand[] => {
  const demands: Demand[] = [];
  const statuses = Object.values(DemandStatus);
  const complexities = Object.values(Complexity);
  
  const titles = [
    "Otimização de Query no Banco", "Dashboard de Vendas Q1", "Integração API Logística",
    "Revisão Contrato Fornecedor X", "Campanha Instagram Verão", "Automatização Folha Pagamento",
    "Migração Servidor AWS", "App Mobile Motoristas", "Relatório Sustentabilidade",
    "Onboarding Novos Funcionários", "Treinamento Compliance", "Refatoração Código Legacy",
    "Backup Disaster Recovery", "Layout Novo Site Institucional", "KPIs Operacionais em Tempo Real"
  ];

  // Generate 100 items
  for (let i = 0; i < 100; i++) {
    const isSystem = Math.random() > 0.6; // 40% Systems
    const type = isSystem ? DemandType.SYSTEM : DemandType.TASK;
    const complexity = complexities[Math.floor(Math.random() * complexities.length)];
    const effort = complexity === Complexity.LOW ? 8 : (complexity === Complexity.MEDIUM ? 40 : 120);
    
    // Random Date in 2025
    const month = Math.floor(Math.random() * 12);
    const day = Math.floor(Math.random() * 28) + 1;
    const createdAt = new Date(2025, month, day, 9, 0, 0);
    
    // Determine Status based on Date relative to "Now" (simulated mid-year 2025 or dynamic)
    let status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // Logic to make data consistent
    let startedAt: string | undefined;
    let finishedAt: string | undefined;
    let agreedDeadline: string | undefined;
    let deliverySummary: string | undefined;
    let cancellationReason: string | undefined;
    
    // Create agreed deadline (Created + random buffer)
    const deadlineDate = new Date(createdAt);
    deadlineDate.setDate(deadlineDate.getDate() + (effort / 8) + 5); // Effort days + 5 days buffer
    agreedDeadline = deadlineDate.toISOString().split('T')[0];

    if (status === DemandStatus.EXECUCAO || status === DemandStatus.VALIDACAO || status === DemandStatus.CONCLUIDO) {
        const startDate = new Date(createdAt);
        startDate.setDate(startDate.getDate() + 2); // Started 2 days after creation
        startedAt = startDate.toISOString();
    }

    if (status === DemandStatus.CONCLUIDO) {
        const endDate = new Date(startedAt!);
        // Randomize if late or on time
        const isLate = Math.random() > 0.7;
        const duration = isLate ? (effort / 8) * 1.5 : (effort / 8) * 0.9;
        endDate.setDate(endDate.getDate() + duration);
        finishedAt = endDate.toISOString();
        deliverySummary = "Entrega realizada conforme especificação. Resultados validados pela área solicitante.";
    }

    if (status === DemandStatus.CANCELADO) {
        cancellationReason = "Cancelado devido à mudança de prioridades estratégicas e redefinição de escopo pela diretoria.";
    }

    const person = MOCK_PEOPLE[Math.floor(Math.random() * MOCK_PEOPLE.length)];
    const requesterArea = MOCK_AREAS.filter(a => a.id.startsWith('req'))[Math.floor(Math.random() * 2)];

    demands.push({
      id: `mock-2025-${i + 1}`,
      title: titles[Math.floor(Math.random() * titles.length)] + ` ${i + 1}`,
      description: "Descrição gerada automaticamente para fins de teste de volume e performance do dashboard.",
      personId: person.id,
      areaId: person.coordinationId,
      requesterName: "Usuário Teste",
      requesterAreaId: requesterArea ? requesterArea.id : 'req1',
      category: MOCK_CATEGORIES[Math.floor(Math.random() * MOCK_CATEGORIES.length)].name,
      type,
      status,
      complexity,
      effort: Math.floor(effort * (0.8 + Math.random() * 0.4)), // vary effort slightly
      agreedDeadline,
      createdAt: createdAt.toISOString(),
      startedAt,
      finishedAt,
      deliverySummary,
      cancellationReason,
      isPriority: Math.random() > 0.8,
      logs: [],
      history: [{ timestamp: createdAt.toISOString(), action: 'Criação', details: 'Mock Data Generator', user: 'System' }]
    });
  }

  return demands.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
