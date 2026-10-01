// ══════════════════════════════════════════════════════════
// MCP Server — 3cos CRM (Model Context Protocol)
// ══════════════════════════════════════════════════════════
// Expõe os dados do CRM (schema crm) via protocolo MCP para clientes
// como Claude Desktop, Cursor, Zed, Claude Code — permitindo que
// assistentes IA consultem contatos, pipeline, produtos etc.
//
// Transport: HTTP (JSON-RPC 2.0)
// Endpoint: POST /api/mcp
// Auth: Authorization: Bearer <MCP_API_KEY>
//
// Env vars obrigatórias:
//   MCP_API_KEY           — token compartilhado pros clientes
//   SUPABASE_URL          — mesma URL do app
//   SUPABASE_SERVICE_KEY  — service_role (acesso privilegiado ao crm schema)
//
// Como conectar no Claude Desktop (claude_desktop_config.json):
//   {
//     "mcpServers": {
//       "3cos": {
//         "transport": "http",
//         "url": "https://<seu-vercel>.vercel.app/api/mcp",
//         "headers": { "Authorization": "Bearer <MCP_API_KEY>" }
//       }
//     }
//   }
// ══════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = {
  name: '3cos-mcp',
  version: '1.0.0',
};

// Lazy init do Supabase (usa service key pra bypassa RLS, mas confinado ao schema crm)
let _sb = null;
function sb() {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured');
  _sb = createClient(url, key, { db: { schema: 'crm' }, auth: { persistSession: false } });
  return _sb;
}

