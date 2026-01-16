
import React, { useState, useMemo } from 'react';
import { Demand, Area, Coordination, Person, DemandStatus, DemandType, UserRole } from '../types';
import { Trash2, Archive, ArrowUpDown, ArrowUp, ArrowDown, Clock, Star, RotateCcw } from 'lucide-react';

interface DemandListProps {
  demands: Demand[];
  areas: Area[]; // Requester Areas (Solicitantes)
  coordinations: Coordination[]; // Technical Coordinations (Executores)
  people: Person[];
  onEdit: (demand: Demand) => void;
  onView: (demand: Demand) => void;
  onArchive: (demand: Demand) => void;
  userRole: UserRole;
  onTogglePriority?: (demand: Demand) => void;
  onDelete?: (demand: Demand) => void;
  onRestore?: (demand: Demand) => void;
  isArchivedView?: boolean;
}

type SortKey = 'createdAt' | 'requesterName' | 'requesterAreaId' | 'title' | 'areaId' | 'personId' | 'category' | 'type' | 'status' | 'agreedDeadline' | 'daysRemaining' | 'priority';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

// Sub-component to handle Row Logic
const DemandListRow: React.FC<{
  demand: Demand;
  areas: Area[];
  coordinations: Coordination[];
  people: Person[];
  onEdit: (d: Demand) => void;
  onView: (d: Demand) => void;
  onArchive: (d: Demand) => void;
  userRole: UserRole;
  onTogglePriority?: (d: Demand) => void;
  onDelete?: (d: Demand) => void;
  onRestore?: (d: Demand) => void;
  isArchivedView?: boolean;
}> = ({ demand, areas, coordinations, people, onEdit, onView, onArchive, userRole, onTogglePriority, onDelete, onRestore, isArchivedView }) => {
  
  const getRequesterAreaName = (id: string) => areas.find(a => a.id === id)?.name || '-';
  const getCoordinationName = (id: string) => coordinations.find(a => a.id === id)?.name || '-';
  const getPersonName = (id: string) => people.find(p => p.id === id)?.name || '-';

  const getStatusBadge = (status: string) => {
    if (status === DemandStatus.CONCLUIDO) {
       return <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#32A6E6]/20 text-[#2a8bc2]">{status}</span>;
    }
    const styles: Record<string, string> = {
      [DemandStatus.ENTRADA]: 'bg-gray-100 text-gray-800',
      [DemandStatus.QUALIFICACAO]: 'bg-indigo-100 text-indigo-800',
      [DemandStatus.FILA]: 'bg-yellow-100 text-yellow-800',
      [DemandStatus.EXECUCAO]: 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',
      [DemandStatus.VALIDACAO]: 'bg-purple-100 text-purple-800',
      [DemandStatus.CANCELADO]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  const getTypeBadge = (type: DemandType) => {
      return type === DemandType.SYSTEM 
        ? <span className="text-[10px] font-bold text-[#32A6E6] bg-[#32A6E6]/10 px-2 py-0.5 rounded-full">Sistema</span>
        : <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Tarefa</span>;
  };

  // Deadline Status Calculation
  const deadlineStatus = useMemo(() => {
      if (demand.status === DemandStatus.CONCLUIDO || demand.status === DemandStatus.CANCELADO) return null;
      if (!demand.agreedDeadline) return <span className="text-gray-300 text-[10px]">-</span>;

      const target = new Date(demand.agreedDeadline).getTime();
      const now = new Date().getTime();
      const diffMs = target - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
          return <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">{Math.abs(diffDays)} dias atraso</span>;
      } else if (diffDays === 0) {
          return <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Vence Hoje</span>;
      } else {
          return <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">{diffDays} dias rest.</span>;
      }
  }, [demand]);

  return (
    <tr 
      onClick={() => onView(demand)}
      className="hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0 group"
    >
      {/* Priority Toggle */}
      <td className="pl-4 py-4 whitespace-nowrap w-8">
         <button 
            onClick={(e) => { e.stopPropagation(); onTogglePriority && onTogglePriority(demand); }}
            className={`p-1 rounded transition-colors hover:bg-gray-100 ${demand.isPriority ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-200'}`}
            title="Marcar como Prioritário"
            disabled={!onTogglePriority}
         >
            <Star size={16} fill={demand.isPriority ? "currentColor" : "none"} />
         </button>
      </td>

      {/* 1. Data de Entrada */}
      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
        {new Date(demand.createdAt).toLocaleDateString('pt-BR')}
      </td>

      {/* 2. Nome do Solicitante */}
      <td className="px-4 py-4 text-xs text-gray-800 font-medium max-w-[120px] truncate" title={demand.requesterName}>
        {demand.requesterName || '-'}
      </td>

      {/* 3. Área Solicitante */}
      <td className="px-4 py-4 text-xs text-gray-600 max-w-[120px] truncate" title={getRequesterAreaName(demand.requesterAreaId)}>
        {getRequesterAreaName(demand.requesterAreaId)}
      </td>

      {/* 4. Título */}
      <td className="px-4 py-4">
        <div className="text-sm font-semibold text-[#003A70] line-clamp-1" title={demand.title}>
          {demand.title}
        </div>
      </td>

      {/* 5. Coord. Resp. (Área Técnica) */}
      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600 max-w-[120px] truncate" title={getCoordinationName(demand.areaId)}>
        {getCoordinationName(demand.areaId)}
      </td>

      {/* 6. Responsável */}
      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600 flex items-center gap-2">
         <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600">
            {getPersonName(demand.personId).charAt(0)}
         </div>
         <span className="max-w-[100px] truncate" title={getPersonName(demand.personId)}>{getPersonName(demand.personId)}</span>
      </td>

      {/* 7. Prazo Combinado */}
      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
         {demand.agreedDeadline ? (
            <div className="flex flex-col">
                <span className="text-[#003A70] font-medium">
                    {new Date(demand.agreedDeadline).toLocaleDateString('pt-BR')}
                </span>
            </div>
         ) : (
            <span className="text-gray-300">-</span>
         )}
      </td>

      {/* 8. Status Prazo (New) */}
      <td className="px-4 py-4 whitespace-nowrap">
          {deadlineStatus}
      </td>

      {/* 9. Tipo (Sistema / Tarefa) & Status */}
      <td className="px-4 py-4 whitespace-nowrap">
         <div className="flex flex-col gap-1">
            {getTypeBadge(demand.type)}
            {getStatusBadge(demand.status)}
         </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-4 whitespace-nowrap text-right">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
            {isArchivedView ? (
              /* Archived View: Show Restore and Delete buttons */
              <>
                {userRole === 'TIME' && onRestore && (
                  <button
                      onClick={(e) => { e.stopPropagation(); onRestore(demand); }}
                      className="text-green-600 hover:text-green-900 bg-green-50 p-2 rounded hover:bg-green-100 transition-colors shadow-sm"
                      title="Restaurar"
                  >
                      <RotateCcw size={16} />
                  </button>
                )}
                {userRole === 'TIME' && onDelete && (
                  <button
                      onClick={(e) => { e.stopPropagation(); onDelete(demand); }}
                      className="text-white bg-red-500 hover:bg-red-600 p-2 rounded shadow-sm transition-colors"
                      title="Excluir Permanentemente"
                  >
                      <Trash2 size={16} />
                  </button>
                )}
              </>
            ) : (
              /* Normal View: Show Edit and Archive buttons */
              <>
                {/* Edit Button: Only Time can Edit. Gestao Views. */}
                {userRole === 'TIME' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(demand); }}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded hover:bg-indigo-100 transition-colors shadow-sm"
                        title="Editar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                )}
                {/* Archive Button: Only Time can Archive */}
                {userRole === 'TIME' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onArchive(demand); }}
                        className="text-white bg-red-500 hover:bg-red-600 p-2 rounded shadow-sm transition-colors"
                        title="Cancelar / Arquivar (Requer Justificativa)"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
              </>
            )}
          </div>
      </td>
    </tr>
  );
};

