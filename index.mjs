// @brooswit/node-mcp-server - minimal MCP server core

// Constants (duplicated locally so this package is self-contained)
export const JSONRPC_VERSION = '2.0';
export const JSONRPC_METHOD_INITIALIZE = 'initialize';
export const JSONRPC_METHOD_TOOLS_LIST = 'tools/list';
export const JSONRPC_METHOD_TOOLS_CALL = 'tools/call';
export const JSONRPC_ERROR_PARSE_ERROR = -32700;
export const JSONRPC_ERROR_INVALID_REQUEST = -32600;
export const JSONRPC_ERROR_METHOD_NOT_FOUND = -32601;
export const JSONRPC_ERROR_INVALID_PARAMS = -32602;
export const JSONRPC_ERROR_INTERNAL = -32603;
export const MCP_PROTOCOL_VERSION = '2025-06-18';
export const MCP_SERVER_NAME = 'node-mcp-server';
export const MCP_SERVER_VERSION = '1.0.0';



function validateSpec(spec) {
    if (!spec || typeof spec !== 'object') return false;
    if (!spec.name || typeof spec.name !== 'string') return false;
    if (!spec.description || typeof spec.description !== 'string') return false;
    if (!spec.inputSchema || typeof spec.inputSchema !== 'object') return false;
    if (!Array.isArray(spec.params)) return false;
    if (!spec.fn || typeof spec.fn !== 'function') return false;
    return true;
}

async function buildRegistry(specLoaders) {
    const all = [];
    for (const load of specLoaders) {
        try {
            const mod = await load();
            const arr = Array.isArray(mod.MCP_TOOL_SPECS) ? mod.MCP_TOOL_SPECS : [];
            for (const t of arr) {
                if (t?.name && t.name.length > 60) {
                    console.warn(`[MCP] Tool name "${t.name}" is ${t.name.length} characters (exceeds 60 character limit)`);
                }
                if (validateSpec(t)) all.push(t);
            }
        } catch (e) {
            console.warn(`[MCP] Skipping spec during discovery: ${e?.message || e}`);
        }
    }

    const byName = new Map();
    const list = [];
    for (const t of all) {
        if (byName.has(t.name)) continue; // de-dupe by first occurrence
        byName.set(t.name, t);
        list.push({ name: t.name, description: t.description, inputSchema: t.inputSchema });
    }

    return { byName, list };
}

function wrapAsMcpToolResult(toolName, payload) {
    if (payload && typeof payload === 'object' && Array.isArray(payload.content)) {
        return { content: payload.content, isError: !!payload.isError };
    }
    if (typeof payload === 'string') {
        return { content: [{ type: 'text', text: payload }], isError: false };
    }
    let text;
    try {
        text = JSON.stringify(payload);
    } catch {
        text = String(payload);
    }
    return { content: [{ type: 'text', text }], isError: !!(payload && payload.isError) };
}

function buildResult(id, result) {
    return { jsonrpc: JSONRPC_VERSION, id, result };
}

function buildError(id, code, message) {
    return { jsonrpc: JSONRPC_VERSION, id, error: { code, message } };
}

export class McpServer {
    constructor() {
        this.specLoaders = [];
        this.registryPromise = null;
        this.started = false;
    }

    register(specLoader) {
        if (typeof specLoader !== 'function') {
            throw new Error('specLoader must be a function');
        }
        this.specLoaders.push(specLoader);
    }

    async start() {
        if (this.started) {
            console.warn('[MCP] Server already started');
            return;
        }
        this.started = true;
        console.log(`[MCP] Starting MCP server with ${this.specLoaders.length} spec loaders`);
        // Pre-build registry on start
        await this.getRegistry();
    }

    async getRegistry() {
        if (!this.registryPromise) {
            this.registryPromise = buildRegistry(this.specLoaders);
        }
        return this.registryPromise;
    }

    async callTool(spec, argsObj) {
        const ordered = (spec.params || []).map(p => (argsObj ? argsObj[p] : undefined));
        return await spec.fn(...ordered);
    }

    async handle(request) {
        try {
            if (!request || request.jsonrpc !== JSONRPC_VERSION || typeof request.method !== 'string') {
                return buildError(request?.id ?? null, JSONRPC_ERROR_INVALID_REQUEST, 'Invalid request');
            }

            const { id, method, params } = request;

            if (method === JSONRPC_METHOD_INITIALIZE) {
                return buildResult(id, {
                    protocolVersion: MCP_PROTOCOL_VERSION,
                    serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
                    capabilities: { tools: {}, resources: {}, prompts: {} },
                });
            }

            if (method === JSONRPC_METHOD_TOOLS_LIST) {
                const reg = await this.getRegistry();
                return buildResult(id, { tools: reg.list });
            }

            if (method === JSONRPC_METHOD_TOOLS_CALL) {
                const name = params?.name;
                const toolArgs = params?.arguments;
                if (!name) return buildError(id, JSONRPC_ERROR_INVALID_PARAMS, 'Missing tool name');
                const reg = await this.getRegistry();
                const tool = reg.byName.get(name);
                if (!tool) return buildError(id, JSONRPC_ERROR_METHOD_NOT_FOUND, `Unknown tool: ${name}`);
                try {
                    const raw = await this.callTool(tool, toolArgs);
                    const wrapped = wrapAsMcpToolResult(name, raw);
                    return buildResult(id, wrapped);
                } catch (err) {
                    console.error(`[MCP] Tool ${name} failed: ${err?.message || err}`);
                    return buildError(id, JSONRPC_ERROR_INTERNAL, err?.message || 'Tool failed');
                }
            }

            return buildError(request.id ?? null, JSONRPC_ERROR_METHOD_NOT_FOUND, `Unknown method: ${method}`);
        } catch (e) {
            return buildError(request?.id ?? null, JSONRPC_ERROR_INTERNAL, e?.message || 'Internal error');
        }
    }

    async listTools() {
        const reg = await this.getRegistry();
        return { tools: reg.list };
    }
} 