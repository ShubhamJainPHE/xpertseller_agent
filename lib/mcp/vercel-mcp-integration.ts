interface VercelDeployment {
  uid: string
  name: string
  url: string
  readyState: 'READY' | 'BUILDING' | 'ERROR' | 'CANCELED'
  createdAt: string
  source: string
  target: string
  meta?: {
    githubCommitMessage?: string
    githubCommitSha?: string
    githubCommitRef?: string
  }
}

interface VercelProject {
  id: string
  name: string
  accountId: string
  framework: string
  devCommand: string
  buildCommand: string
  outputDirectory: string
  createdAt: string
  updatedAt: string
}

export class VercelMCPIntegration {
  private token: string
  private baseUrl = 'https://api.vercel.com'

  constructor() {
    this.token = process.env.VERCEL_TOKEN || 'bfIn5QKY5Ms42fdnm2x9eVbr'
  }

  private async vercelApiCall(endpoint: string, options: any = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }

  // Deployment Management
  async getDeployments(projectName: string = 'xpertseller-agent', limit: number = 10): Promise<VercelDeployment[]> {
    try {
      const data = await this.vercelApiCall(`/v6/deployments?projectName=${projectName}&limit=${limit}`)
      return data.deployments || []
    } catch (error) {
      console.error('Failed to get deployments:', error)
      return []
    }
  }

  async getLatestDeployment(projectName: string = 'xpertseller-agent'): Promise<VercelDeployment | null> {
    const deployments = await this.getDeployments(projectName, 1)
    return deployments[0] || null
  }

