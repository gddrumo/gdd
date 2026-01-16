import { GoogleGenAI } from "@google/genai";
import { Demand, Area, Person, DemandStatus, DemandType, Complexity } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateDashboardInsights = async (
  demands: Demand[],
  areas: Area[],
  people: Person[]
): Promise<string> => {
  if (!apiKey) return "Configuração de API Key ausente. Não é possível gerar insights.";

  // Calculate process metrics for AI context
  const completed = demands.filter(d => d.status === DemandStatus.CONCLUIDO);
  const systemDemands = completed.filter(d => d.type === DemandType.SYSTEM);
  const taskDemands = completed.filter(d => d.type === DemandType.TASK);

  const calcAvg = (items: Demand[]) => {
    if (!items.length) return 0;
    const sum = items.reduce((acc, d) => {
        const start = new Date(d.createdAt).getTime();
        const end = d.finishedAt ? new Date(d.finishedAt).getTime() : Date.now();
        return acc + (end - start);
    }, 0);
    return Math.round(sum / items.length / (1000 * 60 * 60 * 24));
  };

  const summary = {
    totalDemands: demands.length,
    wipCount: demands.filter(d => d.status === DemandStatus.EXECUCAO || d.status === DemandStatus.VALIDACAO).length,
    queueCount: demands.filter(d => d.status === DemandStatus.FILA).length,
    efficiency: {
        systemLeadTimeDays: calcAvg(systemDemands),
        taskLeadTimeDays: calcAvg(taskDemands),
    },
    throughputByMonth: completed.reduce((acc, curr) => {
        if (!curr.finishedAt) return acc;
        const key = curr.finishedAt.substring(0, 7); // YYYY-MM
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)
  };

  const prompt = `
    Atue como um Especialista em Processos Operacionais analisando o painel 'Gestor de Demandas v2.0'.
    
    Dados de fluxo atuais:
    ${JSON.stringify(summary, null, 2)}

    Por favor, forneça uma análise executiva (máximo 3 parágrafos curtos) em Português do Brasil, focando em:
    1. Equilíbrio entre Sistemas (estruturante) e Tarefas (rotina). O Lead Time faz sentido para a complexidade de cada um?
    2. Estabilidade do fluxo (Queue vs WIP).
    3. Tendência de entregas (Throughput mensal) - estamos melhorando ou piorando?

    Use formatação Markdown simples. Seja direto e técnico.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao conectar com a IA para análise.";
  }
};

export const classifyDemand = async (title: string, description: string): Promise<{
  type: DemandType;
  complexity: Complexity;
  effort: number;
  reasoning: string;
} | null> => {
  if (!apiKey) return null;

  const prompt = `
    Analise a seguinte demanda de trabalho e sugira classificação técnica.
    Título: "${title}"
    Descrição: "${description}"

    Responda EXCLUSIVAMENTE um JSON com a seguinte estrutura (sem markdown):
    {
      "type": "Sistema" ou "Tarefa",
      "complexity": "Alta", "Média" ou "Baixa",
      "effort": <numero_inteiro_horas_estimadas>,
      "reasoning": "<curta_explicacao>"
    }

    Regras:
    - "Sistema": Projetos estruturantes, novas ferramentas, dashboards complexos, governança.
    - "Tarefa": Rotinas, ajustes simples, relatórios recorrentes, dúvidas.
    - Esforço: Baixa (4-16h), Média (24-60h), Alta (80h+).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Classify Error:", error);
    return null;
  }
};

export const processVoiceDemand = async (base64Audio: string): Promise<{ title: string, description: string } | null> => {
  if (!apiKey) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/webm', 
              data: base64Audio
            }
          },
          {
            text: `Transcreva este áudio e extraia as informações para criar uma demanda de projeto.
                   Responda EXCLUSIVAMENTE um JSON com:
                   {
                     "title": "Um título curto e claro resumindo o pedido",
                     "description": "A transcrição completa ou resumo detalhado do que foi pedido"
                   }`
          }
        ]
      },
      config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Voice Error:", error);
    return null;
  }
};