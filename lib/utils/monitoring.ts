import { supabaseAdmin } from '../database/connection'

export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>()
  
  static startTimer(operation: string): () => void {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.recordMetric(operation, duration)
    }
  }
  
  static recordMetric(operation: string, value: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }
    
    const values = this.metrics.get(operation)!
    values.push(value)
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift()
    }
  }
  
  static getMetrics(operation: string) {
    const values = this.metrics.get(operation) || []
    if (values.length === 0) return null
    
    const sorted = [...values].sort((a, b) => a - b)
    return {
      count: values.length,
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }
  
  static getAllMetrics() {
    const result: Record<string, any> = {}
    for (const [operation, values] of this.metrics.entries()) {
      result[operation] = this.getMetrics(operation)
    }
    return result
  }
  
  static async flushMetrics() {
    const metrics = this.getAllMetrics()
    
    try {
      await supabaseAdmin
        .from('fact_stream')
        .insert({
          seller_id: 'system',
          event_type: 'metrics.performance',
          event_category: 'monitoring',
          data: {
            metrics,
            timestamp: new Date().toISOString(),
            hostname: process.env.HOSTNAME || 'unknown'
          },
          importance_score: 3,
          requires_action: false,
          processing_status: 'completed',
          processed_by: ['performance_monitor']
        })
      
      // Clear metrics after flushing
      this.metrics.clear()
      
    } catch (error) {
      console.error('Failed to flush performance metrics:', error)
    }
  }
}

export class HealthChecker {
  private static checks = new Map<string, () => Promise<boolean>>()
  
  static registerCheck(name: string, check: () => Promise<boolean>) {
    this.checks.set(name, check)
  }
  
  static async runHealthChecks(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, { status: boolean, duration: number, error?: string }>
    timestamp: string
  }> {
    const results: Record<string, any> = {}
    let healthyCount = 0
    
    for (const [name, check] of this.checks.entries()) {
      const timer = PerformanceMonitor.startTimer(`health_check_${name}`)
      
      try {
        const result = await Promise.race([
          check(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ])
        
        timer()
        results[name] = { status: result, duration: PerformanceMonitor.getMetrics(`health_check_${name}`)?.avg || 0 }
        
        if (result) healthyCount++
        
      } catch (error) {
        timer()
        results[name] = { 
          status: false, 
          duration: PerformanceMonitor.getMetrics(`health_check_${name}`)?.avg || 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    
    const totalChecks = this.checks.size
    let status: 'healthy' | 'degraded' | 'unhealthy'
    
    if (healthyCount === totalChecks) {
      status = 'healthy'
    } else if (healthyCount > totalChecks / 2) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }
    
    return {
      status,
      checks: results,
      timestamp: new Date().toISOString()
    }
  }
}

export class AlertManager {
  private static thresholds = {
    response_time_p95: 5000, // 5 seconds
    error_rate: 0.05, // 5%
    memory_usage: 0.8, // 80%
    cpu_usage: 0.8 // 80%
  }
  
  static async checkAlerts(): Promise<void> {
    const metrics = PerformanceMonitor.getAllMetrics()
    const alerts: string[] = []
    
    // Check response time alerts
    for (const [operation, stats] of Object.entries(metrics)) {
      if (stats?.p95 > this.thresholds.response_time_p95) {
        alerts.push(`High response time for ${operation}: ${stats.p95}ms (threshold: ${this.thresholds.response_time_p95}ms)`)
      }
    }
    
    // Check system resources
    const memUsage = process.memoryUsage()
    const memUsagePercent = memUsage.heapUsed / memUsage.heapTotal
    
    if (memUsagePercent > this.thresholds.memory_usage) {
      alerts.push(`High memory usage: ${(memUsagePercent * 100).toFixed(1)}% (threshold: ${this.thresholds.memory_usage * 100}%)`)
    }
    
    // Send alerts if any
    if (alerts.length > 0) {
      await this.sendSystemAlert(alerts)
    }
  }
  
  private static async sendSystemAlert(alerts: string[]) {
    try {
      await supabaseAdmin
        .from('fact_stream')
        .insert({
          seller_id: 'system',
          event_type: 'alert.system',
          event_category: 'monitoring',
          data: {
            alerts,
            severity: 'high',
            timestamp: new Date().toISOString()
          },
          importance_score: 8,
          requires_action: true,
          processing_status: 'pending',
          processed_by: ['alert_manager']
        })
      
      console.error('🚨 SYSTEM ALERTS:', alerts)
      
    } catch (error) {
      console.error('Failed to log system alerts:', error)
    }
  }
}

// Register default health checks
HealthChecker.registerCheck('database', async () => {
  try {
    const { data, error } = await supabaseAdmin.from('sellers').select('id').limit(1)
    return !error
  } catch {
    return false
  }
})

HealthChecker.registerCheck('openai', async () => {
  try {
    return !!process.env.OPENAI_API_KEY
  } catch {
    return false
  }
})

HealthChecker.registerCheck('composio', async () => {
  try {
    return !!process.env.COMPOSIO_API_KEY
  } catch {
    return false
  }
})

// Auto-flush metrics every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    PerformanceMonitor.flushMetrics()
    AlertManager.checkAlerts()
  }, 5 * 60 * 1000)
}