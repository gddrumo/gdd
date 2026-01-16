import React, { useState } from 'react';
import { Area, Coordination, Person, Category, SLAConfig, Complexity } from '../types';
import { api } from '../services/api';
import { Settings, Users, Briefcase, FolderOpen, Network, Trash2, Plus, X, Clock } from 'lucide-react';

type Props = {
  areas: Area[];
  setAreas: React.Dispatch<React.SetStateAction<Area[]>>;
  coordinations: Coordination[];
  setCoordinations: React.Dispatch<React.SetStateAction<Coordination[]>>;
  people: Person[];
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
};

const SettingsPanel: React.FC<Props> = ({
  areas,
  setAreas,
  coordinations,
  setCoordinations,
  people,
  setPeople,
  categories,
  setCategories,
}) => {
  // controle de abas
  const [activeTab, setActiveTab] = useState<'coordinations' | 'areas' | 'people' | 'categories' | 'slas'>('coordinations');

  // estado local de formulário
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaDesc, setNewAreaDesc] = useState('');
  const [newCoordName, setNewCoordName] = useState('');
  const [newCoordDesc, setNewCoordDesc] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonCoordinationId, setNewPersonCoordinationId] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSlaCategoryId, setNewSlaCategoryId] = useState<string>('');
  const [newSlaComplexity, setNewSlaComplexity] = useState<Complexity>(Complexity.LOW);
  const [newSlaHours, setNewSlaHours] = useState<number>(0);

  // loading de operações
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // você pode guardar SLAs num estado próprio se quiser
  const [slas, setSlas] = useState<SLAConfig[]>([]);

  // carregar SLAs na primeira vez que abrir o painel (se quiser)
  React.useEffect(() => {
    const loadSlas = async () => {
      try {
        const data = await api.config.getSlas();
        setSlas(data);
      } catch (err) {
        console.error('[SETTINGS] erro carregando SLAs', err);
      }
    };
    loadSlas();
  }, []);

  // ------------------ AREAS ------------------

  const handleAddArea = async () => {
    if (!newAreaName.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const created = await api.config.createArea({
        name: newAreaName.trim(),
        description: newAreaDesc.trim() || undefined
      });
      setAreas(prev => [...prev, created]);
      setNewAreaName('');
      setNewAreaDesc('');
    } catch (err: any) {
      console.error('[SETTINGS] erro ao criar area', err);
      setErrorMsg(err?.message || 'Erro ao criar área');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateArea = async (area: Area, newName: string) => {
    if (!newName.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const updated = await api.config.updateArea(area.id, { name: newName.trim() });
      setAreas(prev => prev.map(a => (a.id === area.id ? updated : a)));
    } catch (err: any) {
      console.error('[SETTINGS] erro ao atualizar area', err);
      setErrorMsg(err?.message || 'Erro ao atualizar área');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArea = async (area: Area) => {
    if (!window.confirm(`Excluir área "${area.name}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.config.deleteArea(area.id);
      setAreas(prev => prev.filter(a => a.id !== area.id));
    } catch (err: any) {
      console.error('[SETTINGS] erro ao deletar area', err);
      setErrorMsg(err?.message || 'Erro ao deletar área');
    } finally {
      setSaving(false);
    }
  };

  // ------------------ COORDINATIONS ------------------

  const handleAddCoordination = async () => {
    if (!newCoordName.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const created = await api.config.createCoordination({
        name: newCoordName.trim(),
        description: newCoordDesc.trim() || undefined
      });
      setCoordinations(prev => [...prev, created]);
      setNewCoordName('');
      setNewCoordDesc('');
    } catch (err: any) {
      console.error('[SETTINGS] erro ao criar coordenação', err);
      setErrorMsg(err?.message || 'Erro ao criar coordenação');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCoordination = async (coord: Coordination, newName: string) => {
    if (!newName.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const updated = await api.config.updateCoordination(coord.id, { name: newName.trim() });
      setCoordinations(prev => prev.map(c => (c.id === coord.id ? updated : c)));
    } catch (err: any) {
      console.error('[SETTINGS] erro ao atualizar coordenação', err);
      setErrorMsg(err?.message || 'Erro ao atualizar coordenação');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoordination = async (coord: Coordination) => {
    if (!window.confirm(`Excluir coordenação "${coord.name}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.config.deleteCoordination(coord.id);
      setCoordinations(prev => prev.filter(c => c.id !== coord.id));
    } catch (err: any) {
      console.error('[SETTINGS] erro ao deletar coordenação', err);
      setErrorMsg(err?.message || 'Erro ao deletar coordenação');
    } finally {
      setSaving(false);
    }
  };

  // ------------------ PEOPLE ------------------

  const handleAddPerson = async () => {
    if (!newPersonName.trim() || !newPersonCoordinationId) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const created = await api.config.createPerson({
        name: newPersonName.trim(),
        role: newPersonRole.trim() || undefined,
        email: newPersonEmail.trim() || undefined,
        coordinationId: newPersonCoordinationId,
      });
      setPeople(prev => [...prev, created]);
      setNewPersonName('');
      setNewPersonRole('');
      setNewPersonEmail('');
      setNewPersonCoordinationId('');
    } catch (err: any) {
      console.error('[SETTINGS] erro ao criar pessoa', err);
      setErrorMsg(err?.message || 'Erro ao criar pessoa');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePerson = async (person: Person, fields: Partial<Person>) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const updated = await api.config.updatePerson(person.id, {
        name: fields.name ?? person.name,
        role: fields.role ?? person.role,
        email: fields.email ?? person.email,
        coordinationId: fields.coordinationId ?? person.coordinationId,
      });
      setPeople(prev => prev.map(p => (p.id === person.id ? updated : p)));
    } catch (err: any) {
      console.error('[SETTINGS] erro ao atualizar pessoa', err);
      setErrorMsg(err?.message || 'Erro ao atualizar pessoa');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePerson = async (person: Person) => {
    if (!window.confirm(`Excluir pessoa "${person.name}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.config.deletePerson(person.id);
      setPeople(prev => prev.filter(p => p.id !== person.id));
    } catch (err: any) {
      console.error('[SETTINGS] erro ao deletar pessoa', err);
      setErrorMsg(err?.message || 'Erro ao deletar pessoa');
    } finally {
      setSaving(false);
    }
  };

  // ------------------ CATEGORIES ------------------

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const created = await api.config.createCategory({
        name: newCategoryName.trim(),
      });
      setCategories(prev => [...prev, created]);
      setNewCategoryName('');
    } catch (err: any) {
      console.error('[SETTINGS] erro ao criar categoria', err);
      setErrorMsg(err?.message || 'Erro ao criar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategory = async (cat: Category, fields: Partial<Category>) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const updated = await api.config.updateCategory(cat.id, {
        name: fields.name ?? cat.name,
      });
      setCategories(prev => prev.map(c => (c.id === cat.id ? updated : c)));
    } catch (err: any) {
      console.error('[SETTINGS] erro ao atualizar categoria', err);
      setErrorMsg(err?.message || 'Erro ao atualizar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!window.confirm(`Excluir categoria "${cat.name}"?`)) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.config.deleteCategory(cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      // também remove SLAs dessa categoria
      setSlas(prev => prev.filter(s => s.categoryId !== cat.id));
    } catch (err: any) {
      console.error('[SETTINGS] erro ao deletar categoria', err);
      setErrorMsg(err?.message || 'Erro ao deletar categoria');
    } finally {
      setSaving(false);
    }
  };

  // ------------------ SLAs ------------------

  const handleAddSla = async () => {
    if (!newSlaCategoryId || !newSlaHours) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const created = await api.config.createSla({
        categoryId: newSlaCategoryId,
        complexity: newSlaComplexity,
        slaHours: newSlaHours,
      });
      setSlas(prev => [...prev, created]);
      setNewSlaCategoryId('');
      setNewSlaHours(0);
      setNewSlaComplexity(Complexity.LOW);
    } catch (err: any) {
      console.error('[SETTINGS] erro ao criar SLA', err);
      setErrorMsg(err?.message || 'Erro ao criar SLA');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSla = async (sla: SLAConfig, fields: Partial<SLAConfig>) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const updated = await api.config.updateSla(sla.id, {
        categoryId: fields.categoryId ?? sla.categoryId,
        complexity: fields.complexity ?? sla.complexity,
        slaHours: fields.slaHours ?? sla.slaHours,
      });
      setSlas(prev => prev.map(s => (s.id === sla.id ? updated : s)));
    } catch (err: any) {
      console.error('[SETTINGS] erro ao atualizar SLA', err);
      setErrorMsg(err?.message || 'Erro ao atualizar SLA');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSla = async (sla: SLAConfig) => {
    if (!window.confirm('Excluir regra de SLA?')) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await api.config.deleteSla(sla.id);
      setSlas(prev => prev.filter(s => s.id !== sla.id));
    } catch (err: any) {
      console.error('[SETTINGS] erro ao deletar SLA', err);
      setErrorMsg(err?.message || 'Erro ao deletar SLA');
    } finally {
      setSaving(false);
    }
  };

  // Helper para obter iniciais do nome
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ------------------ RENDER ------------------

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <div className="p-2 bg-gray-200 text-gray-700 rounded-lg">
            <Settings size={24} />
          </div>
          <h1 className="text-xl font-bold text-[#003865]">Configurações do GDD</h1>
        </div>

        {saving && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
            <div className="text-sm text-blue-600 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-900"></div>
              Salvando...
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3">
            <p className="text-sm text-red-600">{errorMsg}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('coordinations')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors min-w-[180px] ${
              activeTab === 'coordinations'
                ? 'text-[#003865] border-b-2 border-[#003865] bg-blue-50/30'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Network size={18} /> Coord. Técnicas
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors min-w-[180px] ${
              activeTab === 'areas'
                ? 'text-[#003865] border-b-2 border-[#003865] bg-blue-50/30'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Briefcase size={18} /> Áreas Solicitantes
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors min-w-[180px] ${
              activeTab === 'people'
                ? 'text-[#003865] border-b-2 border-[#003865] bg-blue-50/30'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Users size={18} /> Pessoas
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors min-w-[180px] ${
              activeTab === 'categories'
                ? 'text-[#003865] border-b-2 border-[#003865] bg-blue-50/30'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <FolderOpen size={18} /> Categorias
          </button>
          <button
            onClick={() => setActiveTab('slas')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors min-w-[180px] ${
              activeTab === 'slas'
                ? 'text-[#003865] border-b-2 border-[#003865] bg-blue-50/30'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <Clock size={18} /> SLAs
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-8 bg-white">

          {/* ABA: COORDENAÇÕES TÉCNICAS */}
          {activeTab === 'coordinations' && (
            <div className="space-y-6">
              <div className="flex gap-4 items-end p-4 rounded-lg border bg-gray-50 border-gray-100">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Nome da Coordenação (Técnica)
                  </label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Ex: Desenvolvimento"
                    value={newCoordName}
                    onChange={e => setNewCoordName(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Descrição
                  </label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Responsabilidade do time"
                    value={newCoordDesc}
                    onChange={e => setNewCoordDesc(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNewCoordName('');
                      setNewCoordDesc('');
                    }}
                    className="bg-white text-gray-500 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 border border-gray-300 h-[38px]"
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={handleAddCoordination}
                    disabled={!newCoordName.trim()}
                    className="bg-[#003865] hover:bg-blue-900 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 h-[38px] min-w-[110px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coordinations.map(coord => (
                  <div
                    key={coord.id}
                    className="flex justify-between items-center p-4 border rounded-lg transition-all border-gray-200 hover:shadow-sm"
                  >
                    <div className="flex-1 mr-4">
                      <input
                        type="text"
                        defaultValue={coord.name}
                        className="font-bold text-gray-800 w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
                        onBlur={e => {
                          if (e.target.value !== coord.name) {
                            handleUpdateCoordination(coord, e.target.value);
                          }
                        }}
                      />
                      {coord.description && (
                        <p className="text-xs text-gray-500 mt-1">{coord.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDeleteCoordination(coord)}
                        className="text-gray-400 hover:text-red-500 p-2"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA: ÁREAS SOLICITANTES */}
          {activeTab === 'areas' && (
            <div className="space-y-6">
              <div className="flex gap-4 items-end p-4 rounded-lg border bg-gray-50 border-gray-100">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Nome da Área (Cliente)
                  </label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Ex: Marketing / RH"
                    value={newAreaName}
                    onChange={e => setNewAreaName(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Descrição
                  </label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Departamento"
                    value={newAreaDesc}
                    onChange={e => setNewAreaDesc(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNewAreaName('');
                      setNewAreaDesc('');
                    }}
                    className="bg-white text-gray-500 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 border border-gray-300 h-[38px]"
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={handleAddArea}
                    disabled={!newAreaName.trim()}
                    className="bg-[#003865] hover:bg-blue-900 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 h-[38px] min-w-[110px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {areas.map(area => (
                  <div
                    key={area.id}
                    className="flex justify-between items-center p-4 border rounded-lg transition-all border-gray-200 hover:shadow-sm"
                  >
                    <div className="flex-1 mr-4">
                      <input
                        type="text"
                        defaultValue={area.name}
                        className="font-bold text-gray-800 w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
                        onBlur={e => {
                          if (e.target.value !== area.name) {
                            handleUpdateArea(area, e.target.value);
                          }
                        }}
                      />
                      {area.description && (
                        <p className="text-xs text-gray-500 mt-1">{area.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDeleteArea(area)}
                        className="text-gray-400 hover:text-red-500 p-2"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA: PESSOAS */}
          {activeTab === 'people' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4 items-end p-4 rounded-lg border bg-gray-50 border-gray-100">
                <div className="flex-[2] min-w-[200px]">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nome</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Nome Completo"
                    value={newPersonName}
                    onChange={e => setNewPersonName(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Cargo</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Ex: Analista"
                    value={newPersonRole}
                    onChange={e => setNewPersonRole(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="email@exemplo.com"
                    value={newPersonEmail}
                    onChange={e => setNewPersonEmail(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Coordenação</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    value={newPersonCoordinationId}
                    onChange={e => setNewPersonCoordinationId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {coordinations.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNewPersonName('');
                      setNewPersonRole('');
                      setNewPersonEmail('');
                      setNewPersonCoordinationId('');
                    }}
                    className="bg-white text-gray-500 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 border border-gray-300 h-[38px]"
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={handleAddPerson}
                    disabled={!newPersonName.trim() || !newPersonCoordinationId}
                    className="bg-[#003865] hover:bg-blue-900 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 h-[38px] min-w-[110px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {people.map(person => {
                  const personCoordination = coordinations.find(c => c.id === person.coordinationId);
                  return (
                    <div
                      key={person.id}
                      className="flex justify-between items-start p-4 border rounded-lg transition-all bg-white border-gray-200 hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3 flex-1 mr-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {getInitials(person.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            defaultValue={person.name}
                            className="font-bold text-sm text-gray-800 w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
                            onBlur={e => {
                              if (e.target.value !== person.name) {
                                handleUpdatePerson(person, { name: e.target.value });
                              }
                            }}
                          />
                          {person.role && (
                            <p className="text-[10px] text-gray-500 mt-1">{person.role}</p>
                          )}
                          {person.email && (
                            <p className="text-[10px] text-gray-400 truncate">{person.email}</p>
                          )}
                          {personCoordination && (
                            <span className="inline-block mt-2 text-[10px] px-1.5 py-0.5 bg-blue-100 rounded text-blue-700 font-medium">
                              {personCoordination.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDeletePerson(person)}
                          className="text-gray-400 hover:text-red-500 p-1"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ABA: CATEGORIAS */}
          {activeTab === 'categories' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex gap-4 items-end p-4 rounded-lg border bg-gray-50 border-gray-100">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Nova Categoria
                  </label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Ex: Marketing Digital"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewCategoryName('')}
                    className="bg-white text-gray-500 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 border border-gray-300 h-[38px]"
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategoryName.trim()}
                    className="bg-[#003865] hover:bg-blue-900 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 h-[38px] min-w-[110px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    className="flex justify-between items-center p-3 border rounded-lg transition-colors border-gray-200 hover:bg-gray-50"
                  >
                    <input
                      type="text"
                      defaultValue={cat.name}
                      className="flex-1 font-medium text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
                      onBlur={e => {
                        if (e.target.value !== cat.name) {
                          handleUpdateCategory(cat, { name: e.target.value });
                        }
                      }}
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="text-gray-400 hover:text-red-500 p-2"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA: SLAs */}
          {activeTab === 'slas' && (
            <div className="space-y-6 max-w-3xl">
              <div className="flex flex-wrap gap-4 items-end p-4 rounded-lg border bg-gray-50 border-gray-100">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Categoria
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    value={newSlaCategoryId}
                    onChange={e => setNewSlaCategoryId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Complexidade
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    value={newSlaComplexity}
                    onChange={e => setNewSlaComplexity(e.target.value as Complexity)}
                  >
                    {Object.values(Complexity).map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                    Horas
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="0"
                    value={newSlaHours || ''}
                    onChange={e => setNewSlaHours(Number(e.target.value))}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNewSlaCategoryId('');
                      setNewSlaComplexity(Complexity.LOW);
                      setNewSlaHours(0);
                    }}
                    className="bg-white text-gray-500 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 border border-gray-300 h-[38px]"
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={handleAddSla}
                    disabled={!newSlaCategoryId || !newSlaHours}
                    className="bg-[#003865] hover:bg-blue-900 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 h-[38px] min-w-[110px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {slas.map(sla => {
                  const cat = categories.find(c => c.id === sla.categoryId);
                  return (
                    <div
                      key={sla.id}
                      className="flex flex-wrap items-center gap-3 p-4 border rounded-lg transition-colors border-gray-200 hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-[180px]">
                        <span className="font-medium text-gray-700">
                          {cat ? cat.name : `Categoria ${sla.categoryId}`}
                        </span>
                      </div>
                      <div className="min-w-[140px]">
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white"
                          defaultValue={sla.complexity}
                          onChange={e =>
                            handleUpdateSla(sla, { complexity: e.target.value as Complexity })
                          }
                        >
                          {Object.values(Complexity).map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          defaultValue={sla.slaHours}
                          className="w-20 px-3 py-2 border border-gray-300 rounded text-sm"
                          onBlur={e => {
                            if (Number(e.target.value) !== sla.slaHours) {
                              handleUpdateSla(sla, { slaHours: Number(e.target.value) });
                            }
                          }}
                        />
                        <span className="text-sm text-gray-500">horas</span>
                      </div>
                      <button
                        onClick={() => handleDeleteSla(sla)}
                        className="text-gray-400 hover:text-red-500 p-2"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
