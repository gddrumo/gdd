
import React, { useState } from 'react';
import { 
  BarChart2, 
  Lightbulb, 
  CalendarClock, 
  LayoutTemplate, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert,
  User,
  BookOpen,
  Mic,
  Sparkles,
  MousePointerClick,
  FileText,
  Calendar,
  Users
} from 'lucide-react';

interface TutorialProps {
  onNavigate: (viewName: string) => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'user_guide'>('overview');

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
      
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#003A70]/10 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#003A70]/5 to-transparent rounded-bl-full pointer-events-none" />
        <h2 className="text-3xl font-bold text-[#003A70] mb-2">Manual de Bordo GDD</h2>
        <p className="text-gray-600 text-lg leading-relaxed max-w-3xl">
          Bem-vindo ao novo ecossistema de gestão. Utilize as abas abaixo para navegar entre a visão gerencial e o guia operacional.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-2">
         <button 
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-6 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 ${activeTab === 'overview' ? 'border-[#003A70] text-[#003A70] bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
         >
            <LayoutTemplate size={18} /> Visão Geral (Módulos)
         </button>
         <button 
            onClick={() => setActiveTab('user_guide')}
            className={`py-4 px-6 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-all border-b-2 ${activeTab === 'user_guide' ? 'border-[#003A70] text-[#003A70] bg-blue-50/50' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
         >
            <User size={18} /> Guia do Solicitante
         </button>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Module: Indicators */}
            <div 
              onClick={() => onNavigate('Painel de Indicadores')}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer group relative"
            >
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 text-[#003A70] rounded-lg group-hover:bg-[#003A70] group-hover:text-white transition-colors">
                    <BarChart2 size={24} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg group-hover:text-[#003A70] transition-colors">Painel de Indicadores</h3>
               </div>
               <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Focado na visão mensal de <strong>Entradas vs. Saídas</strong>. Utilize este painel para acompanhar o Throughput (vazão) 
                  e a evolução do Lead Time mês a mês.
               </p>
               <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 size={12} className="text-green-500"/> Filtro por Coordenação Responsável
                  </li>
                  <li className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 size={12} className="text-green-500"/> Análise de Atrasos Mensais
                  </li>
               </ul>
               <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-xs font-bold text-[#003A70] opacity-0 group-hover:opacity-100 transition-opacity">
                  Ir para o Painel <ArrowRight size={14} className="ml-2" />
               </div>
            </div>

            {/* Module: Insights */}
            <div 
              onClick={() => onNavigate('Insights de Gestão')}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer group relative"
            >
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Lightbulb size={24} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg group-hover:text-amber-600 transition-colors">Insights de Gestão</h3>
               </div>
               <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Sua central de controle de <strong>Capacidade (Headcount)</strong>. Compare carga horária alocada vs. disponibilidade padrão.
                  Visualize Heatmaps de ocupação semanal.
               </p>
               <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 size={12} className="text-green-500"/> Heatmap Semanal por Pessoa
                  </li>
                  <li className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 size={12} className="text-green-500"/> Lista de Demandas Críticas/Atrasadas
                  </li>
               </ul>
               <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-xs font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver Insights <ArrowRight size={14} className="ml-2" />
               </div>
            </div>

            {/* Module: Planning */}
            <div 
              onClick={() => onNavigate('Planejamento (Gantt)')}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer group relative"
            >
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <CalendarClock size={24} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg group-hover:text-purple-600 transition-colors">Planejamento (Gantt)</h3>
               </div>
               <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Visualização temporal das entregas. O sistema projeta o fim das demandas em Fila baseando-se em uma lógica <strong>FIFO</strong> (First In, First Out) 
                  e no esforço estimado.
               </p>
               <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-xs font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Abrir Planejamento <ArrowRight size={14} className="ml-2" />
               </div>
            </div>

            {/* Module: Kanban */}
            <div 
              onClick={() => onNavigate('Kanban')}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer group relative"
            >
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <LayoutTemplate size={24} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg group-hover:text-emerald-600 transition-colors">Kanban Operacional</h3>
               </div>
               <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  O dia a dia da operação. Arraste os cards para mover status. Grupos de colunas podem ser minimizados para focar no que importa.
               </p>
               <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-xs font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Ir para Kanban <ArrowRight size={14} className="ml-2" />
               </div>
            </div>

          </div>

          {/* Rules & SLA Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="bg-gray-50 p-6 border-b border-gray-200">
                <h3 className="font-bold text-gray-800 text-xl">Regras de Negócio e SLA</h3>
             </div>
             <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                
                {/* Classification Rule */}
                <div>
                   <h4 className="font-bold text-[#003A70] mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#32A6E6] rounded-full"></div>
                      Classificação Automática
                   </h4>
                   <p className="text-sm text-gray-600 mb-4">
                      O sistema analisa palavras-chave no título e descrição para definir o tipo:
                   </p>
                   <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                      <div>
                         <span className="text-xs font-bold text-[#32A6E6] bg-[#32A6E6]/10 px-2 py-0.5 rounded-full">Sistema</span>
                         <p className="text-xs text-gray-500 mt-1">Projetos estruturantes, governança, dashboards, novos fluxos.</p>
                      </div>
                      <div>
                         <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Tarefa</span>
                         <p className="text-xs text-gray-500 mt-1">Rotinas, atualizações simples, correções pontuais.</p>
                      </div>
                   </div>
                </div>

                {/* SLA Rule */}
                <div>
                   <h4 className="font-bold text-red-600 mb-3 flex items-center gap-2">
                      <ShieldAlert size={18} />
                      Política de Atrasos (SLA)
                   </h4>
                   <p className="text-sm text-gray-600 mb-4">
                      Cada combinação de <strong>Categoria + Complexidade</strong> possui um tempo limite (SLA) configurado.
                   </p>
                   <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                      <h5 className="text-xs font-bold text-orange-800 uppercase mb-2 flex items-center gap-2">
                         <AlertTriangle size={14}/>
                         Regra de Justificativa
                      </h5>
                      <p className="text-xs text-orange-800 leading-relaxed">
                         Se uma demanda for concluída após o prazo estipulado, ou se for arquivada/cancelada, o sistema <strong>exigirá uma justificativa</strong> obrigatória.
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: USER GUIDE */}
      {activeTab === 'user_guide' && (
        <div className="space-y-8 animate-fade-in">
            
            {/* Section 1: How to Create */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-[#003A70] mb-6 flex items-center gap-2">
                    <MousePointerClick size={24} /> 
                    Passo a Passo: Criando uma Demanda
                </h3>
                
                <div className="relative">
                    <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100"></div>
                    
                    <div className="space-y-8">
                        <div className="relative pl-12">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-[#003A70] text-white flex items-center justify-center font-bold shadow-sm ring-4 ring-white">1</div>
                            <h4 className="font-bold text-gray-800 mb-1">Acesse o Formulário</h4>
                            <p className="text-sm text-gray-600">
                                No canto superior direito, clique no botão <span className="font-bold text-[#003A70]">"+ Nova Demanda"</span>. 
                                <br/>
                                <span className="text-xs text-gray-400 italic">Dica: Você também pode usar o botão de microfone para ditar sua demanda.</span>
                            </p>
                        </div>

                        <div className="relative pl-12">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-[#32A6E6] text-white flex items-center justify-center font-bold shadow-sm ring-4 ring-white">2</div>
                            <h4 className="font-bold text-gray-800 mb-1">Preenchimento Inteligente</h4>
                            <p className="text-sm text-gray-600 mb-3">
                                Preencha o <strong>Título</strong> e a <strong>Descrição</strong>. 
                            </p>
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-100 flex items-start gap-3">
                                <Sparkles size={16} className="text-purple-500 mt-1 shrink-0" />
                                <div>
                                    <strong className="text-xs text-purple-700 uppercase block mb-1">Use a IA a seu favor</strong>
                                    <p className="text-xs text-purple-600 leading-relaxed">
                                        Após digitar, clique em <strong>"✨ Sugestão IA"</strong>. O sistema irá analisar seu texto e sugerir automaticamente: 
                                        Tipo (Sistema/Tarefa), Complexidade, Esforço estimado e até uma data de entrega baseada na fila do responsável.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="relative pl-12">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold shadow-sm ring-4 ring-white">3</div>
                            <h4 className="font-bold text-gray-800 mb-1">Definição de Responsáveis</h4>
                            <p className="text-sm text-gray-600">
                                Selecione a <strong>Coordenação Técnica</strong> (quem vai executar) e o <strong>Responsável Técnico</strong> (se souber).
                                Indique também sua <strong>Área Solicitante</strong>.
                            </p>
                        </div>

                        <div className="relative pl-12">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold shadow-sm ring-4 ring-white">4</div>
                            <h4 className="font-bold text-gray-800 mb-1">Prazo Combinado (Opcional)</h4>
                            <p className="text-sm text-gray-600">
                                Se existe uma data fatal (deadline) negociada, preencha o campo <strong>Prazo Combinado</strong>.
                                Isso ativará alertas visuais na lista e no Kanban quando a data estiver próxima.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Field Dictionary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-gray-400"/> Glossário de Campos
                    </h3>
                    <ul className="space-y-4">
                        <li className="pb-3 border-b border-gray-50 last:border-0">
                            <span className="text-xs font-bold text-[#003A70] uppercase block mb-1">Título</span>
                            <p className="text-sm text-gray-600">Resumo curto da necessidade. Ex: "Dashboard de Vendas", "Correção erro login".</p>
                        </li>
                        <li className="pb-3 border-b border-gray-50 last:border-0">
                            <span className="text-xs font-bold text-[#003A70] uppercase block mb-1">Descrição</span>
                            <p className="text-sm text-gray-600">Detalhamento do que precisa ser feito. Inclua contexto, links ou regras de negócio.</p>
                        </li>
                        <li className="pb-3 border-b border-gray-50 last:border-0">
                            <span className="text-xs font-bold text-[#003A70] uppercase block mb-1">Coordenação Técnica</span>
                            <p className="text-sm text-gray-600">A equipe especializada que resolverá o problema (ex: Desenvolvimento, Infraestrutura, Dados).</p>
                        </li>
                        <li className="pb-3 border-b border-gray-50 last:border-0">
                            <span className="text-xs font-bold text-[#003A70] uppercase block mb-1">Área Solicitante</span>
                            <p className="text-sm text-gray-600">O departamento que está pedindo a demanda (ex: RH, Marketing, Operações).</p>
                        </li>
                    </ul>
                </div>

                <div className="space-y-6">
                     {/* Voice Feature Highlight */}
                     <div className="bg-[#003A70] p-6 rounded-2xl shadow-md text-white relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <Mic size={20} className="text-red-400" /> 
                            Nova Demanda por Voz
                        </h3>
                        <p className="text-sm text-blue-100 mb-4 leading-relaxed">
                            Está na correria? Clique no ícone de microfone na barra superior. Fale pausadamente o que você precisa.
                        </p>
                        <div className="bg-white/10 rounded-lg p-3 text-xs text-blue-50 italic border border-white/10">
                            "Preciso que o time de Dados crie um relatório mensal de faturamento para a diretoria financeira até o dia 15."
                        </div>
                        <p className="text-xs text-blue-200 mt-2">A IA irá transcrever e preencher o formulário automaticamente.</p>
                     </div>

                     {/* Deadline Rules */}
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <Calendar size={20} className="text-orange-500" /> 
                            Status de Prazos
                        </h3>
                        <div className="space-y-2 mt-3">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">5 dias rest.</span>
                                <span className="text-xs text-gray-500">Dentro do prazo</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">2 dias rest.</span>
                                <span className="text-xs text-gray-500">Atenção (Menos de 3 dias)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Vence Hoje</span>
                                <span className="text-xs text-gray-500">Prioridade Máxima</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">3 dias atraso</span>
                                <span className="text-xs text-gray-500">Crítico</span>
                            </div>
                        </div>
                     </div>
                </div>
            </div>

        </div>
      )}

    </div>
  );
};

export default Tutorial;
