/**
 * Central de Funis - Prosperus Inteligência Financeira
 * supabaseConfig.js - Configuração e Cliente Supabase
 * Conectado à tabela 'quiz_leads' com suporte a múltiplos funis via coluna 'funil_id'
 */

(function (global) {
  // Credenciais do Supabase (conectado ao projeto Prosperus)
  const SUPABASE_URL = (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)) 
    || "https://gwheawbxoqohhqvxsvvi.supabase.co";

  const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)) 
    || "sb_publishable_s6G_DXTsh_ZDAdXJQYG--w_pDAx72Lf";

  // Nome da tabela principal no Supabase
  const TABLE_NAME = "quiz_leads";

  // Mapeamento e Configuração de Funis
  const FUNNEL_DEFINITIONS = {
    all: {
      id: "all",
      name: "Visão Geral (Todos os Funis)",
      shortName: "Todos os Funis",
      aliases: ["all", "todos"],
      icon: "fa-layer-group",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300"
    },
    quiz_prosperus: {
      id: "quiz_prosperus",
      name: "Funil 1: Quiz Prosperus",
      shortName: "Quiz Prosperus",
      aliases: ["quiz", "funil_1", "funil1", "quiz_prosperus", "quiz-prosperus", "checkup"],
      icon: "fa-clipboard-question",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300"
    },
    informativo_venda: {
      id: "informativo_venda",
      name: "Funil 2: Informativo / Venda",
      shortName: "Informativo / Venda",
      aliases: ["venda", "vendas", "funil_2", "funil2", "informativo", "informativo_venda", "pagina_venda"],
      icon: "fa-file-invoice-dollar",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300"
    }
  };

  /**
   * Normaliza qualquer valor de funil_id vindo do Supabase ou de formulários
   * para um identificador canônico conhecido.
   */
  function normalizeFunnelId(rawId) {
    if (!rawId || typeof rawId !== 'string') return "quiz_prosperus"; // Padrão para leads legados
    const lower = rawId.trim().toLowerCase();

    for (const [key, def] of Object.entries(FUNNEL_DEFINITIONS)) {
      if (key === lower || def.aliases.includes(lower)) {
        return key;
      }
    }
    return lower;
  }

  /**
   * Retorna os metadados visuais de um funil para badges e títulos
   */
  function getFunnelMeta(funilId) {
    const canonical = normalizeFunnelId(funilId);
    if (FUNNEL_DEFINITIONS[canonical]) {
      return FUNNEL_DEFINITIONS[canonical];
    }
    return {
      id: canonical,
      name: `Funil: ${canonical}`,
      shortName: canonical,
      aliases: [canonical],
      icon: "fa-filter",
      badgeClass: "bg-purple-50 text-purple-800 border-purple-200"
    };
  }

  // Instância singleton do cliente Supabase
  let _client = null;

  function getSupabaseClient() {
    if (_client) return _client;

    const spLib = (typeof window !== 'undefined' && window.supabase) 
      || (typeof global !== 'undefined' && global.supabase) 
      || null;

    if (spLib && typeof spLib.createClient === 'function') {
      try {
        _client = spLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } catch (err) {
        console.error("⚠️ Erro ao instanciar cliente Supabase:", err);
      }
    } else {
      console.warn("⚠️ Biblioteca Supabase JS não carregada ainda na página.");
    }
    return _client;
  }

  /**
   * Busca todos os leads na tabela 'quiz_leads'
   */
  async function fetchAllLeads() {
    const client = getSupabaseClient();
    if (!client) throw new Error("Cliente Supabase não está pronto.");

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(lead => ({
      ...lead,
      funil_id: lead.funil_id || 'quiz_prosperus',
      status_lead: lead.status_lead || 'Preencheu Formulário'
    }));
  }

  /**
   * Atualiza o status de um lead no Supabase
   */
  async function updateLeadStatus(leadId, newStatus, valorPago = null) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Cliente Supabase não disponível.");

    const updatePayload = { status_lead: newStatus };
    if (valorPago !== null && valorPago !== undefined) {
      updatePayload.valor_pago = String(valorPago);
    }

    const { data, error } = await client
      .from(TABLE_NAME)
      .update(updatePayload)
      .eq('id', leadId);

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza o funil de origem de um lead no Supabase
   */
  async function updateLeadFunnel(leadId, newFunilId) {
    const client = getSupabaseClient();
    if (!client) throw new Error("Cliente Supabase não disponível.");

    const { data, error } = await client
      .from(TABLE_NAME)
      .update({ funil_id: newFunilId })
      .eq('id', leadId);

    if (error) throw error;
    return data;
  }

  // Exportação no escopo Global do Browser
  global.PROSPERUS_SUPABASE_URL = SUPABASE_URL;
  global.PROSPERUS_SUPABASE_KEY = SUPABASE_ANON_KEY;
  global.PROSPERUS_TABLE_NAME = TABLE_NAME;
  global.FUNNEL_DEFINITIONS = FUNNEL_DEFINITIONS;
  global.normalizeFunnelId = normalizeFunnelId;
  global.getFunnelMeta = getFunnelMeta;
  global.getSupabaseClient = getSupabaseClient;
  global.fetchAllLeads = fetchAllLeads;
  global.updateLeadStatus = updateLeadStatus;
  global.updateLeadFunnel = updateLeadFunnel;

  // Exportação para Node.js / Bundlers
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      TABLE_NAME,
      FUNNEL_DEFINITIONS,
      normalizeFunnelId,
      getFunnelMeta,
      getSupabaseClient,
      fetchAllLeads,
      updateLeadStatus,
      updateLeadFunnel
    };
  }
})(typeof window !== 'undefined' ? window : global);
