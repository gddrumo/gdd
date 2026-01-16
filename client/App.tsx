
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Area, Coordination, Person, Demand, FilterState, DemandStatus, DemandType, Complexity, WorkflowLog, HistoryLog, Category, SLAConfig, User, UserRole } from './types';
import { api } from './services/api'; // Import API Layer
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';
import DemandList from './components/DemandList';
import Tutorial from './components/Tutorial';
import GanttChart from './components/GanttChart';
import InsightsPanel from './components/InsightsPanel';
import SettingsPanel from './components/SettingsPanel';
import MobileApp from './components/MobileApp'; // Import Mobile App
import Login from './components/Login'; // Import Login
import ExecutiveReport from './components/ExecutiveReport'; // Import New Report Component
import HomeNavigation from './components/HomeNavigation'; // Import Home
import EmptyState from './components/EmptyState'; // Import Empty State
import ConfirmDialog from './components/ConfirmDialog'; // Import Confirm Dialog
import { classifyDemand, processVoiceDemand } from './services/geminiService';
import { useToast } from './hooks/useToast';
import { useDebounce } from './hooks/useDebounce';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useConfirm } from './hooks/useConfirm';
import {
  BarChart2,
  LayoutTemplate,
  List,
  Archive,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Pencil,
  X,
  Search,
  Download,
  Upload,
  CalendarClock,
  Lightbulb,
  AlertTriangle,
  Trash2,
  Sparkles,
  Loader2,
  Mic,
  LogOut,
  User as UserIcon,
  Smartphone,
  CheckCircle2,
  FileText,
  Home,
  WifiOff,
  Wifi
} from 'lucide-react';

enum View {
  HOME = 'Início',
  TUTORIAL = 'Tutorial',
  KANBAN = 'Kanban',
  LIST = 'Lista',
  GANTT = 'Planejamento (Gantt)',
  INSIGHTS = 'Insights de Gestão',
  DASHBOARD = 'Painel de Indicadores',
  REPORT = 'Report Executivo',
  MOBILE = 'App Mobile',
  ARCHIVED = 'Arquivados',
  SETTINGS = 'Configurações',
}

// Keywords for Automatic Classification (Type)
const SYSTEM_KEYWORDS = [
  'sistema', 'sistematiza', 'framework', 'modelo', 'metodologia',
  'governan', 'processo', 'fluxo', 'pipeline', 'padroniza',
  'simulador', 'ferramenta', 'plataforma', 'dashboard', 'painel',
  'template', 'manual', 'guia', 'documenta', 'livro', 'arquitetura',
  'estruturação', 'estratégia', 'roteiro'
];

