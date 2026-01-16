
import React, { useState } from 'react';
import { Demand, DemandStatus, Person, DemandType, Coordination } from '../types';
import { Minus, Maximize2, AlertCircle, Clock, CheckCircle2, Trash2 } from 'lucide-react';

interface KanbanBoardProps {
  demands: Demand[];
  people: Person[];
  coordinations: Coordination[];
  onStatusChange: (id: string, newStatus: DemandStatus) => void;
  onEdit: (demand: Demand) => void;
  onView: (demand: Demand) => void;
  onArchive: (demand: Demand, justification?: string) => void;
}

// Simplified Column Structure with Grouping Logic
const KANBAN_COLUMNS = [
  { id: 'BACKLOG', label: 'Backlog', statuses: [DemandStatus.ENTRADA, DemandStatus.QUALIFICACAO] },
  { id: 'FILA', label: 'Fila', statuses: [DemandStatus.FILA] },
  { id: 'EXECUCAO', label: 'Execução', statuses: [DemandStatus.EXECUCAO] },
  { id: 'VALIDACAO', label: 'Validação', statuses: [DemandStatus.VALIDACAO] },
  { id: 'CONCLUIDO', label: 'Concluído', statuses: [DemandStatus.CONCLUIDO] }
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ demands, people, coordinations, onStatusChange, onEdit, onView, onArchive }) => {
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [minimizedCols, setMinimizedCols] = useState<string[]>([]);

  const toggleMinimize = (colId: string) => {
     setMinimizedCols(prev =>
        prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
     );
  };

  const getPersonName = (id: string) => people.find(p => p.id === id)?.name || 'Unknown';
  const getCoordinationName = (areaId: string) => {
     return coordinations.find(c => c.id === areaId)?.name || '-';
  };

  const getComplexityColor = (comp: string) => {
    switch (comp) {
      case 'Alta': return 'bg-red-100 text-red-700 border-red-200';
      case 'Média': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getTypeBadge = (type: DemandType) => {
      return type === DemandType.SYSTEM 
        ? <span className="text-[10px] font-bold bg-[#32A6E6]/10 text-[#32A6E6] px-1 rounded border border-[#32A6E6]/20">Sistema</span>
        : <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1 rounded border border-blue-200">Tarefa</span>;
  };

  // SLA Status Logic
  const getSlaStatusStyles = (demand: Demand) => {
      if (!demand.agreedDeadline || demand.status === DemandStatus.CONCLUIDO || demand.status === DemandStatus.CANCELADO) {
          return 'border-gray-200'; // Default
      }

      const deadline = new Date(demand.agreedDeadline).getTime();
      const now = new Date().getTime();
      const diffMs = deadline - now;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays < 0) {
          // Overdue - Red
          return 'border-red-500 border-l-[4px] bg-red-50/30'; 
      } else if (diffDays <= 2) {
          // Warning (less than 2 days) - Amber
          return 'border-amber-500 border-l-[4px] bg-amber-50/30';
      }
      
      return 'border-gray-200';
  };

  const getSlaWarningIcon = (demand: Demand) => {
      if (!demand.agreedDeadline || demand.status === DemandStatus.CONCLUIDO || demand.status === DemandStatus.CANCELADO) return null;
      
      const deadline = new Date(demand.agreedDeadline).getTime();
      const now = new Date().getTime();
      
      if (deadline < now) {
          return <AlertCircle size={12} className="text-red-500" />;
      }
      return null;
  };

  const handleArchiveClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setArchivingId(id);
    setArchiveReason('');
  };

  const handleConfirmArchive = (e: React.MouseEvent, demand: Demand) => {
    e.stopPropagation();
    if (!archiveReason.trim()) return;
    onArchive(demand, archiveReason);
    setArchivingId(null);
    setArchiveReason('');
  };

  const handleCancelArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setArchivingId(null);
    setArchiveReason('');
  };

  // Helper to find visual column for a status
  const getColumnForStatus = (status: DemandStatus) => {
      return KANBAN_COLUMNS.find(c => c.statuses.includes(status));
  };

  const getNextStatus = (current: DemandStatus): DemandStatus => {
    const allStatuses = [
        DemandStatus.ENTRADA, DemandStatus.QUALIFICACAO, DemandStatus.FILA, 
        DemandStatus.EXECUCAO, DemandStatus.VALIDACAO, DemandStatus.CONCLUIDO
    ];
    const idx = allStatuses.indexOf(current);
    return allStatuses[Math.min(idx + 1, allStatuses.length - 1)];
  };

  const getPrevStatus = (current: DemandStatus): DemandStatus => {
    const allStatuses = [
        DemandStatus.ENTRADA, DemandStatus.QUALIFICACAO, DemandStatus.FILA, 
        DemandStatus.EXECUCAO, DemandStatus.VALIDACAO, DemandStatus.CONCLUIDO
    ];
    const idx = allStatuses.indexOf(current);
    return allStatuses[Math.max(idx - 1, 0)];
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-180px)]">
      {KANBAN_COLUMNS.map((column) => {
        // Filter Demands for this Column Group
        const columnDemands = demands.filter(d => column.statuses.includes(d.status));
        const isDoneColumn = column.id === 'CONCLUIDO';
        const isMinimized = minimizedCols.includes(column.id);
        
        if (isMinimized) {
             return (
                 <div 
                    key={column.id} 
                    className="min-w-[50px] w-[50px] rounded-xl bg-gray-200 flex flex-col items-center py-4 cursor-pointer hover:bg-gray-300 transition-colors h-full" 
                    onClick={() => toggleMinimize(column.id)}
                 >
                      <button className="text-gray-500 hover:text-blue-600 mb-4">
                          <Maximize2 size={16} />
                      </button>
                      <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                        {/* Use vertical-rl writing mode and rotate 180 to have text read bottom-to-top (standard spine direction) */}
                        <div className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-gray-600 [writing-mode:vertical-rl] rotate-180 select-none">
                            {column.label} ({columnDemands.length})
                        </div>
                      </div>
                 </div>
             )
        }

        return (
          <div key={column.id} className={`min-w-[280px] w-[300px] rounded-xl flex flex-col h-full transition-all ${isDoneColumn ? 'bg-[#32A6E6]/10' : 'bg-gray-100'}`}>
            <div className={`p-3 rounded-t-xl flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm ${isDoneColumn ? 'bg-[#32A6E6]/20' : 'bg-gray-200/80'}`}>
              <div className="flex items-center gap-2">
                  <h3 className={`font-bold text-sm uppercase tracking-wide ${isDoneColumn ? 'text-[#2a8bc2]' : 'text-gray-700'}`}>{column.label}</h3>
                  <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-600 shadow-sm">
                    {columnDemands.length}
                  </span>
              </div>
              <button onClick={() => toggleMinimize(column.id)} className="text-gray-400 hover:text-gray-700 p-1">
                  <Minus size={16} />
              </button>
            </div>
            <div className="p-2 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {columnDemands.map(demand => {
                // CHECK IF THIS CARD IS BEING ARCHIVED
                if (archivingId === demand.id) {
                  return (
                    <div 
                      key={demand.id}
                      className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200 animate-fade-in cursor-default"
                      onClick={(e) => e.stopPropagation()}
                    >
                       <h4 className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-2">
                          Confirmar Arquivamento
                       </h4>
                       <p className="text-[10px] text-gray-600 mb-2">Justificativa obrigatória:</p>
                       <textarea 
                          className="w-full p-2 text-xs border border-red-200 rounded bg-white focus:outline-none focus:border-red-400 mb-2"
                          rows={3}
                          placeholder="Motivo do cancelamento..."
                          value={archiveReason}
                          onChange={(e) => setArchiveReason(e.target.value)}
                          autoFocus
                       />
                       <div className="flex justify-end gap-2">
                          <button 
                            onClick={handleCancelArchive}
                            className="px-2 py-1 bg-white border border-gray-300 text-gray-600 rounded text-xs hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={(e) => handleConfirmArchive(e, demand)}
                            disabled={!archiveReason.trim()}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                          >
                            Confirmar
                          </button>
                       </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={demand.id}
                    onClick={() => onView(demand)}
                    className={`bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-all group relative cursor-pointer ${getSlaStatusStyles(demand)}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1">
                          {getTypeBadge(demand.type)}
                          <span className="text-xs font-mono text-gray-400">#{demand.id}</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        {getSlaWarningIcon(demand)}
                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${getComplexityColor(demand.complexity)}`}>
                          {demand.complexity}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons Overlay */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(demand); }} className="p-1 bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 rounded shadow-sm" title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button onClick={(e) => handleArchiveClick(e, demand.id)} className="p-1 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded shadow-sm" title="Arquivar/Cancelar">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                    </div>

                    <h4 className="text-sm font-semibold text-gray-800 mb-1 leading-snug">{demand.title}</h4>
                    
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2 mt-2 mb-2">
                        <div>
                            <span className="text-[10px] text-gray-400 block uppercase">Entrada</span>
                            <span className="text-[10px] font-medium text-gray-600">{new Date(demand.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-400 block uppercase">Solicitante</span>
                            <span className="text-[10px] font-medium text-gray-600 truncate block" title={demand.requesterName}>{demand.requesterName || '-'}</span>
                        </div>
                    </div>

                    {/* Delivery Summary - VISUALIZAÇÃO OBRIGATÓRIA */}
                    {demand.status === DemandStatus.CONCLUIDO && demand.deliverySummary && (
                      <div className="mt-2 mb-2 p-2 bg-green-50 border border-green-100 rounded text-[10px] text-green-800">
                         <div className="flex items-center gap-1 mb-1 text-[9px] font-bold text-green-700 uppercase">
                            <CheckCircle2 size={10}/> Resumo da Entrega
                         </div>
                         <p className="leading-snug">{demand.deliverySummary}</p>
                      </div>
                    )}

                    {/* Cancellation Reason - VISUALIZAÇÃO */}
                    {demand.status === DemandStatus.CANCELADO && demand.cancellationReason && (
                      <div className="mt-2 mb-2 p-2 bg-red-50 border border-red-100 rounded text-[10px] text-red-800">
                         <div className="flex items-center gap-1 mb-1 text-[9px] font-bold text-red-700 uppercase">
                            <Trash2 size={10}/> Motivo Cancelamento
                         </div>
                         <p className="leading-snug">{demand.cancellationReason}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <div className="flex flex-col">
                          <span className="text-[9px] text-gray-400 uppercase">Coord. Técnica</span>
                          <span className="text-[10px] font-medium text-[#003A70] truncate max-w-[120px]" title={getCoordinationName(demand.areaId)}>
                              {getCoordinationName(demand.areaId)}
                          </span>
                      </div>
                      <div className="flex items-center gap-1">
                          <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[9px] font-bold" title={getPersonName(demand.personId)}>
                              {getPersonName(demand.personId).charAt(0)}
                          </div>
                      </div>
                    </div>
                    
                    {/* Simple Drag Controls */}
                    <div className="mt-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onStatusChange(demand.id, getPrevStatus(demand.status)); }}
                            disabled={demand.status === DemandStatus.ENTRADA}
                            className={`text-xs px-2 py-1 rounded hover:bg-gray-100 ${demand.status === DemandStatus.ENTRADA ? 'invisible' : 'text-gray-500'}`}
                          >
                            ← Voltar
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onStatusChange(demand.id, getNextStatus(demand.status)); }}
                            disabled={demand.status === DemandStatus.CONCLUIDO}
                            className={`text-xs px-2 py-1 rounded hover:bg-gray-100 ${demand.status === DemandStatus.CONCLUIDO ? 'invisible' : 'text-gray-500'}`}
                          >
                            Avançar →
                        </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