  async createDeployment(projectName: string, config: any): Promise<VercelDeployment | null> {
    try {
      const data = await this.vercelApiCall('/v13/deployments', {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          ...config
        })
      })
      return data
    } catch (error) {
      console.error('Failed to create deployment:', error)
      return null
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<{
    readyState: string
    url?: string
    error?: string
  }> {
    try {
      const data = await this.vercelApiCall(`/v13/deployments/${deploymentId}`)
      return {
        readyState: data.readyState,
        url: data.url,
        error: data.error?.message
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Vercel API call failed'
      return {
        readyState: 'ERROR',
        error: errorMessage
      }
    }
  }

  // Project Management
  async getProjects(): Promise<VercelProject[]> {
    try {
      const data = await this.vercelApiCall('/v9/projects')
      return data.projects || []
    } catch (error) {
      console.error('Failed to get projects:', error)
      return []
    }
  }

  async getProject(projectName: string): Promise<VercelProject | null> {
    try {
      const data = await this.vercelApiCall(`/v9/projects/${projectName}`)
      return data
    } catch (error) {
      console.error('Failed to get project:', error)
      return null
    }
  }

  // Environment Variables
  async getEnvironmentVariables(projectId: string): Promise<any[]> {
    try {
      const data = await this.vercelApiCall(`/v9/projects/${projectId}/env`)
      return data.envs || []
    } catch (error) {
      console.error('Failed to get environment variables:', error)
      return []
    }
  }

  async setEnvironmentVariable(projectId: string, key: string, value: string, target: string[] = ['production']): Promise<boolean> {
    try {
      await this.vercelApiCall(`/v9/projects/${projectId}/env`, {
        method: 'POST',
        body: JSON.stringify({
          key,
          value,
          target,
          type: 'encrypted'
        })
      })
      return true
    } catch (error) {
      console.error('Failed to set environment variable:', error)
      return false
    }
  }

  // Logs and Monitoring
  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    try {
      const data = await this.vercelApiCall(`/v2/deployments/${deploymentId}/events`)
      return data.map((event: any) => event.payload?.text || '').filter(Boolean)
    } catch (error) {
      console.error('Failed to get deployment logs:', error)
      return []
    }
  }

  async getFunctionLogs(projectId: string, limit: number = 100): Promise<any[]> {
    try {
      const data = await this.vercelApiCall(`/v2/projects/${projectId}/logs?limit=${limit}`)
      return data.logs || []
    } catch (error) {
      console.error('Failed to get function logs:', error)
      return []
    }
  }

  // Domains
  async getDomains(projectId: string): Promise<any[]> {
    try {
      const data = await this.vercelApiCall(`/v9/projects/${projectId}/domains`)
      return data.domains || []
    } catch (error) {
      console.error('Failed to get domains:', error)
      return []
    }
  }

  // Analytics
  async getAnalytics(projectId: string, period: string = '24h'): Promise<any> {
    try {
      const data = await this.vercelApiCall(`/v1/analytics?projectId=${projectId}&period=${period}`)
      return data
    } catch (error) {
      console.error('Failed to get analytics:', error)
      return null
    }
  }

  // Smart Deployment Management
  async waitForDeployment(deploymentId: string, maxWaitTime: number = 300000): Promise<{
    success: boolean
    finalState: string
    url?: string
    error?: string
  }> {
    const startTime = Date.now()
    const pollInterval = 10000 // 10 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getDeploymentStatus(deploymentId)
      
      if (status.readyState === 'READY') {
        return {
          success: true,
          finalState: 'READY',
          url: status.url
        }
      }
      
      if (status.readyState === 'ERROR' || status.readyState === 'CANCELED') {
        return {
          success: false,
          finalState: status.readyState,
          error: status.error
        }
      }
      
      // Still building, wait and check again
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
    
    return {
      success: false,
      finalState: 'TIMEOUT',
      error: 'Deployment timed out'
    }
  }

  async deployWithMonitoring(projectName: string, config: any): Promise<{
    deployment?: VercelDeployment
    success: boolean
    url?: string
    error?: string
    logs?: string[]
  }> {
    try {
      // Create deployment
      const deployment = await this.createDeployment(projectName, config)
      if (!deployment) {
        return { success: false, error: 'Failed to create deployment' }
      }

      // Wait for completion
      const result = await this.waitForDeployment(deployment.uid)
      
      // Get logs
      const logs = await this.getDeploymentLogs(deployment.uid)
      
      return {
        deployment,
        success: result.success,
        url: result.url,
        error: result.error,
        logs
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Health Check
  async healthCheck(): Promise<{
    healthy: boolean
    projects: number
    latestDeployment?: VercelDeployment
    errors: string[]
  }> {
    const errors: string[] = []
    
    try {
      // Test API access
      const projects = await this.getProjects()
      
      // Get latest deployment
      let latestDeployment: VercelDeployment | undefined
      try {
        latestDeployment = (await this.getLatestDeployment()) || undefined
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Failed to get latest deployment: ${errorMessage}`)
      }
      
      return {
        healthy: errors.length === 0,
        projects: projects.length,
        latestDeployment,
        errors
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Health check failed'
      return {
        healthy: false,
        projects: 0,
        errors: [errorMessage]
      }
    }
  }

  // Integration Helpers
  async getDeploymentSummary(projectName: string = 'xpertseller-agent'): Promise<{
    latest: VercelDeployment | null
    recent: VercelDeployment[]
    status: string
    url?: string
    lastUpdated: string
  }> {
    const deployments = await this.getDeployments(projectName, 5)
    const latest = deployments[0] || null
    
    return {
      latest,
      recent: deployments,
      status: latest?.readyState || 'UNKNOWN',
      url: latest?.url ? `https://${latest.url}` : undefined,
      lastUpdated: latest?.createdAt || new Date().toISOString()
    }
  }

  async syncEnvironmentVariables(projectId: string, envVars: Record<string, string>): Promise<{
    success: boolean
    updated: string[]
    errors: string[]
  }> {
    const updated: string[] = []
    const errors: string[] = []
    
    for (const [key, value] of Object.entries(envVars)) {
      try {
        const success = await this.setEnvironmentVariable(projectId, key, value)
        if (success) {
          updated.push(key)
        } else {
          errors.push(`Failed to update ${key}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Update failed'
        errors.push(`Error updating ${key}: ${errorMessage}`)
      }
    }
    
    return {
      success: errors.length === 0,
      updated,
      errors
    }
  }
}

export const vercelMCP = new VercelMCPIntegration()