const DemandList: React.FC<DemandListProps> = ({ demands, areas, coordinations, people, onEdit, onView, onArchive, userRole, onTogglePriority, onDelete, onRestore, isArchivedView }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedDemands = useMemo(() => {
    const sorted = [...demands];

    // Helper to get comparable value
    const getValue = (d: Demand, key: SortKey) => {
      switch (key) {
        case 'createdAt': return new Date(d.createdAt).getTime();
        case 'requesterAreaId': return areas.find(a => a.id === d.requesterAreaId)?.name || '';
        case 'areaId': return coordinations.find(c => c.id === d.areaId)?.name || '';
        case 'personId': return people.find(p => p.id === d.personId)?.name || '';
        case 'status': return d.status;
        case 'type': return d.type;
        case 'category': return d.category;
        case 'requesterName': return d.requesterName;
        case 'title': return d.title;
        case 'agreedDeadline': return d.agreedDeadline ? new Date(d.agreedDeadline).getTime() : 0;
        case 'daysRemaining': {
            if (!d.agreedDeadline || d.status === DemandStatus.CONCLUIDO) return 9999999999999;
            return new Date(d.agreedDeadline).getTime() - Date.now();
        }
        case 'priority': return d.isPriority ? 1 : 0;
        default: return '';
      }
    };

    sorted.sort((a, b) => {
      const valA = getValue(a, sortConfig.key);
      const valB = getValue(b, sortConfig.key);

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [demands, sortConfig, areas, coordinations, people]);

  const SortIcon = ({ active }: { active: boolean }) => {
    if (!active) return <ArrowUpDown size={12} className="opacity-30 ml-1" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={12} className="text-[#003A70] ml-1" /> 
      : <ArrowDown size={12} className="text-[#003A70] ml-1" />;
  };

  const SortableHeader = ({ label, sortKey, widthClass }: { label: string, sortKey: SortKey, widthClass?: string }) => (
    <th 
      className={`px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group select-none ${widthClass || ''}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center">
        {label}
        <SortIcon active={sortConfig.key === sortKey} />
      </div>
    </th>
  );

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200 animate-fade-in">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="pl-4 py-3 w-8 cursor-pointer" onClick={() => handleSort('priority')}>
                 <Star size={14} className={sortConfig.key === 'priority' ? 'text-[#003A70]' : 'text-gray-400'} />
              </th>
              <SortableHeader label="Entrada" sortKey="createdAt" />
              <SortableHeader label="Solicitante" sortKey="requesterName" />
              <SortableHeader label="Área Solicitante" sortKey="requesterAreaId" />
              <SortableHeader label="Título" sortKey="title" widthClass="w-64" />
              <SortableHeader label="Coord. Resp." sortKey="areaId" />
              <SortableHeader label="Responsável" sortKey="personId" />
              <SortableHeader label="Prazo Comb." sortKey="agreedDeadline" />
              <SortableHeader label="Vencimento" sortKey="daysRemaining" />
              <SortableHeader label="Tipo/Status" sortKey="type" />
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedDemands.map((demand) => (
              <DemandListRow
                key={demand.id}
                demand={demand}
                areas={areas}
                coordinations={coordinations}
                people={people}
                onEdit={onEdit}
                onView={onView}
                onArchive={onArchive}
                userRole={userRole}
                onTogglePriority={onTogglePriority}
                onDelete={onDelete}
                onRestore={onRestore}
                isArchivedView={isArchivedView}
              />
            ))}
            {sortedDemands.length === 0 && (
               <tr>
                 <td colSpan={11} className="px-6 py-12 text-center text-gray-400 text-sm">
                   <div className="flex flex-col items-center">
                      <Archive className="mb-2 opacity-20" size={48} />
                      Nenhuma demanda encontrada.
                   </div>
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DemandList;
