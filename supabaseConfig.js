/**
 * Central de Funis - Prosperus Inteligência Financeira
 * supabaseConfig.js - Configuração e Cliente Supabase Multi-Funil
 * Gerenciamento comparativo entre:
 * 1. Prosperus Principal (https://www.prosperusif.com.br/)
 * 2. Prosperus Funil 02 (https://prosperus-02.vercel.app/)
 * 3. Quiz Prosperus (https://prosperus-quiz.vercel.app/)
 */

(function (global) {
  // Credenciais Supabase (projeto oficial Prosperus)
  const SUPABASE_URL = (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)) 
    || "https://gwheawbxoqohhqvxsvvi.supabase.co";

  const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)) 
    || "sb_publishable_s6G_DXTsh_ZDAdXJQYG--w_pDAx72Lf";

  // Nome da tabela principal no Supabase
  const TABLE_NAME = "quiz_leads";

  // Definições oficiais dos funis e páginas de vendas
  const FUNNEL_DEFINITIONS = {
    all: {
      id: "all",
      name: "Visão Geral (Todos os Funis)",
      shortName: "Visão Geral",
      subtitle: "Todas as páginas consolidadas",
      url: "",
      domain: "Geral",
      aliases: ["all", "todos", "geral"],
      icon: "fa-layer-group",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      accentColor: "#062E20"
    },
    prosperus_principal: {
      id: "prosperus_principal",
      name: "Funil 1: Prosperus Principal",
      shortName: "Funil 1: Principal",
      subtitle: "Página Oficial de Vendas",
      url: "https://www.prosperusif.com.br/",
      domain: "www.prosperusif.com.br",
      aliases: [
        "principal", 
        "prosperus-principal", 
        "prosperus_principal", 
        "prosperusif", 
        "prosperusif.com.br", 
        "site_oficial", 
        "landing_principal",
        "properus-vercel",
        "funil_1",
        "funil 1",
        "funil1"
      ],
      icon: "fa-building-columns",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      tagClass: "bg-emerald-600 text-white",
      accentColor: "#062E20"
    },
    prosperus_funil_02: {
      id: "prosperus_funil_02",
      name: "Funil 2: Prosperus Funil 02",
      shortName: "Funil 2: Funil 02",
      subtitle: "Página de Venda Alternativa",
      url: "https://prosperus-02.vercel.app/",
      domain: "prosperus-02.vercel.app",
      aliases: [
        "funil-02", 
        "funil_02", 
        "funil2", 
        "prosperus-02", 
        "prosperus_02", 
        "prosperus-funil-02", 
        "prosperus_funil_02", 
        "venda", 
        "informativo_venda", 
        "funil_2",
        "funil 2"
      ],
      icon: "fa-bolt",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
      tagClass: "bg-amber-600 text-white",
      accentColor: "#C59B27"
    },
    quiz_prosperus: {
      id: "quiz_prosperus",
      name: "Funil 3: Quiz Prosperus",
      shortName: "Funil 3: Quiz",
      subtitle: "Diagnóstico Interativo 7 Etapas",
      url: "https://prosperus-quiz.vercel.app/",
      domain: "prosperus-quiz.vercel.app",
      aliases: [
        "quiz", 
        "quiz_prosperus", 
        "quiz-prosperus", 
        "checkup", 
        "diagnostico",
        "funil_3",
        "funil 3",
        "funil3"
      ],
      icon: "fa-clipboard-question",
      badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
      tagClass: "bg-purple-600 text-white",
      accentColor: "#6B21A8"
    }
  };

  /**
   * Normaliza qualquer string ou chave de funil para o ID canônico
   */
  function normalizeFunnelId(rawId) {
    if (!rawId || typeof rawId !== 'string') return "prosperus_principal";
    const lower = rawId.trim().toLowerCase();

    for (const [key, def] of Object.entries(FUNNEL_DEFINITIONS)) {
      if (key === lower || def.aliases.includes(lower)) {
        return key;
      }
    }
    return lower;
  }

  /**
   * Detecta inteligentemente a página de origem de um lead
   * a partir do funil_id, origem_url, url ou parâmetros UTM
   */
  function detectLeadOrigin(lead) {
    if (!lead) return "prosperus_principal";

    // 1. Checa override local (caso o usuário tenha editado manualmente na sessão)
    if (typeof localStorage !== 'undefined') {
      const localOverride = localStorage.getItem('prosperus_lead_funnel_' + lead.id);
      if (localOverride) return localOverride;
    }

    // 2. Se possuir funil_id explícito salvo
    if (lead.funil_id) {
      const norm = normalizeFunnelId(lead.funil_id);
      if (norm && norm !== 'all') return norm;
    }

    // 3. Checa faixa_renda caso venha com identificação de origem gravada pelo webhook
    const rendaStr = String(lead.faixa_renda || '').toLowerCase();
    if (rendaStr.includes('funil 02') || rendaStr.includes('prosperus-02') || rendaStr.includes('funil-02')) {
      return 'prosperus_funil_02';
    }
    if (rendaStr.includes('principal') || rendaStr.includes('prosperusif') || rendaStr.includes('www.prosperusif')) {
      return 'prosperus_principal';
    }
    if (rendaStr.includes('quiz') || rendaStr.includes('checkup')) {
      return 'quiz_prosperus';
    }

    // 4. Checa campo origem_url ou url
    const urlStr = String(lead.origem_url || lead.url || '').toLowerCase();
    if (urlStr.includes('prosperus-02') || urlStr.includes('funil-02') || urlStr.includes('funil02')) {
      return 'prosperus_funil_02';
    }
    if (urlStr.includes('prosperusif.com.br') || urlStr.includes('properus-vercel') || urlStr.includes('principal')) {
      return 'prosperus_principal';
    }
    if (urlStr.includes('prosperus-quiz') || urlStr.includes('quiz')) {
      return 'quiz_prosperus';
    }

    // 5. Checa UTMs caso existam
    const utm = String(lead.utm_source || lead.utm_campaign || '').toLowerCase();
    if (utm.includes('funil02') || utm.includes('funil-02') || utm.includes('prosperus-02')) {
      return 'prosperus_funil_02';
    }
    if (utm.includes('principal') || utm.includes('site')) {
      return 'prosperus_principal';
    }

    // 6. Se o lead tiver preenchido respostas específicas das 7 etapas do Quiz
    if (lead.faixa_renda && lead.capacidade_mensal && lead.acompanha_cpf && !lead.capacidade_mensal.includes('Checkout')) {
      return 'quiz_prosperus';
    }

    // 6. Padrão: Prosperus Principal
    return 'prosperus_principal';
  }

  /**
   * Retorna os metadados visuais de um funil para badges, links e títulos
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
      subtitle: "Personalizado",
      url: "#",
      domain: canonical,
      aliases: [canonical],
      icon: "fa-filter",
      badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
      tagClass: "bg-gray-700 text-white",
      accentColor: "#374151"
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
   * Busca todos os leads na tabela 'quiz_leads' com detecção de origem
   */
  async function fetchAllLeads() {
    const client = getSupabaseClient();
    if (!client) throw new Error("Cliente Supabase não está pronto.");

    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(lead => {
      const detectedFunnel = detectLeadOrigin(lead);
      return {
        ...lead,
        funil_id: detectedFunnel,
        status_lead: lead.status_lead || 'Preencheu Formulário'
      };
    });
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
   * Atualiza o funil de origem de um lead no Supabase e persiste em localStorage
   */
  async function updateLeadFunnel(leadId, newFunilId) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('prosperus_lead_funnel_' + leadId, newFunilId);
    }

    const client = getSupabaseClient();
    if (!client) return;

    try {
      await client
        .from(TABLE_NAME)
        .update({ funil_id: newFunilId })
        .eq('id', leadId);
    } catch (e) {
      console.warn("Coluna funil_id pode não estar habilitada no Supabase ainda:", e.message);
    }
  }

  // Exportação no escopo Global do Browser
  global.PROSPERUS_SUPABASE_URL = SUPABASE_URL;
  global.PROSPERUS_SUPABASE_KEY = SUPABASE_ANON_KEY;
  global.PROSPERUS_TABLE_NAME = TABLE_NAME;
  global.FUNNEL_DEFINITIONS = FUNNEL_DEFINITIONS;
  global.normalizeFunnelId = normalizeFunnelId;
  global.detectLeadOrigin = detectLeadOrigin;
  global.getFunnelMeta = getFunnelMeta;
  global.getSupabaseClient = getSupabaseClient;
  global.fetchAllLeads = fetchAllLeads;
  global.updateLeadStatus = updateLeadStatus;
  global.updateLeadFunnel = updateLeadFunnel;

  // Exportação para Node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      TABLE_NAME,
      FUNNEL_DEFINITIONS,
      normalizeFunnelId,
      detectLeadOrigin,
      getFunnelMeta,
      getSupabaseClient,
      fetchAllLeads,
      updateLeadStatus,
      updateLeadFunnel
    };
  }
})(typeof window !== 'undefined' ? window : global);
