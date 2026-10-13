/**
 * Webhook Greenn - Central de Funis Prosperus
 * Endpoint Serverless na Vercel: /api/webhook-greenn
 * Recebe notificações da Greenn (Abandono de Checkout, Pix Gerado, Compra Aprovada)
 * e salva/atualiza os dados na tabela 'quiz_leads' do Supabase.
 */

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gwheawbxoqohhqvxsvvi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_s6G_DXTsh_ZDAdXJQYG--w_pDAx72Lf';

// Função para requisições HTTPS nativas ao Supabase REST API (sem dependências externas)
function supabaseRequest(path, method = 'GET', body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        ...extraHeaders
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Normalização inteligente do identificador de funil
function resolveFunnelId(reqUrl, payload) {
  // 1. Checa query param na URL do webhook (?funil=...)
  const urlObj = new URL(reqUrl, 'http://localhost');
  const qFunil = urlObj.searchParams.get('funil') || urlObj.searchParams.get('funnel') || urlObj.searchParams.get('src');
  if (qFunil) {
    const qLower = qFunil.toLowerCase();
    if (qLower.includes('02') || qLower.includes('funil2') || qLower.includes('funil-02')) return 'prosperus_funil_02';
    if (qLower.includes('principal') || qLower.includes('site') || qLower.includes('prosperusif')) return 'prosperus_principal';
    if (qLower.includes('quiz') || qLower.includes('checkup')) return 'quiz_prosperus';
  }

  // 2. Checa parâmetros passados no checkout da Greenn
  const trackingStr = [
    payload.src || '',
    payload.sck || '',
    payload.utm_source || '',
    payload.utm_campaign || '',
    payload.tracking?.src || '',
    payload.producer_params || '',
    payload.offer_name || '',
    payload.product_name || '',
    payload.url || ''
  ].join(' ').toLowerCase();

  if (trackingStr.includes('prosperus-02') || trackingStr.includes('funil-02') || trackingStr.includes('funil02') || trackingStr.includes('prosperus_funil_02')) {
    return 'prosperus_funil_02';
  }
  if (trackingStr.includes('prosperus_principal') || trackingStr.includes('prosperus-principal') || trackingStr.includes('prosperusif') || trackingStr.includes('principal')) {
    return 'prosperus_principal';
  }
  if (trackingStr.includes('quiz') || trackingStr.includes('checkup')) {
    return 'quiz_prosperus';
  }

  // Padrão caso não venha informado: Prosperus Principal
  return 'prosperus_principal';
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Documentação e status do Webhook
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'Central de Funis - Greenn Webhook Endpoint',
      description: 'Pronto para receber notificações de compra e abandono de carrinho da Greenn',
      funnelUrls: {
        principal: 'https://central-de-funis-zeta.vercel.app/api/webhook-greenn?funil=prosperus_principal',
        funil_02: 'https://central-de-funis-zeta.vercel.app/api/webhook-greenn?funil=prosperus_funil_02',
        quiz: 'https://central-de-funis-zeta.vercel.app/api/webhook-greenn?funil=quiz_prosperus'
      }
    });
  }

  // POST: Processamento do evento da Greenn
  if (req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      console.log('🔔 [WEBHOOK GREENN RECEBIDO]:', JSON.stringify(data, null, 2));

      // Extrai dados do comprador
      const buyer = data.buyer || data.client || data.customer || {};
      const doc = (buyer.doc || buyer.cpf || buyer.document || data.doc || '').replace(/\D/g, '');
      const phone = (buyer.phone || buyer.cellphone || buyer.whatsapp || data.phone || '').replace(/\D/g, '');
      const email = (buyer.email || data.email || '').trim().toLowerCase();
      const name = buyer.name || buyer.nome || data.name || 'Lead Checkout Greenn';

      // Identifica status do evento
      const rawStatus = (data.status || data.event || data.current_status || '').toLowerCase();
      const amount = data.amount || data.total || data.price || '99.00';
      const formattedAmount = (typeof amount === 'number' && amount > 500) ? (amount / 100).toFixed(2) : String(amount);

      let finalStatus = 'Iniciou Checkout';
      if (rawStatus.includes('paid') || rawStatus.includes('approved') || rawStatus.includes('pago') || rawStatus.includes('comprou') || rawStatus.includes('sucesso')) {
        finalStatus = 'Comprou';
      } else if (rawStatus.includes('waiting') || rawStatus.includes('pend') || rawStatus.includes('pix_gerado') || rawStatus.includes('boleto')) {
        finalStatus = 'Aguardando Pagamento';
      } else if (rawStatus.includes('refund') || rawStatus.includes('cancel') || rawStatus.includes('chargeback') || rawStatus.includes('recusad')) {
        finalStatus = 'Cancelado';
      } else {
        // 'abandoned_cart', 'carrinho_abandonado', 'checkout_abandonado', etc.
        finalStatus = 'Iniciou Checkout';
      }

      // Identifica o funil de origem
      const funnelId = resolveFunnelId(req.url, data);
      const funnelLabels = {
        prosperus_principal: 'Prosperus Principal (www.prosperusif.com.br)',
        prosperus_funil_02: 'Prosperus Funil 02 (prosperus-02.vercel.app)',
        quiz_prosperus: 'Quiz Prosperus (prosperus-quiz.vercel.app)'
      };
      const funnelLabel = funnelLabels[funnelId] || funnelId;

      console.log(`🎯 Lead: ${name} | Telefone: ${phone} | Funil: ${funnelId} | Status: ${finalStatus}`);

      // 1. Procura se lead já existe no Supabase por Telefone ou Documento
      let existingLead = null;
      if (phone && phone.length >= 8) {
        const phoneSuffix = phone.slice(-8);
        const searchRes = await supabaseRequest(`/rest/v1/quiz_leads?whatsapp=ilike.*${phoneSuffix}*&order=id.desc&limit=1`);
        if (searchRes.status === 200 && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
          existingLead = searchRes.data[0];
        }
      }

      if (!existingLead && doc && doc.length >= 6) {
        const searchDocRes = await supabaseRequest(`/rest/v1/quiz_leads?email_documento=ilike.*${doc}*&order=id.desc&limit=1`);
        if (searchDocRes.status === 200 && Array.isArray(searchDocRes.data) && searchDocRes.data.length > 0) {
          existingLead = searchDocRes.data[0];
        }
      }

      // 2. Se já existe, atualiza status e valor
      if (existingLead) {
        const updatePayload = {
          status_lead: finalStatus,
          valor_pago: formattedAmount
        };

        // Tenta atualizar incluindo funil_id
        const updateRes = await supabaseRequest(
          `/rest/v1/quiz_leads?id=eq.${existingLead.id}`,
          'PATCH',
          { ...updatePayload, funil_id: funnelId },
          { 'Prefer': 'return=minimal' }
        );

        // Se der erro por falta da coluna funil_id, atualiza sem ela
        if (updateRes.status >= 400) {
          await supabaseRequest(
            `/rest/v1/quiz_leads?id=eq.${existingLead.id}`,
            'PATCH',
            updatePayload,
            { 'Prefer': 'return=minimal' }
          );
        }

        console.log(`✅ Lead #${existingLead.id} atualizado para '${finalStatus}' no funil ${funnelId}`);
      } else {
        // 3. Se NÃO existe (lead que foi direto da página de vendas para o checkout da Greenn), CRIA NOVO LEAD!
        const newLeadPayload = {
          nome: name,
          email_documento: doc || email || 'Checkout Greenn',
          whatsapp: phone || '',
          status_lead: finalStatus,
          valor_pago: formattedAmount,
          faixa_renda: 'Origem: ' + funnelLabel,
          capacidade_mensal: 'Checkout Greenn',
          acompanha_cpf: 'Greenn',
          qtd_bancos: 'Greenn'
        };

        // Tenta inserir incluindo funil_id
        let insertRes = await supabaseRequest(
          '/rest/v1/quiz_leads',
          'POST',
          [{ ...newLeadPayload, funil_id: funnelId }],
          { 'Prefer': 'return=representation' }
        );

        // Fallback sem funil_id caso a coluna não exista ainda
        if (insertRes.status >= 400) {
          insertRes = await supabaseRequest(
            '/rest/v1/quiz_leads',
            'POST',
            [newLeadPayload],
            { 'Prefer': 'return=representation' }
          );
        }

        console.log(`🎉 Novo lead criado no Supabase com sucesso no funil ${funnelId}!`);
      }

      return res.status(200).json({
        success: true,
        message: 'Evento Greenn processado com sucesso',
        funil_id: funnelId,
        status_lead: finalStatus,
        lead: { name, phone, doc, email }
      });

    } catch (err) {
      console.error('❌ Erro no processamento do webhook Greenn:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
