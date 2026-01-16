
import React, { useMemo } from 'react';
import { Demand, DemandStatus, Area, DemandType } from '../types';
import { Clock, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight, BookOpen } from 'lucide-react';

interface StorytellingProps {
  demands: Demand[];
  areas: Area[];
}

const Storytelling: React.FC<StorytellingProps> = ({ demands, areas }) => {
  
  // --- narrative generation logic ---
  const story = useMemo(() => {
    const total = demands.length;
    const completed = demands.filter(d => d.status === DemandStatus.CONCLUIDO);
    const inProgress = demands.filter(d => d.status === DemandStatus.EXECUCAO);
    const queue = demands.filter(d => d.status === DemandStatus.FILA || d.status === DemandStatus.ENTRADA);
    
    // Calculate avg lead time
    const leadTimes = completed
      .filter(d => d.finishedAt && d.createdAt)
      .map(d => new Date(d.finishedAt!).getTime() - new Date(d.createdAt).getTime());
    const avgLeadTime = leadTimes.length > 0 
      ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length / (1000 * 60 * 60 * 24)) 
      : 0;

    // Bottleneck detection (Area with most items in Queue)
    const bottleneckMap: Record<string, number> = {};
    queue.forEach(d => {
        bottleneckMap[d.areaId] = (bottleneckMap[d.areaId] || 0) + 1;
    });
    const bottleneckAreaId = Object.keys(bottleneckMap).sort((a, b) => bottleneckMap[b] - bottleneckMap[a])[0];
    const bottleneckAreaName = areas.find(a => a.id === bottleneckAreaId)?.name || 'N/A';

    // Recent Wins
    const recentWins = [...completed].sort((a, b) => new Date(b.finishedAt!).getTime() - new Date(a.finishedAt!).getTime()).slice(0, 3);

    return {
      total,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      queueCount: queue.length,
      avgLeadTime,
      bottleneckAreaName,
      bottleneckCount: bottleneckMap[bottleneckAreaId] || 0,
      recentWins,
      efficiencyRate: total > 0 ? Math.round((completed.length / total) * 100) : 0
    };
  }, [demands, areas]);

  return (
    <div className="space-y-10 animate-fade-in max-w-5xl mx-auto pb-12">
      
      {/* Header Narrative */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#003A70]/10 to-transparent rounded-bl-full" />
        <div className="flex items-start gap-4 relative z-10">
           <div className="bg-[#003A70] text-white p-3 rounded-xl shadow-lg">
              <BookOpen size={28} />
           </div>
           <div className="flex-1">
              <h2 className="text-3xl font-bold text-[#003A70] mb-3">A História do Processo</h2>
              <div className="text-gray-600 text-lg leading-relaxed space-y-4">
                 <p>
                    Atualmente, nosso ecossistema de demandas opera com um volume total de <strong className="text-gray-900">{story.total} itens</strong>. 
                 </p>
                 <p>
                    A equipe demonstrou consistência entregando <strong className="text-gray-900">{story.completedCount} demandas</strong>, mantendo uma taxa de vazão global de <span className="text-[#32A6E6] font-bold">{story.efficiencyRate}%</span>.
                    O tempo médio para transformar uma ideia em entrega está girando em torno de <strong className="text-gray-900">{story.avgLeadTime} dias</strong>.
                 </p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          
          {/* Column 1: The Flow (Past & Present) */}
          <div className="space-y-4 flex flex-col">
              <div className="flex items-center gap-3 mb-2 shrink-0 px-2">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
                      <TrendingUp size={16} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">Fluxo Atual</h3>
              </div>
              
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm relative flex-1 hover:shadow-md transition-shadow">
                  <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gray-100"></div>
                  
                  <div className="relative pl-8 pb-8">
                      <div className="absolute left-[-5px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                      <h4 className="text-sm font-bold text-gray-800">Entregas Realizadas</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                          {story.completedCount} itens completaram o ciclo com sucesso.
                      </p>
                  </div>

                  <div className="relative pl-8 pb-8">
                      <div className="absolute left-[-5px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white animate-pulse shadow-sm"></div>
                      <h4 className="text-sm font-bold text-gray-800">Em Construção (WIP)</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                          O time está focado em <span className="font-semibold text-blue-600">{story.inProgressCount} demandas</span> complexas neste momento.
                      </p>
                  </div>

                  <div className="relative pl-8">
                      <div className="absolute left-[-5px] top-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-sm"></div>
                      <h4 className="text-sm font-bold text-gray-800">Fila de Espera</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                          Existem {story.queueCount} itens aguardando priorização ou recurso disponível.
                      </p>
                  </div>
              </div>
          </div>

          {/* Column 2: The Obstacle (Bottleneck) */}
          <div className="space-y-4 flex flex-col">
             <div className="flex items-center gap-3 mb-2 shrink-0 px-2">
                  <div className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center">
                      <AlertTriangle size={16} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">Ponto de Atenção</h3>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm h-full flex flex-col items-center text-center hover:shadow-md transition-shadow">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 shrink-0">Maior Acúmulo Identificado</h4>
                  
                  <div className="flex flex-col items-center justify-center flex-1 w-full">
                      <div className="w-24 h-24 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4 font-bold text-3xl border-4 border-amber-100 shadow-inner">
                          {story.bottleneckCount}
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 break-words w-full px-4">Coord. {story.bottleneckAreaName}</h3>
                      <p className="text-sm text-gray-500 mt-3 px-4 leading-relaxed">
                          Esta é a área com o maior volume de demandas represadas nas etapas iniciais.
                      </p>
                  </div>
                  
                  <div className="mt-8 w-full bg-amber-50 p-4 rounded-xl text-xs text-amber-800 leading-relaxed border border-amber-100 shrink-0">
                      <strong>Recomendação:</strong> Avaliar se as demandas desta área estão chegando com especificações claras ou se é necessário alocar um recurso temporário.
                  </div>
              </div>
          </div>

          {/* Column 3: The Victory (Recent Wins) */}
          <div className="space-y-4 flex flex-col">
             <div className="flex items-center gap-3 mb-2 shrink-0 px-2">
                  <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={16} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">Últimas Conquistas</h3>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm h-full flex flex-col hover:shadow-md transition-shadow">
                  <div className="space-y-6 flex-1">
                      {story.recentWins.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center">
                             <Clock size={32} className="text-gray-200 mb-2" />
                             <p className="text-sm text-gray-400 italic">Nenhuma entrega recente registrada.</p>
                          </div>
                      ) : (
                          story.recentWins.map(win => (
                              <div key={win.id} className="flex gap-4 items-start group">
                                  <div className="mt-1.5 min-w-[4px] h-10 bg-green-200 rounded-full group-hover:bg-green-500 transition-colors"></div>
                                  <div className="overflow-hidden">
                                      <h5 className="text-sm font-bold text-gray-800 leading-snug group-hover:text-green-700 transition-colors mb-1">{win.title}</h5>
                                      <div className="flex items-center gap-2">
                                          <span className="text-[10px] uppercase font-bold tracking-wider bg-gray-50 border border-gray-100 px-2 py-0.5 rounded text-gray-500 shrink-0">{win.category}</span>
                                          <span className="text-[10px] text-gray-400 shrink-0">{new Date(win.finishedAt!).toLocaleDateString('pt-BR')}</span>
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>

      </div>

      {/* Footer Timeline/Forecast */}
      <div className="bg-[#003A70] rounded-2xl p-8 text-white shadow-xl mt-12 relative z-20 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="relative z-10">
              <h3 className="font-bold text-xl flex items-center gap-3 mb-2">
                  <Clock size={24} className="text-[#32A6E6]" />
                  Previsão de Capacidade
              </h3>
              <p className="text-sm text-blue-100/80 max-w-xl leading-relaxed">
                  Baseado no Lead Time atual de <strong className="text-white">{story.avgLeadTime} dias</strong>, novas demandas que entrarem hoje 
                  têm uma estimativa de conclusão para <strong className="text-[#32A6E6]">{new Date(Date.now() + story.avgLeadTime * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</strong>.
              </p>
          </div>
          <div className="flex items-center gap-8 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10 relative z-10">
              <div className="text-right">
                  <div className="text-3xl font-bold tracking-tight">{story.inProgressCount}</div>
                  <div className="text-[10px] opacity-70 uppercase font-bold tracking-wider text-blue-200">Em Andamento</div>
              </div>
              <ArrowRight className="text-[#32A6E6] opacity-80" size={24} />
              <div>
                  <div className="text-3xl font-bold tracking-tight">{story.avgLeadTime}d</div>
                  <div className="text-[10px] opacity-70 uppercase font-bold tracking-wider text-blue-200">Ciclo Médio</div>
              </div>
          </div>
      </div>

    </div>
  );
};

export default Storytelling;
