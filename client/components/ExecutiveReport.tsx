
import React, { useState, useMemo } from 'react';
import { Demand, DemandStatus, Coordination, DemandType } from '../types';
import {
  Filter,
  CheckSquare,
  Square,
  FileText,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Share2,
  Copy
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip
} from 'recharts';
import html2canvas from 'html2canvas';

interface ExecutiveReportProps {
  demands: Demand[];
  coordinations: Coordination[];
}

const COLORS = ['#003A70', '#32A6E6', '#F58220', '#00A99D'];

const ExecutiveReport: React.FC<ExecutiveReportProps> = ({ demands, coordinations }) => {
  // 1. Filter States (Default to Current Week)
  const [dateRange, setDateRange] = useState(() => {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
    const firstDay = new Date(curr.setDate(first));
    const lastDay = new Date(curr.setDate(curr.getDate() + 6));
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  });
  const [selectedCoordId, setSelectedCoordId] = useState('all');
  const [reportComment, setReportComment] = useState('');
  
  // State for Image Generation
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // 2. Data Filtering (Only Completed)
  const availableDemands = useMemo(() => {
    const start = new Date(dateRange.start);
    start.setHours(0,0,0,0);
    const end = new Date(dateRange.end);
    end.setHours(23,59,59,999);

    return demands.filter(d => {
      if (d.status !== DemandStatus.CONCLUIDO) return false;
      if (!d.finishedAt) return false;
      
      const finishDate = new Date(d.finishedAt);
      const inDateRange = finishDate >= start && finishDate <= end;
      const inCoord = selectedCoordId === 'all' || d.areaId === selectedCoordId;

      return inDateRange && inCoord;
    }).sort((a, b) => new Date(b.finishedAt!).getTime() - new Date(a.finishedAt!).getTime());
  }, [demands, dateRange, selectedCoordId]);

  // 3. Selection State (Default Select All)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Effect to auto-select items when filter changes
  React.useEffect(() => {
    setSelectedIds(new Set(availableDemands.map(d => d.id)));
  }, [availableDemands]);

  const toggleDemand = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === availableDemands.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableDemands.map(d => d.id)));
    }
  };

  // 4. Report Aggregations
  const reportData = useMemo(() => {
    const items = availableDemands.filter(d => selectedIds.has(d.id));
    
    const total = items.length;
    const totalEffort = items.reduce((acc, d) => acc + (d.effort || 0), 0);
    const lateItems = items.filter(d => d.delayJustification).length;
    const onTimePercentage = total > 0 ? ((total - lateItems) / total) * 100 : 100;

    const byType = [
      { name: 'Sistemas', value: items.filter(d => d.type === DemandType.SYSTEM).length },
      { name: 'Tarefas', value: items.filter(d => d.type === DemandType.TASK).length }
    ];

    return { items, total, totalEffort, lateItems, onTimePercentage, byType };
  }, [availableDemands, selectedIds]);

  // 5. Generator Functions
  const generateReportText = () => {
    const startStr = new Date(dateRange.start).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
    const endStr = new Date(dateRange.end).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});

    // Cabeçalho
    let text = `🗓️ *RESUMO SEMANAL* | ${startStr} - ${endStr}\n\n`;
    
    // Seção de Indicadores
    text += `📊 *INDICADORES*\n`;
    text += `✅ Concluídas: *${reportData.total}*\n`;
    text += `⌚ Esforço Total: *${reportData.totalEffort}h*\n`;
    text += `🎯 SLA (Prazo): *${reportData.onTimePercentage.toFixed(0)}%*\n\n`;
    
    // Comentários Gerenciais
    if (reportComment.trim()) {
        text += `💬 *OBSERVAÇÕES*\n_${reportComment}_\n\n`;
    }

    // Lista de Entregas
    text += `📋 *ENTREGAS REALIZADAS*\n`;
    reportData.items.forEach(item => {
        const coordName = coordinations.find(c => c.id === item.areaId)?.name || 'N/A';
        const isLate = !!item.delayJustification;
        const statusIcon = isLate ? '⚠️' : '🔹';

        text += `\n${statusIcon} *${item.title.trim()}*\n`;
        text += `   📂 ${coordName}  |  🕒 ${item.effort}h\n`;
        
        if (item.deliverySummary) {
            text += `   📝 _${item.deliverySummary.trim()}_\n`;
        }
    });

    if (reportData.lateItems > 0) {
        text += `\n⚠️ *ATENÇÃO*: ${reportData.lateItems} entregas fora do prazo.\n`;
    }

    text += `\n_Enviado via GDD 2.0_`;
    return text;
  };

  const openWhatsAppWeb = () => {
     if (reportData.total === 0) {
        alert("Selecione pelo menos uma demanda concluída na lista para gerar o texto.");
        return;
    }
    const text = generateReportText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareImage = async () => {
    if (reportData.total === 0) {
      alert("Selecione demandas para gerar a imagem.");
      return;
    }

    try {
      setIsGeneratingImage(true);
      const element = document.getElementById('printable-report');
      if (!element) throw new Error("Elemento do relatório não encontrado");

      // Capture with html2canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], 'resumo-semanal.png', { type: 'image/png' });
        const text = generateReportText();

        // 1. Try Native Sharing (Mobile/Supported Browsers)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
             await navigator.share({
               files: [file],
               title: 'Resumo Semanal GDD',
               text: text
             });
             setIsGeneratingImage(false);
             return; 
          } catch (err) {
             console.warn("Share API cancelled or failed", err);
             // Fallback to clipboard method below if share fails/cancelled
          }
        }

        // 2. Desktop Fallback: Copy Image to Clipboard + Open WhatsApp
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          
          // Open WhatsApp with Text
          const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
          window.open(url, '_blank');
          
          alert("📸 Imagem copiada para a área de transferência!\n\nNo WhatsApp, pressione Ctrl+V para colar a imagem junto com o texto.");
        } catch (err) {
          console.error("Clipboard failed", err);
          // 3. Last Resort: Download Image
          const link = document.createElement('a');
          link.download = 'resumo-semanal.png';
          link.href = canvas.toDataURL();
          link.click();
          
          const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
          window.open(url, '_blank');

          alert("Imagem baixada! Anexe-a manualmente no WhatsApp.");
        }
        
        setIsGeneratingImage(false);
      }, 'image/png');

    } catch (error) {
      console.error("Error generating image:", error);
      alert("Erro ao gerar imagem do relatório.");
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-fade-in">
      
      <div className="print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
         <div>
            <h2 className="text-xl font-bold text-[#003A70] flex items-center gap-2">
               <FileText size={24} /> Report Executivo
            </h2>
            <p className="text-sm text-gray-500 mt-1">Selecione as entregas e compartilhe o resumo visual.</p>
         </div>
         <div className="flex gap-2 flex-wrap">
             {/* Only Text Button */}
             <button 
                onClick={openWhatsAppWeb}
                className="flex items-center gap-2 bg-white border border-green-500 text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm active:scale-95"
                title="Envia apenas o texto formatado"
             >
                 <MessageSquare size={18} /> Apenas Texto
             </button>

             {/* Image Share Button */}
             <button 
                onClick={handleShareImage}
                disabled={isGeneratingImage}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-wait"
                title="Gera uma imagem do relatório e prepara envio"
             >
                 {isGeneratingImage ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                 {isGeneratingImage ? 'Gerando...' : 'Imagem + Whats'}
             </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
         
         {/* LEFT: FILTERS & SELECTION (Hidden on Print) */}
         <div className="space-y-6 print:hidden">
             {/* Filters */}
             <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
                <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase">
                   <Filter size={16} /> Configurar Período
                </h3>
                
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500">Data de Conclusão</label>
                   <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#003A70]"
                        value={dateRange.start}
                        onChange={e => setDateRange({...dateRange, start: e.target.value})}
                      />
                      <span className="text-gray-400 text-xs">até</span>
                      <input 
                        type="date" 
                        className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#003A70]"
                        value={dateRange.end}
                        onChange={e => setDateRange({...dateRange, end: e.target.value})}
                      />
                   </div>
                </div>

                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500">Coordenação Técnica</label>
                   <select
                      className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#003A70]"
                      value={selectedCoordId}
                      onChange={e => setSelectedCoordId(e.target.value)}
                   >
                      <option value="all">Todas</option>
                      {coordinations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
             </div>

             {/* Comments Input */}
             <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
                <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase">
                   <MessageSquare size={16} /> Comentários Gerais
                </h3>
                <textarea 
                    className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#003A70] min-h-[100px] resize-none"
                    placeholder="Digite aqui um resumo qualitativo das entregas, pontos de atenção ou destaques da semana..."
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                />
             </div>

             {/* Selection List */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[400px]">
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center rounded-t-xl">
                   <h3 className="font-bold text-gray-700 text-sm">Itens Disponíveis ({availableDemands.length})</h3>
                   <button 
                     onClick={toggleAll}
                     className="text-xs text-blue-600 hover:underline font-medium"
                   >
                     {selectedIds.size === availableDemands.length ? 'Desmarcar Tudo' : 'Marcar Tudo'}
                   </button>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 p-0">
                   {availableDemands.length === 0 ? (
                       <div className="p-8 text-center text-gray-400 text-xs">
                           Nenhum item "Concluído" encontrado neste período. Ajuste as datas acima.
                       </div>
                   ) : (
                       availableDemands.map(d => (
                           <div 
                              key={d.id} 
                              onClick={() => toggleDemand(d.id)}
                              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors flex gap-3 items-start ${selectedIds.has(d.id) ? 'bg-blue-50/30' : ''}`}
                           >
                              <div className={`mt-0.5 ${selectedIds.has(d.id) ? 'text-[#003A70]' : 'text-gray-300'}`}>
                                  {selectedIds.has(d.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                              </div>
                              <div>
                                  <div className="text-xs font-bold text-gray-700 line-clamp-2">{d.title}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] text-gray-500">{new Date(d.finishedAt!).toLocaleDateString('pt-BR')}</span>
                                      <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500">{d.effort}h</span>
                                      {d.delayJustification && <span className="text-[10px] text-red-500 font-bold">Atraso</span>}
                                  </div>
                              </div>
                           </div>
                       ))
                   )}
                </div>
                <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center rounded-b-xl">
                    {selectedIds.size} itens selecionados para o relatório
                </div>
             </div>
         </div>

         {/* RIGHT: PREVIEW (This part prints) */}
         <div className="lg:col-span-2 print:w-full">
             <div className="bg-white border border-gray-200 shadow-sm p-8 md:p-12 min-h-[800px] print:shadow-none print:border-none print:p-0" id="printable-report">
                
                {/* Report Header */}
                <div className="flex justify-between items-end border-b-2 border-[#003A70] pb-4 mb-8">
                    <div>
                       <h1 className="text-2xl font-bold text-[#003A70] uppercase tracking-tight">Resumo de Entregas</h1>
                       <p className="text-gray-500 text-sm">Report Semanal de Performance</p>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Período</div>
                        <div className="text-sm font-bold text-gray-800">
                            {new Date(dateRange.start).toLocaleDateString('pt-BR')} a {new Date(dateRange.end).toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                </div>

                {reportData.total === 0 ? (
                    <div className="text-center py-20 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-400">
                        <div className="mb-4">👋 Olá!</div>
                        Selecione demandas concluídas no menu à esquerda para visualizar o relatório aqui.
                    </div>
                ) : (
                    <>
                        {/* Metrics Row */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-[#003A70]">
                                <span className="block text-[10px] font-bold text-gray-500 uppercase">Entregas</span>
                                <span className="text-2xl font-bold text-[#003A70]">{reportData.total}</span>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-[#32A6E6]">
                                <span className="block text-[10px] font-bold text-gray-500 uppercase">Horas Produtivas</span>
                                <span className="text-2xl font-bold text-[#32A6E6]">{reportData.totalEffort}h</span>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-green-500">
                                <span className="block text-[10px] font-bold text-gray-500 uppercase">SLA (No Prazo)</span>
                                <span className="text-2xl font-bold text-green-600">{reportData.onTimePercentage.toFixed(0)}%</span>
                            </div>
                        </div>

                        {/* Comment Section (Only if exists) */}
                        {reportComment.trim() && (
                            <div className="mb-8 p-6 bg-yellow-50/50 rounded-lg border border-yellow-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare size={16} className="text-[#003A70]"/>
                                    <h4 className="text-xs font-bold text-[#003A70] uppercase">Destaques / Observações</h4>
                                </div>
                                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {reportComment}
                                </div>
                            </div>
                        )}

                        {/* Visuals Row */}
                        <div className="flex gap-6 mb-8 h-[200px]">
                             <div className="flex-1 border border-gray-100 rounded-lg p-4 flex flex-col">
                                 <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2 text-center">Mix de Entregas</h4>
                                 <div className="flex-1 relative">
                                     <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={reportData.byType}
                                                innerRadius={35}
                                                outerRadius={60}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {reportData.byType.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Legend iconSize={8} wrapperStyle={{fontSize: '10px'}} />
                                            <Tooltip />
                                        </PieChart>
                                     </ResponsiveContainer>
                                 </div>
                             </div>
                             <div className="flex-1 bg-gray-50 rounded-lg p-6 flex flex-col justify-center items-center text-center">
                                 <div className="mb-2">
                                    <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2"/>
                                    <div className="text-lg font-bold text-gray-700">{reportData.total - reportData.lateItems}</div>
                                    <div className="text-[10px] text-gray-500 uppercase">Entregas Pontuais</div>
                                 </div>
                                 <div className="w-full h-px bg-gray-200 my-2"></div>
                                 <div>
                                    <div className="text-lg font-bold text-red-500">{reportData.lateItems}</div>
                                    <div className="text-[10px] text-red-400 uppercase">Com Atraso</div>
                                 </div>
                             </div>
                        </div>

                        {/* Detailed List */}
                        <div>
                            <h4 className="text-xs font-bold text-[#003A70] uppercase border-b border-gray-200 pb-2 mb-3">Detalhamento</h4>
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-100 text-gray-600 font-bold">
                                    <tr>
                                        <th className="p-2 rounded-l">Data</th>
                                        <th className="p-2">Demanda / Solicitante</th>
                                        <th className="p-2">Área Técnica</th>
                                        <th className="p-2 text-right rounded-r">Esforço</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {reportData.items.map(item => (
                                        <tr key={item.id}>
                                            <td className="p-2 text-gray-500 align-top">
                                                {new Date(item.finishedAt!).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                                            </td>
                                            <td className="p-2 align-top">
                                                <div className="font-bold text-gray-800">{item.title}</div>
                                                <div className="text-gray-500 text-[10px] mb-1">Solicitante: {item.requesterName}</div>
                                                
                                                {item.deliverySummary && (
                                                   <div className="text-[10px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100 mb-1">
                                                      <span className="font-semibold text-gray-700">Entrega:</span> {item.deliverySummary}
                                                   </div>
                                                )}

                                                {item.delayJustification && (
                                                    <div className="bg-red-50 text-red-600 px-2 py-1 rounded text-[9px] inline-block border border-red-100">
                                                        ⚠️ Atraso: {item.delayJustification}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-2 text-gray-600 align-top">
                                                {coordinations.find(c => c.id === item.areaId)?.name}
                                            </td>
                                            <td className="p-2 text-right font-mono text-gray-600 align-top">
                                                {item.effort}h
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                
                {/* Footer for Print */}
                <div className="mt-10 pt-4 border-t border-gray-200 flex justify-between text-[9px] text-gray-400">
                     <span>GDD 2.0 - Gestor de Demandas</span>
                     <span>Impresso em {new Date().toLocaleDateString()}</span>
                </div>
             </div>
         </div>

      </div>
    </div>
  );
};

export default ExecutiveReport;
