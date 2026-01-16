
import React, { useMemo, useState } from 'react';
import { Demand, Person, Coordination, DemandStatus } from '../types';
import { AlertTriangle, User, CheckCircle2, Calendar, LayoutGrid, ChevronRight, ChevronDown, Clock, ArrowRight, ChevronUp } from 'lucide-react';

interface InsightsPanelProps {
  demands: Demand[];
  people: Person[];
  coordinations: Coordination[]; // Coordenações técnicas onde as pessoas trabalham
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ demands, people, coordinations }) => {
  // State for Allocation Time Filter (Start/End)
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  });

  // State for collapsible sections
  const [visibleSections, setVisibleSections] = useState({
     delays: true,
     allocation: true,
     heatmap: true,
     forecast: true
  });

  const toggleSection = (key: keyof typeof visibleSections) => {
      setVisibleSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Accordion state for heatmap
  const [expandedCoords, setExpandedCoords] = useState<Set<string>>(new Set());

  const toggleCoord = (id: string) => {
    const newSet = new Set(expandedCoords);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedCoords(newSet);
  };

  // Helper to calculate working days between two dates (Naive approach: Mon-Fri)
  const getWorkingDays = (startDate: Date, endDate: Date) => {
    let count = 0;
    const curDate = new Date(startDate);
    while (curDate <= endDate) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  };

  // 1. Logic for Delayed Demands
  const delayedDemands = useMemo(() => {
    // A. Completed items with Justification (officially late)
    const historicLate = demands.filter(d => 
        d.status === DemandStatus.CONCLUIDO && 
        d.delayJustification && 
        d.delayJustification.length > 0
    );

    // B. Active items potentially late (Time elapsed > Effort)
    // Simple heuristic: if in Execution and (Now - Start) > Effort * 1.2 (buffer)
    const now = new Date().getTime();
    const activeLate = demands.filter(d => {
        if (d.status !== DemandStatus.EXECUCAO || !d.startedAt) return false;
        const start = new Date(d.startedAt).getTime();
        const elapsedHours = (now - start) / (1000 * 60 * 60);
        return elapsedHours > (d.effort * 1.2); // 20% buffer
    }).map(d => ({...d, isProjectedLate: true}));

    return [...activeLate, ...historicLate];
  }, [demands]);

  // 2. Logic for Allocation (Capacity vs Projected) with Time Filter
  const allocationData = useMemo(() => {
    // Filter Range Dates
    const rangeStart = new Date(dateRange.start);
    rangeStart.setHours(0,0,0,0);
    const rangeEnd = new Date(dateRange.end);
    rangeEnd.setHours(23,59,59,999);

    // DYNAMIC CAPACITY: Working Days * 8 hours
    const workingDays = getWorkingDays(rangeStart, rangeEnd);
    const DYNAMIC_CAPACITY = Math.max(8, workingDays * 8); // Minimum 8h capacity to avoid division by zero

    return people.map(person => {
       // Calculate effort falling strictly within the selected range
       const allocatedLoad = demands
         .filter(d => d.personId === person.id && (
             d.status === DemandStatus.FILA || 
             d.status === DemandStatus.EXECUCAO || 
             d.status === DemandStatus.VALIDACAO
         ))
         .reduce((acc, d) => {
             // 1. Determine Task Start
             const startDate = d.startedAt ? new Date(d.startedAt) : new Date(d.createdAt);
             
             // 2. Determine Task Duration in Days (Effort / 8h per day)
             const durationDays = Math.max(1, (d.effort || 0) / 8);
             
             // 3. Determine Task End
             const endDate = new Date(startDate);
             endDate.setDate(endDate.getDate() + durationDays);

             // 4. Calculate Intersection with Selected Range
             const startOverlap = startDate > rangeStart ? startDate : rangeStart;
             const endOverlap = endDate < rangeEnd ? endDate : rangeEnd;

             // If valid overlap
             if (startOverlap < endOverlap) {
                 const overlapMillis = endOverlap.getTime() - startOverlap.getTime();
                 const overlapDays = overlapMillis / (1000 * 60 * 60 * 24);
                 // Convert overlap days back to hours (approx 8h/day)
                 const overlapHours = overlapDays * 8;
                 return acc + overlapHours;
             }
             return acc;
         }, 0);

       const activeLoad = Math.round(allocatedLoad);
       const utilization = Math.min(100, Math.round((activeLoad / DYNAMIC_CAPACITY) * 100));
       const coordinationName = coordinations.find(c => c.id === person.coordinationId)?.name || '';

       return {
         name: person.name,
         area: coordinationName,
         capacity: DYNAMIC_CAPACITY,
         allocated: activeLoad,
         available: Math.max(0, DYNAMIC_CAPACITY - activeLoad),
         utilization,
         status: activeLoad > DYNAMIC_CAPACITY ? 'Overloaded' : (activeLoad > (DYNAMIC_CAPACITY * 0.8) ? 'High' : 'Normal')
       };
    }).sort((a, b) => b.utilization - a.utilization); // Sort by busiest
  }, [people, demands, coordinations, dateRange]);

  // 3. HEATMAP LOGIC
  const heatmapData = useMemo(() => {
    // A. Generate Weeks
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const weeks: { label: string; start: Date; end: Date }[] = [];
    
    let current = new Date(start);
    
    while (current <= end) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        weeks.push({
            label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
            start: weekStart,
            end: weekEnd
        });
        current.setDate(current.getDate() + 7);
    }

    // B. Calculate Load Per Week
    const calcLoad = (personId: string, weekStart: Date, weekEnd: Date) => {
        // Normalize
        const wStart = new Date(weekStart); wStart.setHours(0,0,0,0);
        const wEnd = new Date(weekEnd); wEnd.setHours(23,59,59,999);

        return demands
            .filter(d => d.personId === personId && (
                d.status === DemandStatus.FILA || 
                d.status === DemandStatus.EXECUCAO || 
                d.status === DemandStatus.VALIDACAO
            ))
            .reduce((acc, d) => {
                const dStart = d.startedAt ? new Date(d.startedAt) : new Date(d.createdAt);
                const durationDays = Math.max(1, (d.effort || 0) / 8);
                const dEnd = new Date(dStart);
                dEnd.setDate(dEnd.getDate() + durationDays);

                // Intersection
                const startOverlap = dStart > wStart ? dStart : wStart;
                const endOverlap = dEnd < wEnd ? dEnd : wEnd;

                if (startOverlap < endOverlap) {
                    const days = (endOverlap.getTime() - startOverlap.getTime()) / (1000 * 60 * 60 * 24);
                    const hours = days * 8; // approx
                    return acc + hours;
                }
                return acc;
            }, 0);
    };

    // C. Build Rows
    const coordinationRows: Record<string, { 
        id: string; 
        name: string; 
        weeks: number[]; 
        people: { id: string; name: string; weeks: number[] }[] 
    }> = {};

    // Initialize Coords
    coordinations.forEach(coordination => {
        // Only include coordinations that have people
        if (people.some(p => p.coordinationId === coordination.id)) {
            coordinationRows[coordination.id] = {
                id: coordination.id,
                name: coordination.name,
                weeks: weeks.map(() => 0),
                people: []
            };
        }
    });

    // Fill People and Aggregate to Coords
    people.forEach(person => {
        if (!coordinationRows[person.coordinationId]) return;

        const personWeeks = weeks.map(w => calcLoad(person.id, w.start, w.end));

        // Add to Person
        coordinationRows[person.coordinationId].people.push({
            id: person.id,
            name: person.name,
            weeks: personWeeks
        });

        // Add to Coord
        personWeeks.forEach((load, idx) => {
            coordinationRows[person.coordinationId].weeks[idx] += load;
        });
    });

    // Calculate Grand Total Row
    const totalWeeks = weeks.map((_, idx) => {
        return Object.values(coordinationRows).reduce((acc, coord) => acc + coord.weeks[idx], 0);
    });

    // Capacity Logic (Standard 40h/week per person)
    const getCapacityColor = (load: number, capacity: number) => {
        const ratio = load / capacity;
        if (ratio === 0) return 'bg-gray-50 text-gray-300';
        if (ratio < 0.5) return 'bg-blue-50 text-blue-600';
        if (ratio < 0.9) return 'bg-blue-100 text-blue-800'; // Optimal
        if (ratio <= 1.1) return 'bg-orange-100 text-orange-700'; // High
        return 'bg-red-100 text-red-700 font-bold'; // Overload
    };

    return { weeks, coordinationRows: Object.values(coordinationRows), totalWeeks, getCapacityColor };
  }, [demands, people, coordinations, dateRange]);

  // 4. Capacity Prediction Metrics
  const capacityMetrics = useMemo(() => {
     const completed = demands.filter(d => d.status === DemandStatus.CONCLUIDO);
     const inProgressCount = demands.filter(d => d.status === DemandStatus.EXECUCAO).length;
     
     const leadTimes = completed
        .filter(d => d.finishedAt && d.createdAt)
        .map(d => new Date(d.finishedAt!).getTime() - new Date(d.createdAt).getTime());
    
     const avgLeadTime = leadTimes.length > 0 
        ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length / (1000 * 60 * 60 * 24)) 
        : 0;

     return { inProgressCount, avgLeadTime };
  }, [demands]);

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-10">
       
       <div className="flex items-center justify-between">
          <div>
             <h2 className="text-2xl font-bold text-[#003A70]">Insights de Gestão</h2>
             <p className="text-gray-500">Análise de gargalos, atrasos e capacidade produtiva da equipe.</p>
          </div>
       </div>

       <div className="flex flex-col gap-6">
          
          {/* SECTION 1: DELAY ANALYSIS (FULL WIDTH) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
             <div 
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('delays')}
             >
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                       <AlertTriangle size={20} />
                    </div>
                    <div>
                       <h3 className="font-bold text-gray-800">Demandas em Atraso / Críticas (Top 10)</h3>
                       <p className="text-xs text-gray-500">Itens entregues fora do prazo ou execução estourada.</p>
                    </div>
                 </div>
                 <div className="text-gray-400">
                     {visibleSections.delays ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                 </div>
             </div>

             {visibleSections.delays && (
                 <div className="px-6 pb-6 border-t border-gray-100 pt-4 animate-fade-in">
                    <div className="overflow-hidden rounded-lg border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Demanda</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Resp.</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase">Esforço</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {delayedDemands.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                                    <CheckCircle2 className="mx-auto mb-2 text-green-400" size={24} />
                                    Nenhuma demanda crítica detectada.
                                    </td>
                                </tr>
                            ) : (
                                delayedDemands.slice(0, 10).map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="text-xs font-bold text-gray-700 line-clamp-1" title={d.title}>{d.title}</div>
                                        <div className="text-[10px] text-gray-400 line-clamp-1">
                                            {(d as any).isProjectedLate ? 'Estouro de tempo de execução' : d.delayJustification}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        {people.find(p => p.id === d.personId)?.name.split(' ')[0]}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                            d.status === DemandStatus.CONCLUIDO 
                                                ? 'bg-red-50 text-red-600 border-red-100' 
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                            {d.status === DemandStatus.CONCLUIDO ? 'Entregue (Atraso)' : 'Em Risco'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs font-mono text-gray-600">
                                        {d.effort}h
                                    </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        </table>
                    </div>
                 </div>
             )}
          </div>

          {/* SECTION 2: ALLOCATION (FULL WIDTH) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
             <div 
                className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={(e) => {
                    // Avoid toggling when interacting with date inputs
                    if ((e.target as HTMLElement).tagName !== 'INPUT') {
                        toggleSection('allocation');
                    }
                }}
             >
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-[#32A6E6] text-white rounded-lg">
                      <User size={20} />
                   </div>
                   <div>
                      <h3 className="font-bold text-gray-800">Alocação de Equipe</h3>
                      <p className="text-xs text-gray-500">Esforço projetado vs Capacidade dinâmica</p>
                   </div>
                   <div className="ml-2 text-gray-400">
                        {visibleSections.allocation ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                   </div>
                </div>
                
                {/* Date Range Filter Input */}
                <div className="w-full md:w-auto bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Início:</label>
                        <div className="relative flex-1">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                            <input 
                                type="date" 
                                className="w-full bg-white border border-gray-300 rounded px-2 py-1 pl-7 text-xs text-gray-600 outline-none focus:border-blue-500"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>
                    </div>
                    
                    <span className="text-gray-300 hidden sm:block">→</span>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Fim:</label>
                        <div className="relative flex-1">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                            <input 
                                type="date" 
                                className="w-full bg-white border border-gray-300 rounded px-2 py-1 pl-7 text-xs text-gray-600 outline-none focus:border-blue-500"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>
             </div>

             {/* ALLOCATION GRID */}
             {visibleSections.allocation && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {allocationData.map((person) => (
                        <div key={person.name} className="bg-gray-50 rounded-lg p-4 border border-gray-200 group hover:bg-white hover:shadow-sm transition-all">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <div className="text-sm font-bold text-gray-700">{person.name}</div>
                                    <div className="text-[10px] text-gray-400">{person.area}</div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-sm font-bold ${
                                    person.status === 'Overloaded' ? 'text-red-600' : (person.status === 'High' ? 'text-amber-600' : 'text-[#32A6E6]')
                                    }`}>
                                    {person.allocated}h
                                    </span>
                                    <span className="text-[10px] text-gray-400"> / {person.capacity}h</span>
                                </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
                                <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    person.status === 'Overloaded' ? 'bg-red-500' : (person.status === 'High' ? 'bg-amber-400' : 'bg-[#32A6E6]')
                                }`}
                                style={{ width: `${Math.min(100, person.utilization)}%` }}
                                ></div>
                            </div>
                            
                            <div className="flex justify-between">
                                <span className="text-[10px] text-gray-500 font-medium">{person.utilization}% Ocupado</span>
                                <span className="text-[10px] text-gray-400">
                                    {person.available}h Disponíveis
                                </span>
                            </div>
                        </div>
                        ))}
                        {allocationData.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-400 text-xs">
                                Nenhuma pessoa encontrada com as áreas/filtros atuais.
                            </div>
                        )}
                    </div>
                </div>
             )}
          </div>

          {/* SECTION 3: WEEKLY HEATMAP */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
              <div 
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('heatmap')}
              >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <LayoutGrid size={20} />
                    </div>
                    <div>
                    <h3 className="font-bold text-gray-800">Heatmap Semanal (% Ocupação)</h3>
                    <p className="text-xs text-gray-500">Visão de carga vs capacidade padrão (40h/sem)</p>
                    </div>
                </div>
                <div className="text-gray-400">
                    {visibleSections.heatmap ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {visibleSections.heatmap && (
                <div className="px-6 pb-6 border-t border-gray-100 pt-4 animate-fade-in">
                    <div className="overflow-x-auto border border-gray-200 rounded-lg custom-scrollbar">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-3 bg-gray-50 border-b border-r border-gray-200 text-left font-bold text-gray-600 min-w-[200px] sticky left-0 z-10">Recurso / Período</th>
                                    {heatmapData.weeks.map((week, idx) => (
                                        <th key={idx} className="p-3 bg-gray-50 border-b border-gray-200 text-center font-bold text-gray-600 min-w-[60px]">
                                            Sem {idx + 1} <br/>
                                            <span className="text-[9px] text-gray-400 font-normal">{week.label}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* GRAND TOTAL ROW */}
                                <tr className="bg-gray-100 font-bold border-b border-gray-200">
                                    <td className="p-3 border-r border-gray-200 text-gray-800 sticky left-0 bg-gray-100 z-10">TOTAL EQUIPE</td>
                                    {heatmapData.totalWeeks.map((total, idx) => {
                                        const totalCapacity = people.length * 40; 
                                        const percentage = Math.round((total / totalCapacity) * 100);
                                        return (
                                            <td key={idx} className={`p-2 text-center border-b border-gray-200 border-l border-white ${heatmapData.getCapacityColor(total, totalCapacity)}`}>
                                                {percentage}%
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* COORDINATION GROUPS */}
                                {heatmapData.coordinationRows.map(coord => {
                                    const isExpanded = expandedCoords.has(coord.id);
                                    const coordCapacity = coord.people.length * 40;

                                    return (
                                        <React.Fragment key={coord.id}>
                                            {/* Coord Row */}
                                            <tr 
                                                onClick={() => toggleCoord(coord.id)}
                                                className="cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                                            >
                                                <td className="p-3 border-r border-gray-200 sticky left-0 bg-white z-10 flex items-center gap-2">
                                                    {isExpanded ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronRight size={14} className="text-gray-400"/>}
                                                    <span className="font-bold text-[#003A70]">{coord.name}</span>
                                                </td>
                                                {coord.weeks.map((load, idx) => {
                                                    const percentage = Math.round((load / coordCapacity) * 100);
                                                    return (
                                                        <td key={idx} className={`p-2 text-center border-l border-gray-100 ${heatmapData.getCapacityColor(load, coordCapacity)}`}>
                                                            {percentage}%
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            
                                            {/* People Rows (if expanded) */}
                                            {isExpanded && coord.people.map(person => (
                                                <tr key={person.id} className="border-b border-gray-100 bg-gray-50/30">
                                                    <td className="p-2 pl-8 border-r border-gray-200 sticky left-0 bg-gray-50/30 z-10 text-gray-600 flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-gray-200 text-[9px] flex items-center justify-center font-bold text-gray-500">
                                                            {person.name.charAt(0)}
                                                        </div>
                                                        {person.name}
                                                    </td>
                                                    {person.weeks.map((load, idx) => {
                                                        const percentage = Math.round((load / 40) * 100);
                                                        return (
                                                            <td key={idx} className={`p-2 text-center border-l border-white ${heatmapData.getCapacityColor(load, 40)}`}>
                                                                {Math.round(load) > 0 ? `${percentage}%` : '-'}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
              )}
          </div>

          {/* SECTION 4: CAPACITY PREDICTION (Moved from Storytelling) */}
          <div className="bg-[#003A70] rounded-2xl shadow-xl relative z-20 overflow-hidden">
              <div 
                className="p-8 flex items-center justify-between cursor-pointer hover:bg-[#002A50] transition-colors"
                onClick={() => toggleSection('forecast')}
              >
                 <div className="relative z-10 flex flex-col">
                    <h3 className="font-bold text-xl text-white flex items-center gap-3 mb-1">
                        <Clock size={24} className="text-[#32A6E6]" />
                        Previsão de Capacidade (Forecast)
                    </h3>
                    <p className="text-sm text-blue-100/60">Estimativa baseada em Lead Time atual.</p>
                 </div>
                 <div className="text-blue-300 relative z-10">
                    {visibleSections.forecast ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                 </div>
                 <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              </div>

              {visibleSections.forecast && (
                  <div className="px-8 pb-8 pt-2 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 animate-fade-in border-t border-white/10">
                    <div className="text-sm text-blue-100/80 max-w-xl leading-relaxed">
                        Baseado no Lead Time atual de <strong className="text-white">{capacityMetrics.avgLeadTime} dias</strong>, novas demandas que entrarem hoje 
                        têm uma estimativa de conclusão para <strong className="text-[#32A6E6]">{new Date(Date.now() + capacityMetrics.avgLeadTime * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</strong>.
                    </div>
                    <div className="flex items-center gap-8 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                        <div className="text-right">
                            <div className="text-3xl font-bold tracking-tight text-white">{capacityMetrics.inProgressCount}</div>
                            <div className="text-[10px] opacity-70 uppercase font-bold tracking-wider text-blue-200">Em Andamento</div>
                        </div>
                        <ArrowRight className="text-[#32A6E6] opacity-80" size={24} />
                        <div>
                            <div className="text-3xl font-bold tracking-tight text-white">{capacityMetrics.avgLeadTime}d</div>
                            <div className="text-[10px] opacity-70 uppercase font-bold tracking-wider text-blue-200">Ciclo Médio</div>
                        </div>
                    </div>
                  </div>
              )}
          </div>

       </div>
    </div>
  );
};

export default InsightsPanel;