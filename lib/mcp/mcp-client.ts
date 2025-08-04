import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

export class MCPClientManager {
  private clients: Map<string, Client> = new Map()

  async connectServer(serverConfig: MCPServerConfig): Promise<Client> {
    const { name, command, args, env } = serverConfig

    // Check if already connected
    if (this.clients.has(name)) {
      return this.clients.get(name)!
    }

    try {
      // Create transport with command and args
      const transport = new StdioClientTransport({
        command: command,
        args: args,
        env: Object.fromEntries(
          Object.entries({ ...process.env, ...env }).filter(([, value]) => value !== undefined)
        ) as Record<string, string>,
      })

      const client = new Client(
        {
          name: `xpertseller-client-${name}`,
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      )

      // Connect to the server
      await client.connect(transport)

      // Store client
      this.clients.set(name, client)

      console.log(`Connected to MCP server: ${name}`)
      return client

    } catch (error) {
      console.error(`Failed to connect to MCP server ${name}:`, error)
      throw error
    }
  }

  async disconnectServer(name: string): Promise<void> {
    const client = this.clients.get(name)

    if (client) {
      try {
        await client.close()
      } catch (error) {
        console.error(`Error closing MCP client ${name}:`, error)
      }
    }

    this.clients.delete(name)
  }

  private cleanup(name: string): void {
    this.clients.delete(name)
  }

  getClient(name: string): Client | null {
    return this.clients.get(name) || null
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.clients.keys()).map(name => 
      this.disconnectServer(name)
    )
    await Promise.all(promises)
  }
}

// Singleton instance
export const mcpClientManager = new MCPClientManager()