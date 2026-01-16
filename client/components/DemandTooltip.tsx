
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Demand } from '../types';
import { CheckCircle2 } from 'lucide-react';

interface DemandTooltipProps {
  demand: Demand;
  areaName: string;
  personName: string;
  children: React.ReactElement;
}

const DemandTooltip: React.FC<DemandTooltipProps> = ({ demand, areaName, personName, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setCoords({ 
      top: rect.bottom + window.scrollY + 5, 
      left: rect.left + window.scrollX
    });
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(true), 400);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const tooltipContent = isVisible && createPortal(
    <div 
      className="fixed z-[9999] w-72 bg-white rounded-lg shadow-xl border border-[#003A70]/10 p-4 pointer-events-none animate-fade-in"
      style={{ top: coords.top, left: coords.left }}
    >
      <div className="flex flex-col gap-2">
        <div className="border-b border-gray-100 pb-2">
            <span className="text-[10px] font-bold text-[#32A6E6] uppercase tracking-wider">Detalhes da Demanda</span>
            <h4 className="font-bold text-sm text-[#003A70] leading-tight mt-1">{demand.title}</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
                <span className="block text-[10px] text-gray-400 uppercase">Entrada</span>
                <span className="text-xs font-medium text-gray-700">{new Date(demand.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
             <div>
                <span className="block text-[10px] text-gray-400 uppercase">Tipo</span>
                <span className="text-xs font-medium text-gray-700">{demand.type}</span>
            </div>
        </div>

        <div className="mt-1">
            <span className="block text-[10px] text-gray-400 uppercase">Solicitante</span>
            <span className="text-xs font-medium text-gray-700">{demand.requesterName || '-'}</span>
        </div>

        <div className="mt-1">
            <span className="block text-[10px] text-gray-400 uppercase">Coord. Responsável</span>
            <span className="text-xs font-medium text-gray-700">{areaName}</span>
        </div>
        
        {demand.description && (
            <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-[10px] text-gray-500 line-clamp-3 italic">"{demand.description}"</p>
            </div>
        )}

        {demand.deliverySummary && (
            <div className="mt-2 pt-2 border-t border-green-100 bg-green-50/50 -mx-4 px-4 pb-2 mb-[-1rem]">
                <div className="flex items-center gap-1 mb-1">
                    <CheckCircle2 size={10} className="text-green-600"/>
                    <span className="text-[10px] font-bold text-green-700 uppercase">Resumo da Entrega</span>
                </div>
                <p className="text-[10px] text-green-800 leading-tight">{demand.deliverySummary}</p>
            </div>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
        className="w-full"
    >
      {children}
      {tooltipContent}
    </div>
  );
};

export default DemandTooltip;
