
import React, { useMemo, useState } from 'react';
import { Demand, Person, DemandStatus, Coordination } from '../types';
import { Calendar, Filter } from 'lucide-react';

interface GanttChartProps {
  demands: Demand[];
  people: Person[];
  coordinations: Coordination[];
  onView: (demand: Demand) => void;
}

const CELL_WIDTH = 40; // Pixels per day
const ROW_HEIGHT = 50;

const GanttChart: React.FC<GanttChartProps> = ({ demands, people, coordinations, onView }) => {
  // Initialize with the requested buffer: 3 days ago to 30 days ahead
  const [dateRange, setDateRange] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 3);
    
    const end = new Date();
    end.setDate(end.getDate() + 30);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  const [filterCoordId, setFilterCoordId] = useState('all');
  const [filterPersonId, setFilterPersonId] = useState('all');

  // Filtered People for Dropdown (Cascading) - Filter by coordination via demand.areaId
  const availablePeople = useMemo(() => {
      if (filterCoordId === 'all') return people;
      // Get all personIds from demands that match the coordination filter
      const relevantPersonIds = new Set(
        demands.filter(d => d.areaId === filterCoordId).map(d => d.personId)
      );
      return people.filter(p => relevantPersonIds.has(p.id));
  }, [people, filterCoordId, demands]);

  // 1. Prepare Data & Scheduling
  const { peopleRows, timelineStart, timelineEnd } = useMemo(() => {
    const rows: { 
      person: Person; 
      tasks: { 
        data: Demand; 
        start: Date; 
        end: Date; 
        isProjected: boolean;
        left: number;
        width: number;
      }[] 
    }[] = [];

    // Parse Filter Dates (start of day for start date, end of day for end date logic)
    const filterStart = new Date(dateRange.start);
    const filterEnd = new Date(dateRange.end);
    
    // Ensure correct time boundaries
    filterStart.setHours(0,0,0,0);
    filterEnd.setHours(23,59,59,999);

    // Apply filters to people list first
    let filteredPeople = people;
    if (filterCoordId !== 'all') {
        // Filter by coordination: show people working on demands for this coordination
        const relevantPersonIds = new Set(
          demands.filter(d => d.areaId === filterCoordId).map(d => d.personId)
        );
        filteredPeople = filteredPeople.filter(p => relevantPersonIds.has(p.id));
    }
    if (filterPersonId !== 'all') {
        filteredPeople = filteredPeople.filter(p => p.id === filterPersonId);
    }

    // Then filter by activity (existing logic) but restricted to the filtered people
    const activePeople = filteredPeople.filter(p => demands.some(d => d.personId === p.id));

    activePeople.forEach(person => {
      const personDemands = demands.filter(d => d.personId === person.id && d.status !== DemandStatus.CANCELADO);
      
      // FIFO Sort
      personDemands.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Scheduling Simulation
      let scheduleCursor = new Date(); // Start scheduling pending items from Now
      
      // Adjust cursor based on active tasks logic
      const activeTasks = personDemands.filter(d => d.status === DemandStatus.EXECUCAO || d.status === DemandStatus.VALIDACAO);
      activeTasks.forEach(t => {
         const start = t.startedAt ? new Date(t.startedAt) : new Date();
         const daysEffort = Math.max(1, (t.effort || 8) / 8);
         const end = new Date(start);
         end.setDate(end.getDate() + daysEffort);
         if (end > scheduleCursor) scheduleCursor = end;
      });

      const tasks = personDemands.map(d => {
        let start: Date;
        let end: Date;
        let isProjected = false;

        if (d.status === DemandStatus.CONCLUIDO) {
           start = d.startedAt ? new Date(d.startedAt) : new Date(d.createdAt);
           end = d.finishedAt ? new Date(d.finishedAt) : new Date(start);
           if (end <= start) end.setDate(start.getDate() + 1);
        } else if (d.status === DemandStatus.EXECUCAO || d.status === DemandStatus.VALIDACAO) {
           start = d.startedAt ? new Date(d.startedAt) : new Date(d.createdAt);
           const daysEffort = Math.max(1, (d.effort || 8) / 8);
           end = new Date(start);
           end.setDate(end.getDate() + daysEffort);
           if (end < new Date()) end = new Date();
        } else {
           // Pending / Queue - Schedule FIFO
           isProjected = true;
           start = new Date(scheduleCursor);
           const daysEffort = Math.max(1, (d.effort || 8) / 8);
           end = new Date(start);
           end.setDate(end.getDate() + daysEffort);
           scheduleCursor = new Date(end); 
        }

        // Calculate position relative to FILTER START
        // If task ends before filter start or starts after filter end, it might not be visible, 
        // but we calculate it anyway and let CSS/Overflow handle or filter here.
        
        return { data: d, start, end, isProjected, left: 0, width: 0 };
      }).filter(t => {
          // Only keep tasks that overlap with the selected range
          return t.end >= filterStart && t.start <= filterEnd;
      });

      // Only add row if there are tasks in the window
      if (tasks.length > 0) {
        rows.push({ person, tasks });
      }
    });

    // Calculate visual positions based on Filter Start
    rows.forEach(row => {
        row.tasks.forEach(task => {
            const diffDays = (task.start.getTime() - filterStart.getTime()) / (1000 * 60 * 60 * 24);
            const durationDays = (task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24);
            
            task.left = diffDays * CELL_WIDTH;
            task.width = Math.max(CELL_WIDTH / 4, durationDays * CELL_WIDTH);
        });
    });

    return { peopleRows: rows, timelineStart: filterStart, timelineEnd: filterEnd };
  }, [demands, people, dateRange, filterCoordId, filterPersonId]);

  // 2. Generate Date Headers
  const dateHeaders = useMemo(() => {
      const headers = [];
      const curr = new Date(timelineStart);
      // Buffer slightly for scrolling
      const endLoop = new Date(timelineEnd);
      endLoop.setDate(endLoop.getDate() + 2); 

      let offset = 0;
      
      while (curr <= endLoop) {
          headers.push({
              date: new Date(curr),
              label: curr.getDate(),
              monthLabel: curr.getDate() === 1 || offset === 0 ? curr.toLocaleDateString('pt-BR', { month: 'short' }) : null,
              left: offset * CELL_WIDTH
          });
          curr.setDate(curr.getDate() + 1);
          offset++;
      }
      return headers;
  }, [timelineStart, timelineEnd]);

  // Current Day Line Position
  const todayOffset = (new Date().getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24) * CELL_WIDTH;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-140px)] animate-fade-in">
      
      {/* Header / Toolbar */}
      <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 rounded-t-xl gap-4">
         <div>
             <h3 className="text-lg font-bold text-[#003A70] flex items-center gap-2">
                <Calendar size={20}/> Planejamento de Capacidade
             </h3>
             <p className="text-xs text-gray-500">Visão de alocação FIFO e projeção de entregas</p>
         </div>
         
         <div className="flex flex-wrap items-center gap-4">
            
            {/* Filters */}
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
               <Filter size={14} className="text-gray-400" />
               <select
                  className="text-xs border-none outline-none text-gray-600 bg-transparent font-medium min-w-[120px]"
                  value={filterCoordId}
                  onChange={(e) => { setFilterCoordId(e.target.value); setFilterPersonId('all'); }}
               >
                  <option value="all">Todas Coordenações</option>
                  {coordinations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <div className="w-px h-4 bg-gray-200"></div>
               <select 
                  className="text-xs border-none outline-none text-gray-600 bg-transparent font-medium min-w-[120px]"
                  value={filterPersonId}
                  onChange={(e) => setFilterPersonId(e.target.value)}
               >
                  <option value="all">Todos Pessoas</option>
                  {availablePeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">De:</label>
                    <input 
                        type="date" 
                        className="text-xs border-none outline-none text-gray-600 font-medium bg-transparent"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                </div>
                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                <div className="flex items-center gap-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Até:</label>
                    <input 
                        type="date" 
                        className="text-xs border-none outline-none text-gray-600 font-medium bg-transparent"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 bg-white rounded border border-gray-200 shadow-sm">
                <div className="w-3 h-3 bg-[#003A70] rounded-sm"></div> Concluído
                <div className="w-3 h-3 bg-[#32A6E6] rounded-sm ml-2"></div> Em Execução
                <div className="w-3 h-3 bg-orange-300 rounded-sm ml-2"></div> Projetado
            </div>
         </div>
      </div>

      {/* Chart Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT COLUMN: PEOPLE */}
        <div className="w-[200px] flex-shrink-0 bg-white border-r border-gray-200 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <div className="h-[60px] border-b border-gray-200 bg-gray-50 flex items-center px-4 font-bold text-xs text-gray-500 uppercase tracking-wider">
                Responsável
            </div>
            <div className="overflow-hidden">
                {peopleRows.length === 0 ? (
                    <div className="p-4 text-xs text-gray-400 text-center italic">Nenhuma atividade neste período ou filtro.</div>
                ) : (
                    peopleRows.map((row) => (
                        <div key={row.person.id} className="flex items-center px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors" style={{ height: ROW_HEIGHT }}>
                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold mr-3">
                                {row.person.name.charAt(0)}
                            </div>
                            <div className="truncate">
                                <div className="text-sm font-medium text-gray-700 truncate" title={row.person.name}>{row.person.name}</div>
                                <div className="text-[10px] text-gray-400 truncate">{row.person.role}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* RIGHT COLUMN: TIMELINE */}
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative bg-gray-50/30">
           <div style={{ width: dateHeaders.length * CELL_WIDTH, minWidth: '100%' }}>
               
               {/* Date Header */}
               <div className="sticky top-0 z-10 bg-white border-b border-gray-200 h-[60px] relative">
                   {dateHeaders.map((dh, i) => (
                       <React.Fragment key={i}>
                           {dh.monthLabel && (
                               <div className="absolute top-1 text-[10px] font-bold text-gray-500 uppercase px-1 border-l border-gray-200" style={{ left: dh.left }}>
                                   {dh.monthLabel}
                               </div>
                           )}
                           <div className={`absolute bottom-1 text-[10px] text-center w-[${CELL_WIDTH}px] ${dh.date.getDay() === 0 || dh.date.getDay() === 6 ? 'text-gray-300 bg-gray-50' : 'text-gray-600'}`} style={{ left: dh.left, width: CELL_WIDTH }}>
                               {dh.label}
                           </div>
                           <div className="absolute bottom-0 h-2 w-px bg-gray-200" style={{ left: dh.left }}></div>
                       </React.Fragment>
                   ))}
               </div>

               {/* Grid Lines & Current Day */}
               <div className="absolute inset-0 pointer-events-none z-0">
                   {dateHeaders.map((dh, i) => (
                       <div key={i} className={`absolute top-0 bottom-0 w-px ${dh.date.getDay() === 0 ? 'bg-gray-200' : 'bg-gray-100'}`} style={{ left: dh.left }}></div>
                   ))}
                   {todayOffset >= 0 && (
                       <div className="absolute top-0 bottom-0 w-[2px] bg-red-400 z-10 shadow-[0_0_8px_rgba(248,113,113,0.5)]" style={{ left: todayOffset }}>
                           <div className="absolute -top-1 -left-[3px] w-2 h-2 rounded-full bg-red-500"></div>
                       </div>
                   )}
               </div>

               {/* Tasks Bars */}
               <div className="relative z-10 mt-[60px]" style={{ marginTop: 0 }}> 
                  {peopleRows.map((row) => (
                      <div key={row.person.id} className="relative border-b border-gray-100" style={{ height: ROW_HEIGHT }}>
                          {row.tasks.map(task => {
                              // Determine color
                              let bgClass = 'bg-gray-400';
                              let textClass = 'text-white';
                              if (task.data.status === DemandStatus.CONCLUIDO) bgClass = 'bg-[#003A70]'; // Done
                              else if (task.data.status === DemandStatus.EXECUCAO || task.data.status === DemandStatus.VALIDACAO) bgClass = 'bg-[#32A6E6]'; // Active
                              else if (task.isProjected) bgClass = 'bg-orange-300 border border-orange-400 border-dashed bg-opacity-60 text-orange-900'; // Queue

                              return (
                                  <div
                                      key={task.data.id}
                                      onClick={() => onView(task.data)}
                                      className={`absolute top-[10px] h-[30px] rounded-md shadow-sm flex items-center px-2 text-[10px] font-medium truncate cursor-pointer hover:brightness-95 hover:scale-[1.02] transition-all hover:z-20 hover:shadow-md ${bgClass} ${textClass}`}
                                      style={{ left: task.left, width: task.width }}
                                      title={`${task.data.title}\nStatus: ${task.data.status}\nInício: ${task.start.toLocaleDateString('pt-BR')}\nFim: ${task.end.toLocaleDateString('pt-BR')}\n\nClique para ver histórico completo.`}
                                  >
                                      {task.data.title}
                                  </div>
                              );
                          })}
                      </div>
                  ))}
               </div>

           </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
