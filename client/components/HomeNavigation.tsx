
import React from 'react';
import { 
  LayoutTemplate, 
  List, 
  CalendarClock, 
  Lightbulb, 
  BarChart2, 
  FileText, 
  Smartphone, 
  Archive, 
  Settings, 
  BookOpen, 
  ArrowRight
} from 'lucide-react';

interface HomeNavigationProps {
  onNavigate: (view: any) => void;
}

const HomeNavigation: React.FC<HomeNavigationProps> = ({ onNavigate }) => {
  
  const modules = [
    {
      title: "Tutorial & Guia",
      description: "Aprenda como utilizar o sistema e verifique as regras de SLA.",
      view: "Tutorial",
      icon: BookOpen,
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
      hover: "group-hover:text-indigo-700"
    },
    {
      title: "Kanban Operacional",
      description: "Gestão visual do fluxo de trabalho. Arraste cards e mova status.",
      view: "Kanban",
      icon: LayoutTemplate,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
      hover: "group-hover:text-emerald-700"
    },
    {
      title: "Lista de Demandas",
      description: "Visão tabular detalhada com filtros e ordenação avançada.",
      view: "Lista",
      icon: List,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      hover: "group-hover:text-blue-700"
    },
    {
      title: "Planejamento (Gantt)",
      description: "Linha do tempo, projeções de entrega e capacidade futura.",
      view: "Planejamento (Gantt)",
      icon: CalendarClock,
      color: "bg-purple-50 text-purple-600 border-purple-200",
      hover: "group-hover:text-purple-700"
    },
    {
      title: "Insights de Gestão",
      description: "Análise de gargalos, heatmap de alocação e sobrecarga.",
      view: "Insights de Gestão",
      icon: Lightbulb,
      color: "bg-amber-50 text-amber-600 border-amber-200",
      hover: "group-hover:text-amber-700"
    },
    {
      title: "Painel de Indicadores",
      description: "KPIs, gráficos de throughput, lead time e SLA.",
      view: "Painel de Indicadores",
      icon: BarChart2,
      color: "bg-cyan-50 text-cyan-600 border-cyan-200",
      hover: "group-hover:text-cyan-700"
    },
    {
      title: "Report Executivo",
      description: "Gerador de relatórios semanais para WhatsApp e stakeholders.",
      view: "Report Executivo",
      icon: FileText,
      color: "bg-green-50 text-green-600 border-green-200",
      hover: "group-hover:text-green-700"
    },
    {
      title: "App Mobile",
      description: "Versão simplificada para acesso rápido via celular.",
      view: "App Mobile",
      icon: Smartphone,
      color: "bg-gray-50 text-gray-600 border-gray-200",
      hover: "group-hover:text-gray-700"
    }
  ];

  const secondaryModules = [
    {
      title: "Arquivados",
      view: "Arquivados",
      icon: Archive
    },
    {
      title: "Configurações",
      view: "Configurações",
      icon: Settings
    }
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fade-in space-y-8">
      
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#003A70] to-[#0056a3] rounded-2xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Bem-vindo ao GDD 2.0</h1>
          <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
            Selecione um módulo abaixo para iniciar. Você pode navegar entre as visões operacionais, 
            planejamento estratégico e relatórios executivos a qualquer momento pelo menu lateral.
          </p>
        </div>
      </div>

      {/* Main Modules Grid */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-6 px-1 flex items-center gap-2">
          <div className="w-1 h-6 bg-[#32A6E6] rounded-full"></div>
          Módulos Principais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {modules.map((mod) => (
            <div 
              key={mod.title}
              onClick={() => onNavigate(mod.view)}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all cursor-pointer group flex flex-col"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${mod.color} group-hover:scale-110 transition-transform`}>
                <mod.icon size={24} />
              </div>
              <h3 className={`font-bold text-gray-800 text-lg mb-2 transition-colors ${mod.hover}`}>
                {mod.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed flex-1">
                {mod.description}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-xs font-bold text-gray-400 group-hover:text-[#003A70] transition-colors uppercase tracking-wider">
                Acessar <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary/Admin Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {secondaryModules.map((mod) => (
             <div 
                key={mod.title}
                onClick={() => onNavigate(mod.view)}
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:bg-gray-50 cursor-pointer flex items-center gap-4 group transition-colors"
             >
                <div className="p-3 bg-gray-100 rounded-full text-gray-500 group-hover:bg-[#003A70] group-hover:text-white transition-colors">
                   <mod.icon size={20} />
                </div>
                <div>
                   <h3 className="font-bold text-gray-700 group-hover:text-[#003A70] transition-colors">{mod.title}</h3>
                   <p className="text-xs text-gray-400">Acesso administrativo e histórico.</p>
                </div>
                <ArrowRight size={16} className="ml-auto text-gray-300 group-hover:text-[#003A70]" />
             </div>
          ))}
      </div>

    </div>
  );
};

export default HomeNavigation;