const App: React.FC = () => {
  // --- HOOKS ---
  const { showToast } = useToast();
  const isOnline = useOnlineStatus();
  const { confirm, confirmState, handleCancel } = useConfirm();

  // --- AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Persistência de sessão com localStorage
    const savedUser = localStorage.getItem('gdd_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // --- DATA CONFIG STATE (From DB or Mock) ---
  const [areas, setAreas] = useState<Area[]>([]); // Requester Areas
  const [coordinations, setCoordinations] = useState<Coordination[]>([]); // Technical Coordinations
  const [people, setPeople] = useState<Person[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [slas, setSlas] = useState<SLAConfig[]>([]);
  
  // Config Loading State
  const [isConfigLoading, setIsConfigLoading] = useState<boolean>(true);
  const [configError, setConfigError] = useState<string | null>(null);


  // ASYNC DATA LOADING (Demands)
  const [demands, setDemands] = useState<Demand[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // View State
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [filters, setFilters] = useState<FilterState>(() => {
    // Persistir filtros no localStorage
    const savedFilters = localStorage.getItem('gdd_filters');
    return savedFilters ? JSON.parse(savedFilters) : {
      areaId: 'all',
      requesterAreaId: 'all',
      personId: 'all',
      status: 'all',
      type: 'all'
    };
  });
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'history'>('details');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  
  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // Completion / SLA Logic State
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [slaJustification, setSlaJustification] = useState('');
  const [deliverySummary, setDeliverySummary] = useState('');
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{id: string, status: DemandStatus} | null>(null);
  const [exceededSlaInfo, setExceededSlaInfo] = useState<{allowed: number, actual: number} | null>(null);

  // Editing State
  const [editingDemandId, setEditingDemandId] = useState<string | null>(null);
  const [demandForm, setDemandForm] = useState<Partial<Demand>>({
    title: '',
    description: '',
    category: '',
    complexity: Complexity.LOW,
    effort: 0,
    areaId: '', 
    requesterAreaId: '', 
    personId: '', 
    requesterName: '',
    type: undefined, 
    agreedDeadline: '' 
  });

  // Canceling State
  const [demandToCancel, setDemandToCancel] = useState<Demand | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // CSV Import Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOAD CONFIGURATION (AREAS, PEOPLE, ETC) ---
  useEffect(() => {
    const loadConfigData = async () => {
      try {
        setIsConfigLoading(true);
        setConfigError(null);

        const [areasRes, coordinationsRes, peopleRes, categoriesRes, slasRes] = await Promise.all([
          api.config.getAreas(),
          api.config.getCoordinations(),
          api.config.getPeople(),
          api.config.getCategories(),
          api.config.getSlas(),
        ]);

        setAreas(areasRes);
        setCoordinations(coordinationsRes);
        setPeople(peopleRes);
        setCategories(categoriesRes);
        setSlas(slasRes);

      } catch (error) {
        console.error('Erro ao carregar configurações do backend', error);
        setConfigError('Erro ao carregar configurações (backend indisponível).');

        // Em caso de erro, não usamos mais mocks: deixamos tudo vazio
        setAreas([]);
        setCoordinations([]);
        setPeople([]);
        setCategories([]);
        setSlas([]);

        } finally {
          setIsConfigLoading(false);
        }
      };

    loadConfigData();
  }, []);


  // --- LOAD DEMANDS ---
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const data = await api.demands.getAll();
        // Mesmo se vier [], mantém o que o back mandou
        setDemands(data);
      } catch (err) {
        console.error("Erro ao carregar demandas da API", err);
        // Em produção, NÃO usamos mais mock – só lista vazia
        setDemands([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [currentUser]);


  // Persistir usuário no localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('gdd_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('gdd_current_user');
    }
  }, [currentUser]);

  // Persistir filtros no localStorage
  useEffect(() => {
    localStorage.setItem('gdd_filters', JSON.stringify(filters));
  }, [filters]);

  // Notificação de status offline
  useEffect(() => {
    if (!isOnline) {
      showToast('Você está offline. Algumas funcionalidades podem não estar disponíveis.', 'warning', 0);
    }
  }, [isOnline, showToast]);

  // Check screen size for initial sidebar state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- AUTH HANDLERS ---
  const handleLogin = (user: User) => {
      setCurrentUser(user);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setDemands([]);
  };

  // Session timeout - 120 minutos de inatividade
  useEffect(() => {
    if (!currentUser) return; // Só ativa se houver usuário logado

    const TIMEOUT_DURATION = 120 * 60 * 1000; // 120 minutos em milissegundos
    const WARNING_DURATION = 5 * 60 * 1000; // Aviso 5 minutos antes
    let timeoutId: NodeJS.Timeout;
    let warningId: NodeJS.Timeout;

    const resetTimeout = () => {
      // Limpa timeouts anteriores
      if (timeoutId) clearTimeout(timeoutId);
      if (warningId) clearTimeout(warningId);

      // Aviso 5 minutos antes do logout
      warningId = setTimeout(() => {
        showToast(
          'Sua sessão expirará em 5 minutos por inatividade. Interaja com o sistema para manter a sessão ativa.',
          'warning',
          10000
        );
      }, TIMEOUT_DURATION - WARNING_DURATION);

      // Logout automático após 120 minutos
      timeoutId = setTimeout(() => {
        showToast('Sessão expirada por inatividade. Faça login novamente.', 'error', 5000);
        handleLogout();
      }, TIMEOUT_DURATION);
    };

    // Eventos que indicam atividade do usuário
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      window.addEventListener(event, resetTimeout);
    });

    // Inicializa o timeout
    resetTimeout();

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (warningId) clearTimeout(warningId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout);
      });
    };
  }, [currentUser, showToast, handleLogout]);

  // --- PERMISSION CHECKERS ---
  const canEdit = useMemo(() => currentUser?.role === 'TIME', [currentUser]);
  const canCreate = true; 
  const canArchive = useMemo(() => currentUser?.role === 'TIME', [currentUser]);
  const canDelete = useMemo(() => currentUser?.role === 'GESTAO', [currentUser]); // Permissão para Hard Delete

  // Filter Logic - COM DEBOUNCE E BUSCA EXPANDIDA
  const filteredDemands = useMemo(() => {
    return demands.filter(d => {
      if (currentView === View.ARCHIVED) {
        if (d.status !== DemandStatus.CANCELADO) return false;
      } else {
        if (d.status === DemandStatus.CANCELADO) return false;
      }

      // Search Filter - busca em múltiplos campos (título, descrição, solicitante, categoria)
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matchesTitle = d.title.toLowerCase().includes(searchLower);
        const matchesDescription = d.description?.toLowerCase().includes(searchLower);
        const matchesRequester = d.requesterName?.toLowerCase().includes(searchLower);
        const matchesCategory = d.category?.toLowerCase().includes(searchLower);

        if (!matchesTitle && !matchesDescription && !matchesRequester && !matchesCategory) {
          return false;
        }
      }

      const matchCoordination = filters.areaId === 'all' || d.areaId === filters.areaId;
      const matchPerson = filters.personId === 'all' || d.personId === filters.personId;

      return matchCoordination && matchPerson;
    });
  }, [demands, filters, currentView, debouncedSearchTerm]);

  // Paginação
  const paginatedDemands = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDemands.slice(startIndex, endIndex);
  }, [filteredDemands, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredDemands.length / itemsPerPage);

  // Reset página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, debouncedSearchTerm]);

  // Classification Engine
  const classifyDemandLocal = (title: string, desc: string): DemandType => {
    const text = `${title} ${desc}`.toLowerCase();
    const isSystem = SYSTEM_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
    return isSystem ? DemandType.SYSTEM : DemandType.TASK;
  };

  // AI Suggestion Handler
  const handleAiSuggest = async () => {
      if (!demandForm.title || !demandForm.description) {
          showToast("Preencha Título e Descrição para usar a IA.", "warning");
          return;
      }

      setIsAiLoading(true);
      const suggestion = await classifyDemand(demandForm.title, demandForm.description);
      setIsAiLoading(false);

      if (suggestion) {
          let calculatedDeadline = '';

          // Queue Calculation Logic
          const personId = demandForm.personId;
          if (personId) {
              const queueDemands = demands.filter(d =>
                  d.personId === personId &&
                  d.status !== DemandStatus.CONCLUIDO &&
                  d.status !== DemandStatus.CANCELADO
              );
              const queueHours = queueDemands.reduce((acc, d) => acc + (d.effort || 0), 0);
              const daysToStart = queueHours / 8;
              const daysToFinish = daysToStart + (suggestion.effort / 8);
              const projectedDate = new Date();
              projectedDate.setDate(projectedDate.getDate() + Math.ceil(daysToFinish * 1.4));
              calculatedDeadline = projectedDate.toISOString().split('T')[0];
          }

          setDemandForm(prev => ({
              ...prev,
              type: suggestion.type,
              complexity: suggestion.complexity,
              effort: suggestion.effort,
              agreedDeadline: prev.agreedDeadline || calculatedDeadline
          }));
          showToast("Sugestão da IA aplicada com sucesso!", "success");
      } else {
          showToast("Não foi possível gerar sugestão. Verifique sua conexão ou tente novamente.", "error");
      }
  };

  // Voice Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsAiLoading(true);
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          if (reader.result) {
             const base64Audio = (reader.result as string).split(',')[1];
             const result = await processVoiceDemand(base64Audio);
             
             if (result && result.title) {
                setEditingDemandId(null);
                setDemandForm({
                   title: result.title,
                   description: result.description,
                   category: '', complexity: Complexity.LOW, effort: 0, areaId: '', requesterAreaId: '', personId: '', requesterName: '', type: undefined, agreedDeadline: ''
                });
                setIsFormModalOpen(true);
                setActiveModalTab('details');
                setIsViewMode(false);
                showToast('Demanda criada a partir do áudio!', 'success');
             } else {
                showToast('Não foi possível transcrever o áudio com clareza. Tente novamente.', 'error');
             }
          }
          setIsAiLoading(false);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      showToast('Erro ao acessar microfone. Verifique as permissões.', 'error');
    }
  };

  const stopRecording = () => {
     if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); // Stop stream
        setIsRecording(false);
     }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'ID', 'Data Entrada', 'Nome Solicitante', 'Área Solicitante', 'Título',
      'Coord. Responsável', 'Responsável Técnico', 'Descrição', 'Categoria',
      'Tipo', 'Status', 'Complexidade', 'Esforço', 'Data Conclusão', 'Justificativa Atraso', 'Prazo Combinado', 'Prioritária'
    ];

    const csvRows = [
      headers.join(';'),
      ...demands.map(d => {
        const reqArea = areas.find(a => a.id === d.requesterAreaId)?.name || '';
        const techArea = coordinations.find(a => a.id === d.areaId)?.name || '';
        const person = people.find(p => p.id === d.personId)?.name || '';
        const clean = (str: string) => `"${(str || '').replace(/"/g, '""').replace(/(\r\n|\n|\r)/gm, " ")}"`;

        return [
          d.id,
          d.createdAt,
          clean(d.requesterName),
          clean(reqArea),
          clean(d.title),
          clean(techArea),
          clean(person),
          clean(d.description),
          clean(d.category),
          d.type,
          d.status,
          d.complexity,
          d.effort,
          d.finishedAt || '',
          clean(d.delayJustification || ''),
          d.agreedDeadline || '',
          d.isPriority ? 'SIM' : 'NAO'
        ].join(';');
      })
    ];

    const blob = new Blob(['\uFEFF', csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gdd_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(l => l.trim());
      const dataLines = lines.slice(1); // Skip header
      
      const newDemandsPromises = dataLines.map(async (line, idx) => {
         const matches = line.match(/(".*?"|[^";]+)(?=\s*;|\s*$)/g);
         if (!matches) return null;
         
         const cols = matches.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
         
         const [
            id, createdAt, reqName, reqAreaName, title, 
            techAreaName, personName, desc, cat, type, 
            status, complexity, effort, finishedAt, justif, deadline, priority
         ] = cols;

         const reqAreaId = areas.find(a => a.name.toLowerCase() === reqAreaName?.toLowerCase())?.id || areas[0]?.id || '';
         const areaId = coordinations.find(a => a.name.toLowerCase() === techAreaName?.toLowerCase())?.id || coordinations[0]?.id || '';
         const personId = people.find(p => p.name.toLowerCase() === personName?.toLowerCase())?.id || people[0]?.id || '';

         const demand: Demand = {
           id: id || `imp-${Date.now()}-${idx}`,
           createdAt: createdAt || new Date().toISOString(),
           requesterName: reqName || '',
           requesterAreaId: reqAreaId,
           title: title || 'Sem Título',
           areaId: areaId,
           personId: personId,
           description: desc || '',
           category: cat || 'Geral',
           type: (type as DemandType) || DemandType.TASK,
           status: (status as DemandStatus) || DemandStatus.ENTRADA,
           complexity: (complexity as Complexity) || Complexity.LOW,
           effort: Number(effort) || 0,
           finishedAt: finishedAt || undefined,
           delayJustification: justif || undefined,
           agreedDeadline: deadline || undefined,
           isPriority: priority === 'SIM',
           logs: [],
           history: [{ timestamp: new Date().toISOString(), action: 'Criação', details: 'Importado via CSV', user: currentUser?.name || 'System' }]
         };

         // Persist via API
         try {
            return await api.demands.create(demand);
         } catch(e) {
            console.warn("Import CSV local fallback", e);
            return demand;
         }
      });
      
      const newDemands = (await Promise.all(newDemandsPromises)).filter(d => d !== null) as Demand[];
      setDemands(prev => [...prev, ...newDemands]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast(`${newDemands.length} demandas importadas com sucesso.`, 'success');
    };
    reader.readAsText(file);
  };

  // Actions
  const clearFilters = () => {
    setFilters({
      areaId: 'all',
      requesterAreaId: 'all',
      personId: 'all',
      status: 'all',
      type: 'all'
    });
    setSearchTerm('');
  };

  const handleViewDemand = (demand: Demand) => {
    setEditingDemandId(demand.id);
    setDemandForm({ ...demand });
    setActiveModalTab('history');
    setIsViewMode(true);
    setIsFormModalOpen(true);
  };

  const handleEditDemand = (demand: Demand) => {
    if (!canEdit) {
        showToast("Seu perfil não possui permissão para editar demandas.", "warning");
        return;
    }
    setEditingDemandId(demand.id);
    setDemandForm({ ...demand });
    setActiveModalTab('details');
    setIsViewMode(false);
    setIsFormModalOpen(true);
  };

  // --- HARD DELETE FUNCTION (COM ROLLBACK) ---
  const handleHardDelete = async (id: string) => {
    if (!canDelete) {
       showToast("Apenas Gestores podem excluir permanentemente.", "warning");
       return;
    }

    const confirmed = await confirm({
      title: 'Excluir Permanentemente',
      message: 'ATENÇÃO: Esta ação excluirá permanentemente a demanda e todo o histórico. Deseja continuar?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      variant: 'danger'
    });

    if (confirmed) {
       // Salvar estado anterior para rollback
       const previousDemands = [...demands];

       // Optimistic Update
       setDemands(prev => prev.filter(d => d.id !== id));
       setIsFormModalOpen(false);
       setEditingDemandId(null);

       try {
          await api.demands.delete(id);
          showToast("Demanda excluída permanentemente.", "success");
       } catch (error) {
          console.error("Erro ao excluir demanda:", error);
          // Rollback em caso de erro
          setDemands(previousDemands);
          showToast("Erro ao excluir demanda. Alterações revertidas.", "error");
       }
    }
  };

  // --- ARCHIVE (Soft Delete) FUNCTION (COM ROLLBACK) ---
  const handleArchiveDemand = async (demand: Demand, justification?: string) => {
    if (!canArchive) return;

    if (justification) {
        const now = new Date().toISOString();
        const logEntry: HistoryLog = {
          timestamp: now,
          action: 'Cancelamento',
          details: `Arquivado. Motivo: ${justification}`,
          user: currentUser?.name || 'Usuário'
        };

        const updatedDemand = {
             ...demand,
             status: DemandStatus.CANCELADO,
             cancellationReason: justification,
             history: [logEntry, ...demand.history],
             statusTimestamps: { ...demand.statusTimestamps, [DemandStatus.CANCELADO]: now }
        };

        // Salvar estado anterior para rollback
        const previousDemands = [...demands];

        // Optimistic Update
        setDemands(prev => prev.map(d => d.id === demand.id ? updatedDemand : d));
        setIsCancelModalOpen(false);
        setDemandToCancel(null);

        // API Call
        try {
            await api.demands.update(updatedDemand);
            showToast("Demanda arquivada com sucesso.", "success");
        } catch (e) {
             console.error("Erro ao arquivar demanda:", e);
             // Rollback em caso de erro
             setDemands(previousDemands);
             showToast("Erro ao arquivar demanda. Alterações revertidas.", "error");
        }

    } else {
        setDemandToCancel(demand);
        setCancelReason('');
        setIsCancelModalOpen(true);
    }
  };

  // --- TOGGLE PRIORITY (COM ROLLBACK) ---
  const handleTogglePriority = async (demand: Demand) => {
     const now = new Date().toISOString();
     const newPriority = !demand.isPriority;
     const logEntry: HistoryLog = {
        timestamp: now,
        action: 'Priorização',
        details: newPriority ? 'Marcado como Prioritário' : 'Removido da Prioridade',
        user: currentUser?.name || 'Usuário'
     };

     const updatedDemand = {
        ...demand,
        isPriority: newPriority,
        history: [logEntry, ...demand.history]
     };

     // Salvar estado anterior para rollback
     const previousDemands = [...demands];

     // Optimistic Update
     setDemands(prev => prev.map(d => d.id === demand.id ? updatedDemand : d));

     try {
        await api.demands.update(updatedDemand);
        showToast(newPriority ? "Demanda marcada como prioritária." : "Demanda removida de prioridade.", "success");
     } catch (e) {
        console.error("Erro ao alterar prioridade:", e);
        // Rollback em caso de erro
        setDemands(previousDemands);
        showToast("Erro ao alterar prioridade. Alterações revertidas.", "error");
     }
  };

  // --- DELETE DEMAND (PERMANENT) ---
  const handleDeleteDemand = async (demand: Demand) => {
     if (!canArchive) return;

     const confirmed = await confirm({
        title: 'Excluir Permanentemente',
        message: `ATENÇÃO: Esta ação excluirá permanentemente a demanda "${demand.title}" e todo o histórico. Deseja continuar?`
     });

     if (!confirmed) return;

     // Salvar estado anterior para rollback
     const previousDemands = [...demands];

     // Optimistic Update
     setDemands(prev => prev.filter(d => d.id !== demand.id));

     try {
        await api.demands.delete(demand.id);
        showToast("Demanda excluída permanentemente com sucesso.", "success");
     } catch (e) {
        console.error("Erro ao excluir demanda:", e);
        // Rollback em caso de erro
        setDemands(previousDemands);
        showToast("Erro ao excluir demanda. Alterações revertidas.", "error");
     }
  };

  // --- RESTORE DEMAND (FROM ARCHIVED) ---
  const handleRestoreDemand = async (demand: Demand) => {
     if (!canArchive) return;

     const now = new Date().toISOString();
     const logEntry: HistoryLog = {
        timestamp: now,
        action: 'Restauração',
        details: 'Demanda restaurada de Arquivados para Fila',
        user: currentUser?.name || 'Usuário'
     };

     const updatedDemand = {
        ...demand,
        status: DemandStatus.FILA,
        cancellationReason: undefined,
        history: [logEntry, ...demand.history],
        statusTimestamps: { ...demand.statusTimestamps, [DemandStatus.FILA]: now }
     };

     // Salvar estado anterior para rollback
     const previousDemands = [...demands];

     // Optimistic Update
     setDemands(prev => prev.map(d => d.id === demand.id ? updatedDemand : d));

     try {
        await api.demands.update(updatedDemand);
        showToast("Demanda restaurada com sucesso.", "success");
     } catch (e) {
        console.error("Erro ao restaurar demanda:", e);
        // Rollback em caso de erro
        setDemands(previousDemands);
        showToast("Erro ao restaurar demanda. Alterações revertidas.", "error");
     }
  };

  // --- STATUS CHANGE (COM ROLLBACK) ---
  const handleStatusChange = async (id: string, newStatus: DemandStatus) => {
    if (!canEdit) {
         showToast("Apenas o Time Técnico pode alterar status.", "warning");
         return;
    }

    const demand = demands.find(d => d.id === id);
    if (!demand) return;
    
    if (newStatus === DemandStatus.CONCLUIDO) {
        // ... (SLA Checks logic remains same) ...
        setDeliverySummary('');
        setSlaJustification('');
        setExceededSlaInfo(null);

        const startTime = demand.startedAt ? new Date(demand.startedAt).getTime() : new Date(demand.createdAt).getTime();
        const nowTime = new Date().getTime();
        const elapsedHours = (nowTime - startTime) / (1000 * 60 * 60);

        const categoryObj = categories.find(c => c.name === demand.category);
        const categoryId = categoryObj ? categoryObj.id : '';
        const slaRule = slas.find(s => s.categoryId === categoryId && s.complexity === demand.complexity);

        if (slaRule && elapsedHours > slaRule.slaHours) {
            setExceededSlaInfo({ allowed: slaRule.slaHours, actual: Math.round(elapsedHours) });
        }

        setPendingStatusUpdate({ id, status: newStatus });
        setIsCompletionModalOpen(true);
        return;
    }
    
    await performStatusUpdate(id, newStatus);
  };

  const confirmCompletion = async () => {
     if (!pendingStatusUpdate) return;
     const now = new Date().toISOString();
     const demand = demands.find(d => d.id === pendingStatusUpdate.id);
     
     if(demand) {
        let updatedD = updateDemandStatusLogic(demand, pendingStatusUpdate.status, now);
        updatedD.deliverySummary = deliverySummary;
        
        const logs: HistoryLog[] = [];
        logs.push({
            timestamp: now,
            action: 'Conclusão',
            details: `Entrega realizada. ${deliverySummary.substring(0, 50)}...`,
            user: currentUser?.name || 'Usuário'
        });

        if (exceededSlaInfo) {
            updatedD.delayJustification = slaJustification;
            logs.push({
                timestamp: now,
                action: 'Conclusão', 
                details: `SLA Excedido (${exceededSlaInfo?.actual}h vs ${exceededSlaInfo?.allowed}h). Justificativa: ${slaJustification}`,
                user: currentUser?.name || 'Usuário'
            });
        }

        updatedD.history = [...logs, ...updatedD.history];
        
        // Optimistic Update
        setDemands(prev => prev.map(d => d.id === demand.id ? updatedD : d));
        setIsCompletionModalOpen(false);
        setPendingStatusUpdate(null);

        try {
            await api.demands.update(updatedD);
        } catch (e) {
             console.warn("API unavailable, completion processed locally");
        }
     }
  };

  const updateDemandStatusLogic = (d: Demand, newStatus: DemandStatus, now: string): Demand => {
      const oldStatus = d.status;
      
      let start = d.startedAt;
      let end = d.finishedAt;

      if (newStatus === DemandStatus.EXECUCAO && !start) start = now;
      if (newStatus === DemandStatus.CONCLUIDO) end = now;
      if (newStatus !== DemandStatus.CONCLUIDO) end = undefined; 

      const workflowLog: WorkflowLog = {
        from: oldStatus,
        to: newStatus,
        timestamp: now
      };

      return {
        ...d,
        status: newStatus,
        startedAt: start,
        finishedAt: end,
        logs: [...d.logs, workflowLog],
        statusTimestamps: { ...d.statusTimestamps, [newStatus]: now }
      };
  };

  const performStatusUpdate = async (id: string, newStatus: DemandStatus) => {
    const now = new Date().toISOString();
    const demand = demands.find(d => d.id === id);
    if(demand) {
        const updatedD = updateDemandStatusLogic(demand, newStatus, now);
        
        // Optimistic Update
        setDemands(prev => prev.map(d => d.id === id ? updatedD : d));

        try {
            await api.demands.update(updatedD);
        } catch(e) {
            console.warn("API unavailable, status update processed locally");
        }
    }
  };

  // --- REVISED SAVE FUNCTION (COM VALIDAÇÃO E PREVENIR PERDA DE DADOS) ---
  const handleSaveDemand = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de campos obrigatórios
    if (!demandForm.title || !demandForm.personId || !demandForm.areaId || !demandForm.requesterAreaId) {
      showToast('Preencha os campos obrigatórios: Título, Área Técnica, Área Solicitante e Responsável', 'warning');
      return;
    }

    // Validação adicional
    if (demandForm.title.trim().length < 3) {
      showToast('O título deve ter pelo menos 3 caracteres', 'warning');
      return;
    }

    if (demandForm.effort && (demandForm.effort < 0 || demandForm.effort > 10000)) {
      showToast('O esforço deve estar entre 0 e 10000 horas', 'warning');
      return;
    }

    const type = demandForm.type || classifyDemandLocal(demandForm.title || '', demandForm.description || '');
    const now = new Date().toISOString();

    // IMPORTANTE: Não fechar modal antes da confirmação da API
    // Isso previne perda de dados se a API falhar

    if (editingDemandId) {
      if(!canEdit) return;

      const originalDemand = demands.find(d => d.id === editingDemandId);
      if(!originalDemand) return;

      const changes: string[] = [];
      if (originalDemand.title !== demandForm.title) changes.push(`Título alterado`);
      if (originalDemand.effort !== Number(demandForm.effort)) changes.push(`Esforço: ${originalDemand.effort}h -> ${demandForm.effort}h`);

      const historyEntry: HistoryLog | null = changes.length > 0 ? {
        timestamp: now,
        action: 'Edição',
        details: changes.join('; '),
        user: currentUser?.name || 'Usuário'
      } : null;

      const updatedDemand: Demand = {
          ...originalDemand,
          ...demandForm as any,
          status: originalDemand.status,
          history: historyEntry ? [historyEntry, ...originalDemand.history] : originalDemand.history
      };

      // Salvar estado anterior para rollback
      const previousDemands = [...demands];

      // Optimistic Update
      setDemands(prev => prev.map(d => d.id === editingDemandId ? updatedDemand : d));

      try {
        await api.demands.update(updatedDemand);

        // Fechar modal SOMENTE após sucesso da API
        setIsFormModalOpen(false);
        setEditingDemandId(null);
        setDemandForm({ title: '', description: '', category: '', complexity: Complexity.LOW, effort: 0, areaId: '', requesterAreaId: '', personId: '', requesterName: '', type: undefined, agreedDeadline: '' });
        showToast('Demanda atualizada com sucesso!', 'success');
      } catch (e) {
        console.error("Erro ao atualizar demanda:", e);
        // Rollback em caso de erro
        setDemands(previousDemands);
        showToast('Erro ao salvar alterações. Tente novamente.', 'error');
      }

    } else {
      const newDemand: Demand = {
        id: `dem-${String(Date.now())}`,
        title: demandForm.title!,
        description: demandForm.description || '',
        category: demandForm.category || categories[0]?.name || 'Geral',
        complexity: demandForm.complexity || Complexity.MEDIUM,
        effort: Number(demandForm.effort) || 0,
        areaId: demandForm.areaId!,
        requesterAreaId: demandForm.requesterAreaId!,
        personId: demandForm.personId!,
        requesterName: demandForm.requesterName || '',
        agreedDeadline: demandForm.agreedDeadline || undefined,
        type,
        status: DemandStatus.ENTRADA,
        createdAt: now,
        logs: [],
        history: [{ timestamp: now, action: 'Criação', details: 'Demanda criada via Painel', user: currentUser?.name || 'Usuário' }],
        statusTimestamps: { [DemandStatus.ENTRADA]: now }
      };

      // Salvar estado anterior para rollback
      const previousDemands = [...demands];

      // Optimistic Update
      setDemands(prev => [newDemand, ...prev]);

      try {
        await api.demands.create(newDemand);

        // Fechar modal SOMENTE após sucesso da API
        setIsFormModalOpen(false);
        setEditingDemandId(null);
        setDemandForm({ title: '', description: '', category: '', complexity: Complexity.LOW, effort: 0, areaId: '', requesterAreaId: '', personId: '', requesterName: '', type: undefined, agreedDeadline: '' });
        showToast('Demanda criada com sucesso!', 'success');
      } catch (e) {
        console.error("Erro ao criar demanda:", e);
        // Rollback em caso de erro
        setDemands(previousDemands);
        showToast('Erro ao criar demanda. Tente novamente.', 'error');
      }
    }
  };

  const handleMobileNewDemand = () => {
    setEditingDemandId(null);
    setDemandForm({ title: '', description: '', category: '', complexity: Complexity.LOW, effort: 0, areaId: '', requesterAreaId: '', personId: '', requesterName: '', type: undefined, agreedDeadline: '' });
    setActiveModalTab('details');
    setIsViewMode(false);
    setIsFormModalOpen(true);
  }

  // Menu Group Definition
  const menuGroups = [
    {
      label: 'Navegação',
      items: [
        { id: View.HOME, icon: Home, label: 'Início' },
        { id: View.TUTORIAL, icon: BookOpen, label: 'Tutorial' },
      ]
    },
    {
      label: 'Demandas',
      items: [
        { id: View.KANBAN, icon: LayoutTemplate, label: 'Kanban' },
        { id: View.LIST, icon: List, label: 'Lista' },
        { id: View.ARCHIVED, icon: Archive, label: 'Arquivados' },
      ]
    },
    {
      label: 'Gestão',
      items: [
        { id: View.GANTT, icon: CalendarClock, label: 'Planejamento' },
        { id: View.INSIGHTS, icon: Lightbulb, label: 'Insights' },
      ]
    },
    {
      label: 'Relatórios',
      items: [
        { id: View.DASHBOARD, icon: BarChart2, label: 'Painel' },
        { id: View.REPORT, icon: FileText, label: 'Report Executivo' },
        { id: View.MOBILE, icon: Smartphone, label: 'App Mobile' },
      ]
    },
    {
      label: 'Sistema',
      items: [
        { id: View.SETTINGS, icon: Settings, label: 'Configurações' },
      ]
    }
  ];

  if (!currentUser) {
      return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden">
      <style>{`
        .config-status-container {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 999;
          font-size: 11px;
        }

        .config-badge {
          padding: 4px 8px;
          border-radius: 999px;
          font-weight: 500;
          background: rgba(0, 0, 0, 0.08);
        }

        .config-badge-loading {
          background-color: #f3f3f3;
          color: #555;
        }

        .config-badge-warning {
          background-color: #fff4e5;
          border: 1px solid #f0b429;
          color: #a46900;
        }

        .config-badge-ok {
          background-color: #e5f0f9;
          border: 1px solid #003865; 
          color: #003865;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }

        .animate-scale-in {
          animation: scaleIn 0.2s ease-out;
        }

        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:w-full { width: 100% !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          aside { display: none !important; }
          header { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
        }
      `}</style>

      {/* CONFIG STATUS BADGE */}
      <div className="config-status-container print:hidden">
     {isConfigLoading ? (
      <span className="config-badge config-badge-loading">
        Configurações: carregando...
      </span>
    ) : configError ? (
      <span className="config-badge config-badge-warning">
        {configError}
      </span>
    ) : (
      <span className="config-badge config-badge-ok">
        Configurações: banco Cloud SQL
      </span>
    )}
  </div>


      {/* OFFLINE INDICATOR */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[1000] bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-lg print:hidden">
          <WifiOff size={18} />
          <span>Você está offline. Algumas funcionalidades podem estar indisponíveis.</span>
        </div>
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-[#003865] text-white transition-all duration-300 flex flex-col shadow-xl print:hidden
          ${isSidebarOpen ? 'w-[240px]' : 'w-[70px]'}
        `}
      >
        {/* Sidebar Content */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-8 bg-[#003865] text-white p-1 rounded-full border border-white/20 shadow-md hover:bg-blue-900 z-50"
        >
           {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <div className={`min-w-[32px] h-8 flex items-center justify-center`}>
             <h1 className="text-2xl font-bold tracking-tighter text-white">GDD</h1>
          </div>
          <div className={`ml-3 overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
             <p className="text-[10px] opacity-60 pt-1">Gestor de Demandas</p>
          </div>
        </div>

        <div className={`px-4 py-4 border-b border-white/10 flex items-center gap-3 overflow-hidden transition-all ${isSidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center text-xs font-bold border border-blue-300/30">
                {currentUser.name.charAt(0)}
            </div>
            {isSidebarOpen && (
                <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate">{currentUser.name}</p>
                    <p className="text-[10px] opacity-60 truncate">{currentUser.role === 'GESTAO' ? 'Gestão Executiva' : 'Time Técnico'}</p>
                </div>
            )}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto custom-scrollbar">
           {menuGroups.map((group, idx) => (
             <div key={idx} className="space-y-1">
                {isSidebarOpen ? (
                   <div className="px-3 mb-2 text-[10px] font-bold text-blue-300/50 uppercase tracking-wider">
                      {group.label}
                   </div>
                ) : (
                   <div className="h-px w-8 bg-white/10 mx-auto my-2"></div>
                )}
                
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center p-2.5 rounded-lg transition-all duration-200 group relative
                      ${currentView === item.id ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}
                    `}
                    title={!isSidebarOpen ? item.label : ''}
                  >
                    <item.icon size={20} strokeWidth={1.5} />
                    <span className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
             </div>
           ))}
        </nav>

        <div className="p-4 border-t border-white/10">
            <button 
                onClick={handleLogout}
                className="w-full flex items-center p-2 rounded-lg text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-all"
                title="Sair"
            >
                <LogOut size={20} />
                {isSidebarOpen && <span className="ml-3 text-sm font-bold">Sair</span>}
            </button>
        </div>
      </aside>

      <main 
        className={`flex-1 flex flex-col min-w-0 bg-[#f3f4f6] transition-all duration-300 print:ml-0`}
        style={{ marginLeft: isSidebarOpen ? '240px' : '70px' }}
      >
        {currentView !== View.MOBILE && currentView !== View.HOME && (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-30 print:hidden">
           <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {currentView}
                {isLoadingData && <Loader2 size={14} className="animate-spin text-blue-500" />}
              </h2>
           </div>
           
           <div className="flex items-center gap-4">
             {(currentView === View.KANBAN || currentView === View.LIST) && (
               <>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#003A70] transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar pelo título..." 
                    className="pl-9 pr-3 py-1.5 bg-gray-100 border border-transparent focus:bg-white focus:border-[#003A70] focus:ring-2 focus:ring-[#003A70]/20 rounded-lg text-xs font-medium w-48 transition-all outline-none placeholder:text-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <div className="flex items-center px-2 gap-2 border-r border-gray-300 pr-2">
                       <Filter size={14} className="text-gray-500"/>
                       <span className="text-xs font-semibold text-gray-600 uppercase">Filtros</span>
                    </div>
                    
                    <select 
                      className="bg-transparent text-xs p-1 outline-none min-w-[100px]"
                      value={filters.areaId}
                      onChange={(e) => setFilters({...filters, areaId: e.target.value})}
                    >
                      <option value="all">Todas Coord. Resp.</option>
                      {coordinations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select
                      className="bg-transparent text-xs p-1 outline-none min-w-[150px]"
                      value={filters.personId}
                      onChange={(e) => setFilters({...filters, personId: e.target.value})}
                    >
                      <option value="all">Todos Resp.</option>
                      {people.map(p => {
                        const coordination = coordinations.find(c => c.id === p.coordinationId);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} {coordination ? `(${coordination.name})` : ''}
                          </option>
                        );
                      })}
                    </select>

                    <button 
                        onClick={clearFilters}
                        className="ml-1 p-1.5 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                        title="Limpar Filtros"
                    >
                        <X size={14} />
                    </button>
                </div>
                
                {/* ... Export buttons ... */}
                <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-300">
                  <button onClick={handleExportCSV} className="p-2 text-gray-500 hover:text-[#003A70] hover:bg-blue-50 rounded-lg transition-colors" title="Exportar CSV">
                    <Download size={18} />
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-[#003A70] hover:bg-blue-50 rounded-lg transition-colors" title="Importar CSV">
                    <Upload size={18} />
                  </button>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv"
                    onChange={handleImportCSV}
                  />
                </div>
                
                <div className="flex gap-2 ml-2">
                  <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isAiLoading && !isRecording}
                      className={`
                         px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all
                         ${isRecording 
                            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}
                      `}
                      title="Nova Demanda por Voz"
                  >
                      {isAiLoading && !isRecording ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                      {isRecording ? 'Gravando...' : ''}
                  </button>

                  <button 
                    onClick={() => { 
                      setEditingDemandId(null); 
                      setDemandForm({ title: '', description: '', category: '', complexity: Complexity.LOW, effort: 0, areaId: '', requesterAreaId: '', personId: '', requesterName: '', type: undefined, agreedDeadline: '' });
                      setActiveModalTab('details');
                      setIsViewMode(false);
                      setIsFormModalOpen(true); 
                    }}
                    className="bg-[#003A70] hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
                    title="Criar nova demanda"
                  >
                    <Plus size={18} />
                    <span>Nova Demanda</span>
                  </button>
                </div>
               </>
             )}
           </div>
        </header>
        )}

        <div className={`flex-1 overflow-y-auto custom-scrollbar print:p-0 print:overflow-visible bg-[#f3f4f6] ${currentView === View.HOME ? 'p-8' : 'p-8'}`}>
           {isLoadingData || isConfigLoading ? (
                <div className="flex items-center justify-center h-full flex-col text-gray-400">
                    <Loader2 size={48} className="animate-spin mb-4 text-[#003A70]" />
                    <p>{isConfigLoading ? 'Carregando configurações...' : 'Carregando dados do sistema...'}</p>
                </div>
           ) : (
            <>
                {currentView === View.HOME && (
                  <HomeNavigation onNavigate={setCurrentView} />
                )}

                {/* RENDER MOBILE APP */}
                {currentView === View.MOBILE && (
                    <MobileApp 
                        demands={demands}
                        areas={coordinations}
                        people={people}
                        onNewDemand={handleMobileNewDemand}
                        isRecording={isRecording}
                        isAiLoading={isAiLoading}
                        onStartRecording={startRecording}
                        onStopRecording={stopRecording}
                    />
                )}

                {currentView === View.DASHBOARD && (
                    <Dashboard demands={demands} coordinations={coordinations} people={people} />
                )}

                {currentView === View.INSIGHTS && (
                    <InsightsPanel demands={demands} people={people} coordinations={coordinations} />
                )}

                {currentView === View.REPORT && (
                    <ExecutiveReport demands={demands} coordinations={coordinations} />
                )}

                {currentView === View.GANTT && (
                    <GanttChart demands={demands} people={people} coordinations={coordinations} onView={handleViewDemand} />
                )}
                
                {currentView === View.KANBAN && (
                    <KanbanBoard
                        demands={filteredDemands}
                        people={people}
                        coordinations={coordinations}
                        onStatusChange={handleStatusChange}
                        onEdit={canEdit ? handleEditDemand : handleViewDemand} 
                        onView={handleViewDemand}
                        onArchive={canArchive ? handleArchiveDemand : () => alert('Perfil sem permissão para arquivar.')}
                    />
                )}

                {currentView === View.LIST && (
                    <DemandList 
                        demands={filteredDemands} 
                        areas={areas} 
                        coordinations={coordinations} 
                        people={people} 
                        onEdit={canEdit ? handleEditDemand : handleViewDemand}
                        onView={handleViewDemand}
                        onArchive={canArchive ? handleArchiveDemand : () => {}} 
                        userRole={currentUser.role} 
                        onTogglePriority={canEdit ? handleTogglePriority : undefined}
                    />
                )}

                {currentView === View.ARCHIVED && (
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div className="flex">
                            <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Visualizando apenas itens arquivados/cancelados.
                            </p>
                            </div>
                        </div>
                        </div>
                        <DemandList
                            demands={filteredDemands}
                            areas={areas}
                            coordinations={coordinations}
                            people={people}
                            onEdit={handleViewDemand}
                            onView={handleViewDemand}
                            onArchive={() => {}}
                            userRole={currentUser.role}
                            onDelete={canArchive ? handleDeleteDemand : undefined}
                            onRestore={canArchive ? handleRestoreDemand : undefined}
                            isArchivedView={true}
                        />
                    </div>
                )}

                {currentView === View.SETTINGS && (
                    <SettingsPanel 
                        areas={areas} setAreas={setAreas}
                        coordinations={coordinations} setCoordinations={setCoordinations}
                        people={people} setPeople={setPeople}
                        categories={categories} setCategories={setCategories}
                    />
                )}

                {currentView === View.TUTORIAL && (
                    <Tutorial onNavigate={(view: any) => setCurrentView(view)} />
                )}
            </>
           )}
        </div>
      </main>
      
      {/* Modals Section (Form, Archive, SLA/Completion) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
          <div className={`bg-white rounded-xl shadow-2xl w-full ${editingDemandId ? 'max-w-4xl' : 'max-w-2xl'} flex flex-col max-h-[90vh] animate-scale-in overflow-hidden`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-[#003A70]">
                  {editingDemandId ? (isViewMode ? 'Detalhes da Demanda' : 'Editar Demanda') : 'Nova Demanda'}
                </h3>
                {!isViewMode && !editingDemandId && (
                    <button 
                        onClick={handleAiSuggest}
                        disabled={isAiLoading}
                        className="ml-4 flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        {isAiLoading ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
                        {isAiLoading ? 'Analisando...' : 'Sugestão IA'}
                    </button>
                )}
                {isViewMode && editingDemandId && canEdit && (
                  <button 
                    onClick={() => setIsViewMode(false)} 
                    className="text-xs flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full font-bold hover:bg-blue-100 transition-colors ml-2"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                )}
                {isViewMode && editingDemandId && canDelete && (
                  <button 
                    onClick={() => handleHardDelete(editingDemandId)} 
                    className="text-xs flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 rounded-full font-bold hover:bg-red-100 transition-colors ml-2"
                  >
                    <Trash2 size={12} /> Excluir Definitivamente
                  </button>
                )}
              </div>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Tabs (If editing/viewing) */}
            {editingDemandId && (
                <div className="flex border-b border-gray-200 bg-gray-50/30">
                    <button 
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeModalTab === 'details' ? 'border-[#003A70] text-[#003A70] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveModalTab('details')}
                    >
                        Detalhes
                    </button>
                    <button 
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeModalTab === 'history' ? 'border-[#003A70] text-[#003A70] bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveModalTab('history')}
                    >
                        Histórico & Logs
                    </button>
                </div>
            )}

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {activeModalTab === 'details' ? (
                  <form onSubmit={handleSaveDemand} className="space-y-5">
                    
                    {/* Field Group: Title */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        disabled={isViewMode}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003A70]/20 focus:border-[#003A70] outline-none transition-all text-sm font-medium disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="Resumo curto da demanda..."
                        value={demandForm.title}
                        onChange={(e) => setDemandForm({...demandForm, title: e.target.value})}
                      />
                    </div>

                    {/* Field Group: Description */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição Detalhada</label>
                      <textarea
                        rows={4}
                        disabled={isViewMode}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003A70]/20 focus:border-[#003A70] outline-none transition-all text-sm disabled:bg-gray-100 disabled:text-gray-500 resize-none"
                        placeholder="Descreva o que precisa ser feito..."
                        value={demandForm.description}
                        onChange={(e) => setDemandForm({...demandForm, description: e.target.value})}
                      />
                    </div>

                    {/* Row: Requester Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Solicitante (Nome)</label>
                            <input
                                type="text"
                                disabled={isViewMode}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003A70]/20 focus:border-[#003A70] outline-none text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                placeholder="Seu nome"
                                value={demandForm.requesterName}
                                onChange={(e) => setDemandForm({...demandForm, requesterName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Área Solicitante <span className="text-red-500">*</span></label>
                            <select
                                required
                                disabled={isViewMode}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003A70]/20 focus:border-[#003A70] outline-none text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
                                value={demandForm.requesterAreaId}
                                onChange={(e) => setDemandForm({...demandForm, requesterAreaId: e.target.value})}
                            >
                                <option value="">Selecione sua área...</option>
                                {areas.map(area => (
                                <option key={area.id} value={area.id}>{area.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-2"></div>

                    {/* Row: Technical Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coordenação Técnica (Destino) <span className="text-red-500">*</span></label>
                            <select
                                required
                                disabled={isViewMode}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003A70]/20 focus:border-[#003A70] outline-none text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
                                value={demandForm.areaId}
                                onChange={(e) => setDemandForm({...demandForm, areaId: e.target.value})}
                            >
                                <option value="">Selecione a área responsável...</option>
                                {coordinations.map(area => (
                                <option key={area.id} value={area.id}>{area.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Responsável Técnico</label>
                            <select
                                required
                                disabled={isViewMode}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003A70]/20 focus:border-[#003A70] outline-none text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
                                value={demandForm.personId}
                                onChange={(e) => setDemandForm({...demandForm, personId: e.target.value})}
                            >
                                <option value="">Selecione o responsável...</option>
                                {people
                                    .filter(p => demandForm.areaId ? p.coordinationId === demandForm.areaId : true)
                                    .map(person => {
                                        const coordination = coordinations.find(c => c.id === person.coordinationId);
                                        return (
                                            <option key={person.id} value={person.id}>
                                                {person.name} {coordination ? `• ${coordination.name}` : ''}
                                            </option>
                                        );
                                    })}
                            </select>
                        </div>
                    </div>

                    {/* Row: Classification (Optional override) */}
                    <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                         <div className="col-span-3 mb-1 flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-600 uppercase">Classificação Técnica</span>
                            {!isViewMode && <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200">Preenchimento Automático (IA) disponível</span>}
                         </div>
                         <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo</label>
                            <select
                                disabled={isViewMode}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100"
                                value={demandForm.type || ''}
                                onChange={(e) => setDemandForm({...demandForm, type: e.target.value as DemandType})}
                            >
                                <option value="">Automático</option>
                                <option value={DemandType.TASK}>Tarefa</option>
                                <option value={DemandType.SYSTEM}>Sistema</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Complexidade</label>
                            <select
                                disabled={isViewMode}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100"
                                value={demandForm.complexity}
                                onChange={(e) => setDemandForm({...demandForm, complexity: e.target.value as Complexity})}
                            >
                                {Object.values(Complexity).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Esforço (Horas)</label>
                            <input
                                type="number"
                                disabled={isViewMode}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-white disabled:bg-gray-100"
                                value={demandForm.effort}
                                onChange={(e) => setDemandForm({...demandForm, effort: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                     {/* Agreed Deadline Field */}
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prazo Combinado (Deadline)</label>
                        <input
                            type="date"
                            disabled={isViewMode}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003A70]/20 focus:border-[#003A70] outline-none text-sm font-medium disabled:bg-gray-100 disabled:text-gray-500"
                            value={demandForm.agreedDeadline || ''}
                            onChange={(e) => setDemandForm({...demandForm, agreedDeadline: e.target.value})}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Se definido, o sistema alertará sobre proximidade do vencimento.</p>
                    </div>
                    
                    {/* VISUALIZAÇÃO CAMPOS OBRIGATÓRIOS DE FIM DE FLUXO */}
                    {isViewMode && (demandForm.deliverySummary || demandForm.cancellationReason) && (
                        <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                            {demandForm.deliverySummary && (
                                <div className="bg-green-50 border border-green-100 p-3 rounded-lg">
                                    <div className="text-xs font-bold text-green-700 uppercase mb-1 flex items-center gap-2">
                                        <CheckCircle2 size={14}/> Resumo da Entrega
                                    </div>
                                    <p className="text-sm text-green-800">{demandForm.deliverySummary}</p>
                                </div>
                            )}
                             {demandForm.cancellationReason && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-lg">
                                    <div className="text-xs font-bold text-red-700 uppercase mb-1 flex items-center gap-2">
                                        <Trash2 size={14}/> Motivo do Cancelamento
                                    </div>
                                    <p className="text-sm text-red-800">{demandForm.cancellationReason}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {!isViewMode && (
                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsFormModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 text-sm font-bold text-white bg-[#003A70] hover:bg-blue-900 rounded-lg shadow-md shadow-blue-900/10 transition-all flex items-center gap-2"
                            >
                                {editingDemandId ? 'Salvar Alterações' : 'Criar Demanda'}
                            </button>
                        </div>
                    )}
                  </form>
              ) : (
                  <div className="space-y-6">
                      {/* LOGS VIEW */}
                      <div>
                          <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                             <CalendarClock size={16} className="text-[#003A70]"/> Linha do Tempo
                          </h4>
                          <div className="border-l-2 border-gray-200 ml-2 space-y-6 pl-6 relative">
                              {/* Current Status Marker */}
                              <div className="absolute -left-[5px] top-0 w-3 h-3 rounded-full bg-[#003A70] ring-4 ring-white"></div>
                              
                              {(demandForm.history || []).map((log, idx) => (
                                  <div key={idx} className="relative">
                                      <div className="absolute -left-[29px] top-1.5 w-2 h-2 rounded-full bg-gray-300"></div>
                                      <div className="flex flex-col">
                                          <span className="text-xs font-bold text-gray-600">{log.action}</span>
                                          <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleString('pt-BR')} por {log.user}</span>
                                          <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded border border-gray-100">
                                              {log.details}
                                          </p>
                                      </div>
                                  </div>
                              ))}
                              
                              {(!demandForm.history || demandForm.history.length === 0) && (
                                  <p className="text-sm text-gray-400 italic">Nenhum histórico registrado.</p>
                              )}
                          </div>
                      </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE / CANCEL MODAL */}
      {isCancelModalOpen && demandToCancel && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in">
               <div className="flex items-center gap-3 mb-4 text-red-600">
                  <AlertTriangle size={24} />
                  <h3 className="text-lg font-bold">Confirmar Arquivamento</h3>
               </div>
               <p className="text-sm text-gray-600 mb-4">
                  Você está prestes a cancelar/arquivar a demanda <strong>"{demandToCancel.title}"</strong>. 
                  Esta ação removerá o item do fluxo ativo.
               </p>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Justificativa Obrigatória</label>
               <textarea 
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:border-red-500 outline-none mb-4"
                  rows={3}
                  placeholder="Por que esta demanda está sendo cancelada?"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
               />
               <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => { setIsCancelModalOpen(false); setDemandToCancel(null); }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={() => handleArchiveDemand(demandToCancel, cancelReason)}
                    disabled={!cancelReason.trim()}
                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Arquivamento
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* COMPLETION MODAL (SLA CHECK) */}
      {isCompletionModalOpen && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in border-t-4 border-green-500">
               <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                   <CheckCircle2 className="text-green-500" /> Concluir Demanda
               </h3>
               
               {exceededSlaInfo ? (
                  <div className="bg-red-50 border border-red-100 p-3 rounded-lg mb-4">
                      <h4 className="text-xs font-bold text-red-700 uppercase mb-1 flex items-center gap-1">
                          <AlertTriangle size={12} /> SLA Excedido
                      </h4>
                      <p className="text-xs text-red-800 mb-2">
                          O tempo de execução ({exceededSlaInfo.actual}h) superou o limite de {exceededSlaInfo.allowed}h para esta categoria.
                      </p>
                  </div>
               ) : (
                  <p className="text-sm text-gray-600 mb-4">
                      Excelente! Vamos registrar a entrega desta demanda.
                  </p>
               )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Resumo da Entrega <span className="text-red-500">*</span></label>
                        <textarea 
                            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:border-green-500 outline-none"
                            rows={3}
                            placeholder="Descreva brevemente o que foi entregue..."
                            value={deliverySummary}
                            onChange={(e) => setDeliverySummary(e.target.value)}
                        />
                    </div>
                    
                    {exceededSlaInfo && (
                        <div>
                             <label className="block text-xs font-bold text-red-500 uppercase mb-1">Justificativa de Atraso (SLA) <span className="text-red-500">*</span></label>
                             <textarea 
                                className="w-full p-3 border border-red-300 bg-red-50 rounded-lg text-sm focus:border-red-500 outline-none"
                                rows={2}
                                placeholder="Por que o prazo foi excedido?"
                                value={slaJustification}
                                onChange={(e) => setSlaJustification(e.target.value)}
                            />
                        </div>
                    )}
                </div>

               <div className="flex justify-end gap-3 mt-6">
                  <button 
                    onClick={() => { setIsCompletionModalOpen(false); setPendingStatusUpdate(null); }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmCompletion}
                    disabled={!deliverySummary.trim() || (!!exceededSlaInfo && !slaJustification.trim())}
                    className="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Conclusão
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default App;
