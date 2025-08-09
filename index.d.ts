export interface ToolSpec {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    params: string[];
    fn: (...args: any[]) => Promise<any> | any;
}

export interface ToolDescriptor {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id?: string | number | null;
    method: string;
    params?: any;
}

export interface JsonRpcError {
    code: number;
    message: string;
}

export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id?: string | number | null;
    result?: any;
    error?: JsonRpcError;
}

export class McpServer {
    constructor();
    register(specLoader: () => Promise<{ MCP_TOOL_SPECS?: ToolSpec[] }>): void;
    start(): Promise<void>;
    handle(request: JsonRpcRequest): Promise<JsonRpcResponse>;
    listTools(): Promise<{ tools: ToolDescriptor[] }>;
}

export const JSONRPC_VERSION: '2.0';
export const JSONRPC_METHOD_INITIALIZE: 'initialize';
export const JSONRPC_METHOD_TOOLS_LIST: 'tools/list';
export const JSONRPC_METHOD_TOOLS_CALL: 'tools/call';
export const JSONRPC_ERROR_PARSE_ERROR: -32700;
export const JSONRPC_ERROR_INVALID_REQUEST: -32600;
export const JSONRPC_ERROR_METHOD_NOT_FOUND: -32601;
export const JSONRPC_ERROR_INVALID_PARAMS: -32602;
export const JSONRPC_ERROR_INTERNAL: -32603;
export const MCP_PROTOCOL_VERSION: string;
export const MCP_SERVER_NAME: string;
export const MCP_SERVER_VERSION: string; 