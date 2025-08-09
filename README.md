## @brooswit/node-mcp-server

Minimal, embeddable MCP server core for Node.js. Provides JSON-RPC 2.0 handling, tool registry, and tool invocation for the Model Context Protocol (MCP).

### Install

- As a local workspace package or via file reference. No external runtime deps.

### API

- **McpServer class**
  - `constructor()` - Create server instance
  - `register(specLoader)` - Register a tool spec loader function
    - specLoader: () => Promise<{ MCP_TOOL_SPECS?: ToolSpec[] }>
  - `start()` - Initialize the server and pre-build tool registry
  - `handle(request)` - Handle JSON-RPC requests
  - `listTools()` - Get available tools

- **constants**
  - JSONRPC_VERSION
  - JSONRPC_METHOD_INITIALIZE, JSONRPC_METHOD_TOOLS_LIST, JSONRPC_METHOD_TOOLS_CALL
  - JSONRPC_ERROR_* codes
  - MCP_PROTOCOL_VERSION, MCP_SERVER_NAME, MCP_SERVER_VERSION

### ToolSpec shape

```
interface ToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  params: string[];
  fn: (...args: any[]) => Promise<any> | any;
}
```

### Example

```js
import { McpServer, JSONRPC_METHOD_TOOLS_LIST } from '@brooswit/node-mcp-server';

const server = new McpServer();
server.register(() => import('./my-tools.mjs'));
await server.start();

const resp = await server.handle({ jsonrpc: '2.0', id: 1, method: JSONRPC_METHOD_TOOLS_LIST });
console.log(resp);
```

### Notes
- Call `register()` to add tool spec loaders, then `start()` to initialize the registry.
- Duplicate tool names are de-duped by first occurrence.
- Results are wrapped for broad MCP client compatibility: strings become text items; objects are JSON-stringified unless already shaped as an MCP tool result.
