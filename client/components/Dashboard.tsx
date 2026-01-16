
import React, { useMemo, useState } from 'react';
import { Demand, DemandStatus, Coordination, Person, DemandType } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area as RechartsArea
} from 'recharts';
import StatsCard from './StatsCard';
import { Filter, Calendar, BarChart2 } from 'lucide-react';

interface DashboardProps {
  demands: Demand[];
  coordinations: Coordination[];
  people: Person[];
}

const Dashboard: React.FC<DashboardProps> = ({ demands, coordinations }) => {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedCoordId, setSelectedCoordId] = useState<string>('all');

  // 0. Pre-filter by Coordination (Base Dataset for Dashboard)
  const demandsByCoord = useMemo(() => {
    if (selectedCoordId === 'all') return demands;
    return demands.filter(d => d.areaId === selectedCoordId);
  }, [demands, selectedCoordId]);

  // 1. Extract Available Years (APENAS de finishedAt - competência por fechamento)
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    demandsByCoord.forEach(d => {
      // Apenas anos de fechamento são considerados para competência
      if (d.finishedAt) years.add(new Date(d.finishedAt).getFullYear().toString());
    });
    return Array.from(years).sort().reverse();
  }, [demandsByCoord]);

  // 2. Filter Demands by Selected Year (APENAS por finishedAt - competência por fechamento)
  const filteredDemands = useMemo(() => {
    if (selectedYear === 'Todos') return demandsByCoord;
    return demandsByCoord.filter(d => {
      // Competência é definida pela data de fechamento
      if (!d.finishedAt) return false;
      const finishedYear = new Date(d.finishedAt).getFullYear().toString();
      return finishedYear === selectedYear;
    });
  }, [demandsByCoord, selectedYear]);

  // 3. Metrics Logic
  const metrics = useMemo(() => {
    const total = filteredDemands.length;
    
    // For Throughput/LeadTime, we strictly look at items FINISHED in the selected period
    const completedInPeriod = filteredDemands.filter(d => {
        if (d.status !== DemandStatus.CONCLUIDO) return false;
        const finishYear = d.finishedAt ? new Date(d.finishedAt).getFullYear().toString() : '';
        return selectedYear === 'Todos' ? true : finishYear === selectedYear;
    });
    
    // WIP is a snapshot of "Current Active", so we use demandsByCoord (filtered by Coordination, but ignores Year timeframe)
    const wipCount = demandsByCoord.filter(d => d.status === DemandStatus.EXECUCAO || d.status === DemandStatus.VALIDACAO).length;

    // Helper to calculate avg days
    const calcAvgDays = (items: Demand[], field: 'createdAt' | 'startedAt') => {
      if (items.length === 0) return 0;
      const sum = items.reduce((acc, curr) => {
         const start = curr[field] ? new Date(curr[field]!).getTime() : 0;
         const end = curr.finishedAt ? new Date(curr.finishedAt).getTime() : 0;
         if (start === 0 || end === 0) return acc;
         return acc + (end - start);
      }, 0);
      return sum / items.length / (1000 * 60 * 60 * 24);
    };

    const throughput = completedInPeriod.length;
    const systemItems = completedInPeriod.filter(d => d.type === DemandType.SYSTEM);
    const taskItems = completedInPeriod.filter(d => d.type === DemandType.TASK);

    // Calculate Late Deliveries (SLA Breaches)
    const lateCount = completedInPeriod.filter(d => d.delayJustification && d.delayJustification.trim().length > 0).length;
    const latePercentage = throughput > 0 ? ((lateCount / throughput) * 100).toFixed(1) : '0.0';

    return {
      total,
      wip: wipCount,
      throughput,
      lateCount,
      latePercentage,
      systemLeadTime: calcAvgDays(systemItems, 'createdAt').toFixed(1),
      systemCycleTime: calcAvgDays(systemItems, 'startedAt').toFixed(1),
      taskLeadTime: calcAvgDays(taskItems, 'createdAt').toFixed(1),
      taskCycleTime: calcAvgDays(taskItems, 'startedAt').toFixed(1)
    };
  }, [filteredDemands, demandsByCoord, selectedYear]);

  // 4. Consolidated Chart Data Aggregation (COMPETÊNCIA POR FECHAMENTO)
  const chartData = useMemo(() => {
    const data: Record<string, {
        name: string;
        finished: number;
        archived: number;
        leadTimeSum: number;
        cycleTimeSum: number;
        finishedCount: number;
        sistema: number;
        tarefa: number;
        lateCount: number;
    }> = {};

    // Use demandsByCoord to respect the Coordination filter
    demandsByCoord.forEach(d => {
        // 1. Concluídas - Competência pela data de fechamento
        if (d.status === DemandStatus.CONCLUIDO && d.finishedAt) {
            const finishedDate = new Date(d.finishedAt);
            const finishedYear = finishedDate.getFullYear().toString();

            if (selectedYear === 'Todos' || finishedYear === selectedYear) {
                const key = `${finishedDate.getFullYear()}-${String(finishedDate.getMonth() + 1).padStart(2, '0')}`;
                if (!data[key]) data[key] = {
                    name: finishedDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                    finished: 0, archived: 0, leadTimeSum: 0, cycleTimeSum: 0, finishedCount: 0,
                    sistema: 0, tarefa: 0, lateCount: 0
                };

                data[key].finished++;
                data[key].finishedCount++;

                // Type Breakdown
                if (d.type === DemandType.SYSTEM) data[key].sistema++;
                else data[key].tarefa++;

                // Late Count
                if (d.delayJustification) data[key].lateCount++;

                // Lead Time & Cycle Time
                const start = new Date(d.createdAt).getTime();
                const executionStart = d.startedAt ? new Date(d.startedAt).getTime() : start;
                const end = finishedDate.getTime();

                data[key].leadTimeSum += (end - start) / (1000 * 60 * 60 * 24);
                data[key].cycleTimeSum += (end - executionStart) / (1000 * 60 * 60 * 24);
            }
        }

        // 2. Canceladas - Competência pela data de cancelamento
        if (d.status === DemandStatus.CANCELADO && d.statusTimestamps?.[DemandStatus.CANCELADO]) {
            const archivedDate = new Date(d.statusTimestamps[DemandStatus.CANCELADO]);
            const archivedYear = archivedDate.getFullYear().toString();

            if (selectedYear === 'Todos' || archivedYear === selectedYear) {
                const key = `${archivedDate.getFullYear()}-${String(archivedDate.getMonth() + 1).padStart(2, '0')}`;
                if (!data[key]) data[key] = {
                    name: archivedDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                    finished: 0, archived: 0, leadTimeSum: 0, cycleTimeSum: 0, finishedCount: 0,
                    sistema: 0, tarefa: 0, lateCount: 0
                };

                data[key].archived++;
            }
        }
    });

    return Object.entries(data)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([_, val]) => ({
            ...val,
            leadTimeAvg: val.finishedCount > 0 ? Number((val.leadTimeSum / val.finishedCount).toFixed(1)) : 0,
            cycleTimeAvg: val.finishedCount > 0 ? Number((val.cycleTimeSum / val.finishedCount).toFixed(1)) : 0,
            latePercentage: val.finishedCount > 0 ? Number(((val.lateCount / val.finishedCount) * 100).toFixed(1)) : 0
        }));
  }, [demandsByCoord, selectedYear]);

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-7xl mx-auto">
      
      {/* Dashboard Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
         <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="bg-[#003A70] text-white p-1.5 rounded-lg"><BarChart2 size={20}/></span>
            Indicadores de Performance
         </h2>
         
         <div className="flex items-center gap-4">
            {/* Filter: Coordination */}
            <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">Coord. Técnica</label>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                   <Filter size={16} className="text-gray-400" />
                   <select
                      value={selectedCoordId}
                      onChange={(e) => setSelectedCoordId(e.target.value)}
                      className="bg-transparent text-sm font-medium text-gray-600 outline-none min-w-[140px]"
                   >
                      <option value="all">Todas</option>
                      {coordinations.map(coord => (
                         <option key={coord.id} value={coord.id}>{coord.name}</option>
                      ))}
                   </select>
                </div>
            </div>

            {/* Filter: Year */}
            <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">Período</label>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                   <Calendar size={16} className="text-gray-400" />
                   <select 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-transparent text-sm font-medium text-gray-600 outline-none min-w-[100px]"
                   >
                      <option value="Todos">Todos</option>
                      {availableYears.map(year => (
                         <option key={year} value={year}>{year}</option>
                      ))}
                   </select>
                </div>
            </div>
         </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard 
            title="Demandas Totais" 
            value={metrics.total} 
            subtitle={`${selectedYear === 'Todos' ? 'Histórico Completo' : `Em ${selectedYear}`}`}
        />
        <StatsCard 
            title="WIP (Em Andamento)" 
            value={metrics.wip} 
            subtitle="Itens ativos agora" 
            color="yellow"
        />
        <StatsCard 
            title="Entregas (Throughput)" 
            value={metrics.throughput} 
            subtitle="Concluídos no período" 
            color="green"
        />
        <StatsCard 
            title="SLA (% Atraso)" 
            value={`${metrics.latePercentage}%`} 
            subtitle={`${metrics.lateCount} de ${metrics.throughput} atrasados`}
            color="red" 
            trend={Number(metrics.latePercentage) > 10 ? 'down' : 'up'}
        />
      </div>

      {/* CHARTS ROW 1 - PRIORITIZED MONTHLY VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CHART: INFLOW VS OUTFLOW */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-800 font-bold mb-6 flex items-center gap-2 text-sm">
             Fluxo de Demandas (Visão Mensal)
          </h3>
          <div className="h-[250px] sm:h-[300px] lg:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '20px'}} />
                <Bar dataKey="finished" name="Concluídas" fill="#003A70" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar dataKey="archived" name="Canceladas" fill="#f87171" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART: EVOLUTION OF LEAD TIME */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-800 font-bold mb-6 flex items-center gap-2 text-sm">
             Evolução do Lead Time (Média Mensal)
          </h3>
          <div className="h-[250px] sm:h-[300px] lg:h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                   <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                   />
                   <Legend iconType="plainline" wrapperStyle={{fontSize: '12px', paddingTop: '20px'}} />
                   <RechartsArea type="monotone" dataKey="leadTimeAvg" name="Lead Time (Total)" stroke="#32A6E6" fill="#32A6E6" fillOpacity={0.1} strokeWidth={2} />
                   <Line type="monotone" dataKey="cycleTimeAvg" name="Cycle Time (Execução)" stroke="#003A70" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                </ComposedChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LEAD TIME METRICS CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <BarChart2 size={100} />
            </div>
            <div>
               <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Lead Time Geral</h3>
               <h4 className="text-[#32A6E6] text-lg font-bold mb-4">Sistemas (Estruturante)</h4>
               <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-800">{metrics.systemLeadTime}</span>
                  <span className="text-sm text-gray-500">dias</span>
               </div>
               <p className="text-xs text-gray-400 mt-2">Média acumulada do período</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
               <span className="text-xs font-medium text-gray-600">Cycle Time (Execução):</span>
               <span className="text-sm font-bold text-gray-800">{metrics.systemCycleTime} dias</span>
            </div>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <BarChart2 size={100} />
            </div>
            <div>
               <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Lead Time Geral</h3>
               <h4 className="text-blue-600 text-lg font-bold mb-4">Tarefas (Rotina)</h4>
               <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-800">{metrics.taskLeadTime}</span>
                  <span className="text-sm text-gray-500">dias</span>
               </div>
               <p className="text-xs text-gray-400 mt-2">Média acumulada do período</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
               <span className="text-xs font-medium text-gray-600">Cycle Time (Execução):</span>
               <span className="text-sm font-bold text-gray-800">{metrics.taskCycleTime} dias</span>
            </div>
         </div>
      </div>

      {/* CHART ROW 2: LATE DELIVERIES ANALYSIS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-800 font-bold mb-6 flex items-center gap-2 text-sm">
             Análise de Atrasos (Mensal)
          </h3>
          <div className="h-[250px] sm:h-[300px] lg:h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} dy={10} />
                   <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                   <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} unit="%" />
                   <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                   />
                   <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '20px'}} />
                   <Bar yAxisId="left" dataKey="lateCount" name="Qtd. Atrasada" fill="#FCA5A5" radius={[4, 4, 0, 0]} barSize={30} />
                   <Line yAxisId="right" type="monotone" dataKey="latePercentage" name="% Atraso" stroke="#DC2626" strokeWidth={2} dot={{r: 4}} />
                </ComposedChart>
             </ResponsiveContainer>
          </div>
      </div>

    </div>
  );
};

export default Dashboard;
