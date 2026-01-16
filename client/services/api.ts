import { Demand, Area, Person, Category, SLAConfig, Complexity, Coordination } from '../types';

// ========================================
// CONFIGURAÇÃO DE API COM DEBUG
// ========================================
// ========================================
// CONFIGURAÇÃO DE API COM DEBUG
// ========================================
const getApiBase = () => {
  // 1. Prioridade Máxima: Variável de Ambiente (.env ou Vercel)
  // Isso garante que no Vercel ele pegue o link do Render
  const envUrl = (import.meta as any).env.VITE_API_URL;
  
  if (envUrl) {
    console.log('[API] Usando configuração do ambiente:', envUrl);
    return envUrl;
  }

  // -----------------------------------------------------------
  // Lógica de Fallback (Caso esqueça de configurar o .env)
  // -----------------------------------------------------------
  if (typeof window === 'undefined') return '/api';

  const { protocol, hostname, port } = window.location;

  // Localhost (Fallback)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const apiUrl = port === '8080' ? '/api' : `${protocol}//${hostname}:8080/api`;
    console.log('[API] Fallback Localhost:', apiUrl);
    return apiUrl;
  }

  // Fallback padrão
  return '/api';
};

const API_BASE = getApiBase();

// ========================================
// FETCH COM TIMEOUT E LOG
// ========================================
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log(`[API FETCH] ${options.method || 'GET'} ${url}`);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: 'no-store', // Nunca usar cache do navegador
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(id);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[API ERROR] ${response.status} ${response.statusText}:`,
        errorText
      );
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log(
      `[API SUCCESS] ${options.method || 'GET'} ${url} - ${response.status}`
    );
    return response;
  } catch (error: any) {
    clearTimeout(id);

    if (error.name === 'AbortError') {
      console.error(
        `[API TIMEOUT] Request timeout after ${timeoutMs}ms:`,
        url
      );
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }

    console.error('[API NETWORK ERROR]:', error);
    throw error;
  }
};

// ========================================
// FUNÇÕES DE TESTE / DIAGNÓSTICO
// ========================================
export const testConnection = async (): Promise<{
  ok: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('[API TEST] Testando conexão com backend...');
    const response = await fetchWithTimeout(`${API_BASE}/health`, {}, 5000);
    const data = await response.json();
    console.log('[API TEST] ✓ Conexão OK:', data);
    return { ok: true, message: 'Conexão estabelecida', details: data };
  } catch (error: any) {
    console.error('[API TEST] ✗ Falha na conexão:', error.message);
    return { ok: false, message: error.message };
  }
};

export const testCrudPermissions = async (): Promise<{
  ok: boolean;
  permissions?: any;
  error?: string;
}> => {
  try {
    console.log('[API TEST] Testando permissões CRUD...');
    const response = await fetchWithTimeout(
      `${API_BASE}/test-crud`,
      {},
      15000
    );
    const data = await response.json();
    console.log('[API TEST] Resultado dos testes:', data);
    return data;
  } catch (error: any) {
    console.error('[API TEST] ✗ Erro no teste CRUD:', error.message);
    return { ok: false, error: error.message };
  }
};

// ========================================
// API SERVICE
// ========================================
export const api = {
  test: {
    connection: testConnection,
    crudPermissions: testCrudPermissions,
  },

  // Authentication
  auth: {
    login: async (profileType: 'GESTAO' | 'TIME', password: string): Promise<{ success: boolean; user?: any; error?: string }> => {
      try {
        const response = await fetchWithTimeout(`${API_BASE}/auth/login`, {
          method: 'POST',
          body: JSON.stringify({ profileType, password })
        }, 5000);
        return await response.json();
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  },

  config: {
    // ===== ÁREAS =====
    getAreas: async (): Promise<Area[]> => {
      const response = await fetchWithTimeout(`${API_BASE}/areas`);
      return await response.json();
    },

    createArea: async (data: { name: string; description?: string }): Promise<Area> => {
      const response = await fetchWithTimeout(`${API_BASE}/areas`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return await response.json();
    },

    updateArea: async (
      id: string,
      data: Partial<Pick<Area, 'name' | 'description'>>
    ): Promise<Area> => {
      const response = await fetchWithTimeout(`${API_BASE}/areas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return await response.json();
    },

    deleteArea: async (id: string): Promise<void> => {
      await fetchWithTimeout(`${API_BASE}/areas/${id}`, {
        method: 'DELETE',
      });
    },

    // ===== COORDINATIONS =====
    getCoordinations: async (): Promise<Coordination[]> => {
      const response = await fetchWithTimeout(`${API_BASE}/coordinations`);
      return await response.json();
    },

    createCoordination: async (data: { name: string; description?: string }): Promise<Coordination> => {
      const response = await fetchWithTimeout(`${API_BASE}/coordinations`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return await response.json();
    },

    updateCoordination: async (
      id: string,
      data: Partial<Pick<Coordination, 'name' | 'description'>>
    ): Promise<Coordination> => {
      const response = await fetchWithTimeout(`${API_BASE}/coordinations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return await response.json();
    },

    deleteCoordination: async (id: string): Promise<void> => {
      await fetchWithTimeout(`${API_BASE}/coordinations/${id}`, {
        method: 'DELETE',
      });
    },

    // ===== PEOPLE =====
    getPeople: async (): Promise<Person[]> => {
      const response = await fetchWithTimeout(`${API_BASE}/people`);
      return await response.json();
    },

    createPerson: async (data: {
      name: string;
      role?: string;
      coordinationId?: string;
      email?: string;
    }): Promise<Person> => {
      const response = await fetchWithTimeout(`${API_BASE}/people`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return await response.json();
    },

    updatePerson: async (
      id: string,
      data: Partial<Pick<Person, 'name' | 'role' | 'coordinationId' | 'email'>>
    ): Promise<Person> => {
      const response = await fetchWithTimeout(`${API_BASE}/people/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return await response.json();
    },

    deletePerson: async (id: string): Promise<void> => {
      await fetchWithTimeout(`${API_BASE}/people/${id}`, {
        method: 'DELETE',
      });
    },

    // ===== CATEGORIAS =====
    getCategories: async (): Promise<Category[]> => {
      const response = await fetchWithTimeout(`${API_BASE}/categories`);
      return await response.json();
    },

    createCategory: async (data: {
      name: string;
    }): Promise<Category> => {
      const response = await fetchWithTimeout(`${API_BASE}/categories`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return await response.json();
    },


    updateCategory: async (
      id: string,
      data: Partial<Pick<Category, 'name'>>
    ): Promise<Category> => {
      const response = await fetchWithTimeout(`${API_BASE}/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return await response.json();
    },


    deleteCategory: async (id: string): Promise<void> => {
      await fetchWithTimeout(`${API_BASE}/categories/${id}`, {
        method: 'DELETE',
      });
    },

    // ===== SLAs =====
    getSlas: async (): Promise<SLAConfig[]> => {
      const response = await fetchWithTimeout(`${API_BASE}/slas`);
      return await response.json();
    },

    createSla: async (data: {
      categoryId: string;
      complexity: Complexity;
      slaHours: number;
    }): Promise<SLAConfig> => {
      const response = await fetchWithTimeout(`${API_BASE}/slas`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return await response.json();
    },

    updateSla: async (
      id: string,
      data: Partial<Pick<SLAConfig, 'categoryId' | 'complexity' | 'slaHours'>>
    ): Promise<SLAConfig> => {
      const response = await fetchWithTimeout(`${API_BASE}/slas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return await response.json();
    },

    deleteSla: async (id: string): Promise<void> => {
      await fetchWithTimeout(`${API_BASE}/slas/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // ---------------- DEMANDS ----------------
  demands: {
    getAll: async (): Promise<Demand[]> => {
      console.log('[DEMANDS API] Buscando todas as demandas...');
      const response = await fetchWithTimeout(
        `${API_BASE}/demands`,
        {},
        15000
      );
      const data = await response.json();
      console.log(`[DEMANDS API] ✓ ${data.length} demandas carregadas`);
      return data;
    },

    create: async (demand: Demand): Promise<Demand> => {
      console.log('[DEMANDS API] Criando demanda:', demand.id);
      const response = await fetchWithTimeout(
        `${API_BASE}/demands`,
        {
          method: 'POST',
          body: JSON.stringify(demand),
        },
        15000
      );
      const created = await response.json();
      console.log('[DEMANDS API] ✓ Demanda criada:', created.id);
      return created;
    },

    update: async (demand: Demand): Promise<Demand> => {
      console.log('[DEMANDS API] Atualizando demanda:', demand.id);
      const response = await fetchWithTimeout(
        `${API_BASE}/demands/${demand.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(demand),
        },
        15000
      );
      const updated = await response.json();
      console.log('[DEMANDS API] ✓ Demanda atualizada:', updated.id);
      return updated;
    },

    delete: async (id: string): Promise<void> => {
      console.log('[DEMANDS API] Deletando demanda:', id);
      await fetchWithTimeout(
        `${API_BASE}/demands/${id}`,
        {
          method: 'DELETE',
        },
        10000
      );
      console.log('[DEMANDS API] ✓ Demanda deletada:', id);
    },
  },
};