// ══════════════════════════════════════════════════════════
// Tool definitions (read-only pra v1)
// ══════════════════════════════════════════════════════════
const TOOLS = [
  {
    name: 'list_contacts',
    description: 'Lista contatos do CRM (wishlist + ativos). Filtros opcionais por status, tipo, temperatura. Retorna até 50 contatos ordenados por mais recente.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['wishlist', 'in_pipeline', 'customer', 'churned'], description: 'Status do contato' },
        type: { type: 'string', enum: ['b2b', 'b2c', 'both'], description: 'Tipo B2B ou B2C' },
        temperature: { type: 'string', enum: ['cold', 'warm', 'hot', 'ready'], description: 'Temperatura (quão quente)' },
        limit: { type: 'number', description: 'Máximo de resultados (padrão 20, max 50)' },
      },
    },
  },
  {
    name: 'search_contacts',
    description: 'Busca contatos por nome, email, empresa ou telefone (full-text).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de busca' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_contact',
    description: 'Retorna detalhes completos de 1 contato por ID, incluindo tags e produtos relacionados.',
    inputSchema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string', description: 'UUID do contato' },
      },
      required: ['contact_id'],
    },
  },
  {
    name: 'list_pipeline',
    description: 'Lista cards do pipeline (negociações). Filtra por scope (b2b/b2c) e opcionalmente por stage.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['b2b', 'b2c'], description: 'Scope do pipeline' },
        stage_id: { type: 'string', description: 'UUID da etapa (opcional)' },
        limit: { type: 'number', description: 'Máximo (padrão 30)' },
      },
      required: ['scope'],
    },
  },
  {
    name: 'list_tasks',
    description: 'Lista tarefas abertas (status != done). Opcionalmente filtra por assignee.',
    inputSchema: {
      type: 'object',
      properties: {
        assignee_id: { type: 'string', description: 'UUID do responsável (opcional)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
    },
  },
  {
    name: 'list_products',
    description: 'Lista produtos do portfolio.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_summary',
    description: 'Retorna um resumo executivo: contagens de contatos por status, pipeline total, deals abertos, tarefas pendentes.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ══════════════════════════════════════════════════════════
// Tool handlers
// ══════════════════════════════════════════════════════════
async function callTool(name, args = {}) {
  const c = sb();
  switch (name) {
    case 'list_contacts': {
      let q = c.from('contacts').select('*').order('created_at', { ascending: false });
      if (args.status) q = q.eq('status', args.status);
      if (args.type) q = q.eq('type', args.type);
      if (args.temperature) q = q.eq('temperature', args.temperature);
      const limit = Math.min(args.limit || 20, 50);
      const { data, error } = await q.limit(limit);
      if (error) throw error;
      return data;
    }
    case 'search_contacts': {
      const term = `%${args.query.replace(/[%_]/g, '\\$&')}%`;
      const { data, error } = await c.from('contacts').select('*')
        .or(`name.ilike.${term},email.ilike.${term},company.ilike.${term},phone.ilike.${term}`)
        .limit(20);
      if (error) throw error;
      return data;
    }
    case 'get_contact': {
      const { data: contact, error } = await c.from('contacts').select('*').eq('id', args.contact_id).single();
      if (error) throw error;
      const { data: tags } = await c.from('contact_tags').select('tags(name, color)').eq('contact_id', args.contact_id);
      const { data: fits } = await c.from('contact_product_fit').select('*, products(name)').eq('contact_id', args.contact_id);
      return { ...contact, tags: tags?.map(t => t.tags) || [], product_fits: fits || [] };
    }
    case 'list_pipeline': {
      let q = c.from('pipeline_cards').select('*, pipeline_stages(name, color), contacts(name, company)').eq('scope', args.scope);
      if (args.stage_id) q = q.eq('stage_id', args.stage_id);
      const limit = args.limit || 30;
      const { data, error } = await q.limit(limit);
      if (error) throw error;
      return data;
    }
    case 'list_tasks': {
      let q = c.from('tasks').select('*').neq('status', 'done').neq('status', 'cancelled').order('due_date', { nullsFirst: false });
      if (args.assignee_id) q = q.eq('assignee', args.assignee_id);
      if (args.priority) q = q.eq('priority', args.priority);
      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data;
    }
    case 'list_products': {
      const { data, error } = await c.from('products').select('*').order('name');
      if (error) throw error;
      return data;
    }
    case 'get_summary': {
      const [contacts, cards, tasks, stages] = await Promise.all([
        c.from('contacts').select('status, type, temperature'),
        c.from('pipeline_cards').select('scope, stage_id, value, probability'),
        c.from('tasks').select('status, priority'),
        c.from('pipeline_stages').select('id, name, scope'),
      ]);
      if (contacts.error) throw contacts.error;
      const byStatus = {}; (contacts.data || []).forEach(x => byStatus[x.status] = (byStatus[x.status] || 0) + 1);
      const byType = {};   (contacts.data || []).forEach(x => byType[x.type] = (byType[x.type] || 0) + 1);
      const openCards = (cards.data || []).filter(x => {
        const s = (stages.data || []).find(y => y.id === x.stage_id);
        const name = (s?.name || '').toLowerCase();
        return !name.includes('ganho') && !name.includes('perd') && !name.includes('ativo') && !name.includes('descart');
      });
      const pipelineValue = openCards.reduce((s, x) => s + (Number(x.value) || 0), 0);
      const expected = openCards.reduce((s, x) => s + (Number(x.value) || 0) * (Number(x.probability) || 0) / 100, 0);
      const pendingTasks = (tasks.data || []).filter(t => t.status === 'pending' || t.status === 'in_progress').length;
      return {
        contacts_total: contacts.data?.length || 0,
        contacts_by_status: byStatus,
        contacts_by_type: byType,
        pipeline_open_cards: openCards.length,
        pipeline_total_value: pipelineValue,
        pipeline_expected_value: Math.round(expected),
        tasks_pending: pendingTasks,
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ══════════════════════════════════════════════════════════
// JSON-RPC 2.0 handlers
// ══════════════════════════════════════════════════════════
function rpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function rpcError(id, code, message, data) {
  const err = { jsonrpc: '2.0', id, error: { code, message } };
  if (data !== undefined) err.error.data = data;
  return err;
}

async function handleRpc(msg) {
  const { id, method, params = {} } = msg;
  if (method === 'initialize') {
    return rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: SERVER_INFO,
      capabilities: { tools: {} },
    });
  }
  if (method === 'notifications/initialized') return null; // notification, no response
  if (method === 'tools/list') return rpcResult(id, { tools: TOOLS });
  if (method === 'tools/call') {
    try {
      const result = await callTool(params.name, params.arguments || {});
      return rpcResult(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      });
    } catch (e) {
      return rpcResult(id, {
        content: [{ type: 'text', text: `Error: ${e.message || 'Unknown error'}` }],
        isError: true,
      });
    }
  }
  if (method === 'ping') return rpcResult(id, {});
  return rpcError(id, -32601, `Method not found: ${method}`);
}

// ══════════════════════════════════════════════════════════
// Vercel handler
// ══════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST with JSON-RPC 2.0.' });

  // Auth
  const apiKey = process.env.MCP_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'MCP_API_KEY not configured on server' });
  }
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized. Provide Authorization: Bearer <MCP_API_KEY>' });
  }

  try {
    const msg = req.body;
    const response = await handleRpc(msg);
    if (response === null) return res.status(204).end();  // notification
    return res.status(200).json(response);
  } catch (e) {
    console.error('[mcp]', e);
    return res.status(500).json(rpcError(null, -32603, 'Internal error', e.message));
  }
};
