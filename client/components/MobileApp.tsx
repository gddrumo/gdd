
import React, { useMemo } from 'react';
import { Demand, Coordination, Person, DemandStatus } from '../types';
import { BarChart2, Plus, CheckCircle2, Activity, AlertCircle, Users, LayoutGrid, Mic, Loader2, Clock, TrendingUp, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface MobileAppProps {
  demands: Demand[];
  areas: Coordination[]; // Na verdade são coordenações técnicas
  people: Person[];
  onNewDemand: () => void;
  isRecording?: boolean;
  isAiLoading?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

const MobileApp: React.FC<MobileAppProps> = ({
    demands,
    areas, // Na verdade são coordenações técnicas
    people,
    onNewDemand,
    isRecording,
    isAiLoading,
    onStartRecording,
    onStopRecording
}) => {

  // 1. Chart Data Calculation
  const chartData = useMemo(() => {
    const completed = demands.filter(d => d.status === DemandStatus.CONCLUIDO).length;
    const wip = demands.filter(d => d.status === DemandStatus.EXECUCAO).length;
    const queue = demands.filter(d => d.status === DemandStatus.FILA || d.status === DemandStatus.ENTRADA).length;

    return [
        { name: 'Concluído', value: completed, color: '#4ade80' }, // Green
        { name: 'Em Andamento', value: wip, color: '#60a5fa' }, // Blue
        { name: 'Fila/Entrada', value: queue, color: '#fbbf24' } // Amber
    ];
  }, [demands]);

  // Estatísticas rápidas
  const quickStats = useMemo(() => {
    const completed = demands.filter(d => d.status === DemandStatus.CONCLUIDO);
    const wip = demands.filter(d => d.status === DemandStatus.EXECUCAO);
    const priority = demands.filter(d => d.isPriority && d.status !== DemandStatus.CONCLUIDO && d.status !== DemandStatus.CANCELADO);

    // Taxa de conclusão nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCompleted = completed.filter(d =>
      d.finishedAt && new Date(d.finishedAt) >= thirtyDaysAgo
    ).length;

    return {
      completed: completed.length,
      wip: wip.length,
      priority: priority.length,
      recentCompleted
    };
  }, [demands]);

  // 2. Occupation Data (4 Weeks Heatmap Logic)
  const occupationData = useMemo(() => {
     const now = new Date();
     const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
     startOfWeek.setHours(0,0,0,0);

     // Create 4 week windows
     const weeks = [0, 1, 2, 3].map(offset => {
         const wStart = new Date(startOfWeek);
         wStart.setDate(wStart.getDate() + (offset * 7));
         const wEnd = new Date(wStart);
         wEnd.setDate(wEnd.getDate() + 6);
         wEnd.setHours(23,59,59,999);
         return { start: wStart, end: wEnd, label: `Sem ${offset+1}` };
     });

     return areas.map(area => {
        const areaPeople = people.filter(p => p.coordinationId === area.id);
        const totalPeople = areaPeople.length;
        const weeklyCapacity = totalPeople * 40;

        // Calculate load for each of the 4 weeks
        const weeksLoad = weeks.map(week => {
            // Filter demands active in this area during this week
            const loadHours = demands
                .filter(d => d.areaId === area.id && (d.status === DemandStatus.EXECUCAO || d.status === DemandStatus.FILA))
                .reduce((acc, d) => {
                    const dStart = d.startedAt ? new Date(d.startedAt) : new Date(d.createdAt);
                    const durationDays = Math.max(1, (d.effort || 0) / 8);
                    const dEnd = new Date(dStart);
                    dEnd.setDate(dEnd.getDate() + durationDays);

                    // Intersection Logic
                    const startOverlap = dStart > week.start ? dStart : week.start;
                    const endOverlap = dEnd < week.end ? dEnd : week.end;

                    if (startOverlap < endOverlap) {
                        const days = (endOverlap.getTime() - startOverlap.getTime()) / (1000 * 60 * 60 * 24);
                        return acc + (days * 8);
                    }
                    return acc;
                }, 0);
            
            const percent = weeklyCapacity > 0 ? Math.round((loadHours / weeklyCapacity) * 100) : 0;
            
            let color = 'bg-gray-200';
            if (percent > 100) color = 'bg-red-500';
            else if (percent > 80) color = 'bg-amber-400';
            else if (percent > 0) color = 'bg-blue-400';

            return { percent, color };
        });

        return {
            id: area.id,
            name: area.name,
            peopleCount: totalPeople,
            weeksLoad
        };
     }).filter(d => d.peopleCount > 0);
  }, [areas, people, demands]);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 min-h-full pb-24 animate-fade-in">

      {/* Header Redesenhado */}
      <div className="bg-gradient-to-br from-[#003A70] to-[#005A9C] text-white p-6 rounded-b-[2rem] shadow-2xl mb-6 relative overflow-hidden">
         {/* Background decorativo */}
         <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
         </div>

         <div className="relative z-10 flex justify-between items-start mb-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight drop-shadow-md">GDD Mobile</h1>
                <p className="text-blue-100 text-sm mt-1">Visão Geral do Sistema</p>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <Activity size={24} className="text-white" />
            </div>
         </div>

         {/* Donut Chart Summary - Maior e mais visível */}
         <div className="h-[180px] w-full flex items-center justify-center relative z-10 my-4">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', fontSize: '13px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                        itemStyle={{ color: '#333', fontWeight: 600 }}
                    />
                </PieChart>
             </ResponsiveContainer>
             {/* Número central maior */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                 <span className="text-4xl font-bold text-white drop-shadow-lg">{demands.length}</span>
                 <span className="block text-xs uppercase text-blue-100 mt-1 font-medium">Demandas</span>
             </div>
         </div>

         {/* Legenda melhorada */}
         <div className="flex justify-center gap-6 mt-4 text-xs relative z-10">
             {chartData.map((item, i) => (
                 <div key={i} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                     <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                     <span className="text-white font-medium">{item.name}: {item.value}</span>
                 </div>
             ))}
         </div>
      </div>

      {/* Main Content */}
      <div className="px-4 space-y-6">

         {/* Cards de Estatísticas Rápidas - NOVO */}
         <div className="grid grid-cols-2 gap-3">
            {/* Card Concluídas */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-2xl shadow-lg text-white">
               <div className="flex items-start justify-between mb-2">
                  <div className="bg-white/20 p-2 rounded-xl">
                     <CheckCircle2 size={20} />
                  </div>
                  <span className="text-3xl font-bold">{quickStats.completed}</span>
               </div>
               <p className="text-xs text-green-100 font-medium">Concluídas</p>
               <p className="text-[10px] text-green-50 mt-1">{quickStats.recentCompleted} nos últimos 30 dias</p>
            </div>

            {/* Card Em Andamento */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl shadow-lg text-white">
               <div className="flex items-start justify-between mb-2">
                  <div className="bg-white/20 p-2 rounded-xl">
                     <Clock size={20} />
                  </div>
                  <span className="text-3xl font-bold">{quickStats.wip}</span>
               </div>
               <p className="text-xs text-blue-100 font-medium">Em Execução</p>
               <p className="text-[10px] text-blue-50 mt-1">Demandas ativas</p>
            </div>

            {/* Card Prioritárias */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-2xl shadow-lg text-white">
               <div className="flex items-start justify-between mb-2">
                  <div className="bg-white/20 p-2 rounded-xl">
                     <Zap size={20} />
                  </div>
                  <span className="text-3xl font-bold">{quickStats.priority}</span>
               </div>
               <p className="text-xs text-amber-100 font-medium">Prioritárias</p>
               <p className="text-[10px] text-amber-50 mt-1">Atenção requerida</p>
            </div>

            {/* Card Total */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-2xl shadow-lg text-white">
               <div className="flex items-start justify-between mb-2">
                  <div className="bg-white/20 p-2 rounded-xl">
                     <TrendingUp size={20} />
                  </div>
                  <span className="text-3xl font-bold">{demands.length}</span>
               </div>
               <p className="text-xs text-purple-100 font-medium">Total Geral</p>
               <p className="text-[10px] text-purple-50 mt-1">Todas as demandas</p>
            </div>
         </div>

         {/* Quick Actions Grid - Melhorado */}
         <div>
            <h3 className="font-bold text-gray-700 text-base mb-3 px-1">Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-4">
               <button
                  onClick={onNewDemand}
                  className="bg-gradient-to-br from-white to-blue-50 text-[#003A70] border-2 border-blue-200 p-5 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-3 active:scale-95 transition-all h-28 hover:shadow-xl hover:border-blue-300"
               >
                  <div className="bg-blue-500 p-3 rounded-xl text-white shadow-md">
                     <Plus size={28} strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-bold">Nova Demanda</span>
               </button>

               {onStartRecording && onStopRecording && (
                  <button
                     onClick={isRecording ? onStopRecording : onStartRecording}
                     disabled={isAiLoading && !isRecording}
                     className={`border-2 p-5 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-3 active:scale-95 transition-all h-28 ${
                        isRecording
                        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white border-red-400 animate-pulse shadow-red-300'
                        : 'bg-gradient-to-br from-white to-purple-50 text-[#003A70] border-purple-200 hover:shadow-xl hover:border-purple-300'
                     }`}
                  >
                     <div className={`p-3 rounded-xl shadow-md ${isRecording ? 'bg-white/20 text-white' : 'bg-purple-500 text-white'}`}>
                        {isAiLoading && !isRecording ? <Loader2 size={28} className="animate-spin" strokeWidth={2.5} /> : <Mic size={28} strokeWidth={2.5} />}
                     </div>
                     <span className="text-sm font-bold">{isRecording ? 'Gravando...' : (isAiLoading ? 'Processando...' : 'Por Voz (IA)')}</span>
                  </button>
               )}
            </div>
         </div>

         {/* 4-Week Heatmap List - Melhorado */}
         <div>
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-bold text-gray-700 text-base flex items-center gap-2">
                    <LayoutGrid size={20} className="text-blue-500" />
                    Ocupação por Coordenação
                </h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">4 Semanas</span>
            </div>

            <div className="space-y-4">
                {occupationData.length === 0 ? (
                   <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                      <Users size={40} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 text-sm font-medium">Nenhuma coordenação com pessoas alocadas</p>
                   </div>
                ) : (
                   occupationData.map(area => (
                      <div key={area.id} className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-gray-800 text-base">{area.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                                  <Users size={14} />
                                  <span className="font-semibold">{area.peopleCount}</span>
                              </div>
                          </div>

                          {/* 4 Blocks Grid - Melhorado */}
                          <div className="grid grid-cols-4 gap-3">
                              {area.weeksLoad.map((week, idx) => (
                                  <div key={idx} className="flex flex-col items-center gap-2">
                                      <div className={`w-full h-16 rounded-xl ${week.color} flex items-center justify-center text-sm font-bold shadow-sm transition-transform hover:scale-105 ${
                                         week.percent > 0 ? 'text-white' : 'text-gray-400'
                                      }`}>
                                          {week.percent}%
                                      </div>
                                      <span className="text-[10px] text-gray-500 uppercase font-semibold">Sem {idx + 1}</span>
                                  </div>
                              ))}
                          </div>

                          {/* Legenda de cores */}
                          <div className="flex gap-3 mt-4 pt-3 border-t border-gray-100">
                             <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                <span>&lt;50%</span>
                             </div>
                             <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                <span>50-80%</span>
                             </div>
                             <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span>&gt;80%</span>
                             </div>
                          </div>
                      </div>
                   ))
                )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default MobileApp;