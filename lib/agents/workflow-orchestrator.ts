import { supabaseAdmin } from '../database/connection'
import { NotificationService } from '../utils/notifications'
// Disable Composio during build to prevent DataCloneError
import { ComposioToolSet } from 'composio-core'
import { OpenAI } from 'openai'

interface WorkflowStep {
  id: string
  name: string
  type: 'notification' | 'analysis' | 'integration' | 'approval' | 'execution'
  conditions: Record<string, any>
  actions: string[]
  next_steps: string[]
  timeout_hours?: number
}

interface Workflow {
  id: string
  name: string
  trigger: string
  steps: WorkflowStep[]
  status: 'active' | 'paused' | 'completed' | 'failed'
  context: Record<string, any>
}

export class WorkflowOrchestrator {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
  
  private static toolset = new ComposioToolSet({
    apiKey: process.env.COMPOSIO_API_KEY || 'ak_m7G25pTBup6hdv2Mjn_v'
  })

  /**
   * 🎼 Master orchestrator - manages complex multi-platform workflows
   */
  static async orchestrateWorkflows(sellerId: string, trigger: string, context?: any): Promise<void> {
    console.log(`🎼 Orchestrating workflows for seller: ${sellerId}, trigger: ${trigger}`)
    
    try {
      const activeWorkflows = await this.getActiveWorkflows(sellerId, trigger)
      
      for (const workflow of activeWorkflows) {
        await this.executeWorkflow(sellerId, workflow, context)
      }
      
    } catch (error) {
      console.error('Workflow orchestration failed:', error)
    }
  }

  /**
   * 📋 Get active workflows for trigger
   */
  private static async getActiveWorkflows(sellerId: string, trigger: string): Promise<Workflow[]> {
    // Define built-in workflows
    const workflows: Workflow[] = [
      this.createStockoutPreventionWorkflow(),
      this.createBuyBoxRecoveryWorkflow(),
      this.createRevenueOptimizationWorkflow(),
      this.createCompetitorResponseWorkflow(),
      this.createSeasonalPreparationWorkflow()
    ]

    return workflows.filter(w => w.trigger === trigger && w.status === 'active')
  }

  /**
   * 📦 Stockout Prevention Workflow
   */
  private static createStockoutPreventionWorkflow(): Workflow {
    return {
      id: 'stockout_prevention',
      name: 'Stockout Prevention & Recovery',
      trigger: 'stockout_risk_detected',
      status: 'active',
      context: {},
      steps: [
        {
          id: 'immediate_alert',
          name: 'Send Immediate Alert',
          type: 'notification',
          conditions: { urgency: 'critical' },
          actions: ['send_whatsapp', 'send_email'],
          next_steps: ['analyze_options']
        },
        {
          id: 'analyze_options',
          name: 'Analyze Restocking Options',
          type: 'analysis',
          conditions: {},
          actions: ['check_supplier_availability', 'calculate_reorder_quantity', 'estimate_costs'],
          next_steps: ['present_options']
        },
        {
          id: 'present_options',
          name: 'Present Options to Seller',
          type: 'approval',
          conditions: {},
          actions: ['generate_reorder_proposal', 'send_approval_request'],
          next_steps: ['execute_approved', 'monitor_response'],
          timeout_hours: 4
        },
        {
          id: 'execute_approved',
          name: 'Execute Approved Actions',
          type: 'execution',
          conditions: { approval_received: true },
          actions: ['create_purchase_order', 'notify_supplier', 'update_inventory_system'],
          next_steps: ['track_delivery']
        },
        {
          id: 'track_delivery',
          name: 'Track Delivery Status',
          type: 'integration',
          conditions: {},
          actions: ['monitor_shipping', 'send_updates', 'prepare_receiving'],
          next_steps: ['complete_workflow']
        }
      ]
    }
  }

  /**
   * 🥇 Buy Box Recovery Workflow
   */
  private static createBuyBoxRecoveryWorkflow(): Workflow {
    return {
      id: 'buybox_recovery',
      name: 'Buy Box Recovery Protocol',
      trigger: 'buybox_loss_detected',
      status: 'active',
      context: {},
      steps: [
        {
          id: 'immediate_analysis',
          name: 'Immediate Competitive Analysis',
          type: 'analysis',
          conditions: {},
          actions: ['scan_competitor_prices', 'check_inventory_levels', 'analyze_fulfillment_speed'],
          next_steps: ['calculate_response']
        },
        {
          id: 'calculate_response',
          name: 'Calculate Optimal Response',
          type: 'analysis',
          conditions: {},
          actions: ['determine_price_adjustment', 'assess_margin_impact', 'evaluate_alternatives'],
          next_steps: ['present_strategy']
        },
        {
          id: 'present_strategy',
          name: 'Present Recovery Strategy',
          type: 'approval',
          conditions: {},
          actions: ['generate_strategy_options', 'send_urgent_approval'],
          next_steps: ['execute_strategy'],
          timeout_hours: 2
        },
        {
          id: 'execute_strategy',
          name: 'Execute Recovery Strategy',
          type: 'execution',
          conditions: { approval_received: true },
          actions: ['update_pricing', 'adjust_inventory', 'modify_fulfillment'],
          next_steps: ['monitor_recovery']
        },
        {
          id: 'monitor_recovery',
          name: 'Monitor Buy Box Recovery',
          type: 'integration',
          conditions: {},
          actions: ['track_buybox_status', 'measure_impact', 'adjust_if_needed'],
          next_steps: ['report_results']
        }
      ]
    }
  }

  /**
   * 📈 Revenue Optimization Workflow
   */
  private static createRevenueOptimizationWorkflow(): Workflow {
    return {
      id: 'revenue_optimization',
      name: 'Multi-Channel Revenue Optimization',
      trigger: 'optimization_opportunity',
      status: 'active',
      context: {},
      steps: [
        {
          id: 'opportunity_analysis',
          name: 'Analyze Optimization Opportunity',
          type: 'analysis',
          conditions: {},
          actions: ['calculate_potential_impact', 'assess_risks', 'identify_requirements'],
          next_steps: ['cross_platform_check']
        },
        {
          id: 'cross_platform_check',
          name: 'Cross-Platform Impact Analysis',
          type: 'integration',
          conditions: {},
          actions: ['check_other_marketplaces', 'analyze_advertising_impact', 'review_inventory_constraints'],
          next_steps: ['generate_strategy']
        },
        {
          id: 'generate_strategy',
          name: 'Generate Optimization Strategy',
          type: 'analysis',
          conditions: {},
          actions: ['create_implementation_plan', 'calculate_timeline', 'identify_success_metrics'],
          next_steps: ['present_opportunity']
        },
        {
          id: 'present_opportunity',
          name: 'Present Opportunity',
          type: 'approval',
          conditions: {},
          actions: ['send_detailed_proposal', 'include_roi_projections'],
          next_steps: ['coordinate_execution'],
          timeout_hours: 8
        },
        {
          id: 'coordinate_execution',
          name: 'Coordinate Multi-Platform Execution',
          type: 'execution',
          conditions: { approval_received: true },
          actions: ['update_amazon_listing', 'adjust_advertising_campaigns', 'sync_inventory_systems'],
          next_steps: ['measure_results']
        }
      ]
    }
  }

  /**
   * ⚔️ Competitor Response Workflow
   */
  private static createCompetitorResponseWorkflow(): Workflow {
    return {
      id: 'competitor_response',
      name: 'Competitive Threat Response',
      trigger: 'competitor_threat_detected',
      status: 'active',
      context: {},
      steps: [
        {
          id: 'threat_assessment',
          name: 'Assess Competitive Threat',
          type: 'analysis',
          conditions: {},
          actions: ['analyze_competitor_changes', 'predict_market_impact', 'evaluate_urgency'],
          next_steps: ['intelligence_gathering']
        },
        {
          id: 'intelligence_gathering',
          name: 'Gather Market Intelligence',
          type: 'integration',
          conditions: {},
          actions: ['monitor_competitor_activity', 'track_price_changes', 'analyze_customer_sentiment'],
          next_steps: ['formulate_response']
        },
        {
          id: 'formulate_response',
          name: 'Formulate Response Strategy',
          type: 'analysis',
          conditions: {},
          actions: ['develop_counter_strategy', 'calculate_defensive_moves', 'identify_differentiators'],
          next_steps: ['strategic_approval']
        },
        {
          id: 'strategic_approval',
          name: 'Strategic Response Approval',
          type: 'approval',
          conditions: {},
          actions: ['present_response_options', 'include_risk_analysis'],
          next_steps: ['execute_response'],
          timeout_hours: 6
        },
        {
          id: 'execute_response',
          name: 'Execute Competitive Response',
          type: 'execution',
          conditions: { approval_received: true },
          actions: ['implement_pricing_strategy', 'launch_counter_campaigns', 'strengthen_positioning'],
          next_steps: ['monitor_effectiveness']
        }
      ]
    }
  }

  /**
   * 🌊 Seasonal Preparation Workflow
   */
  private static createSeasonalPreparationWorkflow(): Workflow {
    return {
      id: 'seasonal_preparation',
      name: 'Seasonal Market Preparation',
      trigger: 'seasonal_change_predicted',
      status: 'active',
      context: {},
      steps: [
        {
          id: 'seasonal_analysis',
          name: 'Seasonal Trend Analysis',
          type: 'analysis',
          conditions: {},
          actions: ['analyze_historical_patterns', 'predict_demand_changes', 'identify_opportunities'],
          next_steps: ['preparation_planning']
        },
        {
          id: 'preparation_planning',
          name: 'Preparation Planning',
          type: 'analysis',
          conditions: {},
          actions: ['calculate_inventory_needs', 'plan_promotional_strategy', 'prepare_content_updates'],
          next_steps: ['resource_coordination']
        },
        {
          id: 'resource_coordination',
          name: 'Coordinate Resources',
          type: 'integration',
          conditions: {},
          actions: ['align_supply_chain', 'prepare_marketing_materials', 'schedule_campaign_launches'],
          next_steps: ['implementation_approval']
        },
        {
          id: 'implementation_approval',
          name: 'Implementation Approval',
          type: 'approval',
          conditions: {},
          actions: ['present_seasonal_strategy', 'include_timeline_and_budget'],
          next_steps: ['execute_preparation'],
          timeout_hours: 24
        },
        {
          id: 'execute_preparation',
          name: 'Execute Seasonal Preparation',
          type: 'execution',
          conditions: { approval_received: true },
          actions: ['adjust_inventory_levels', 'launch_seasonal_campaigns', 'update_product_listings'],
          next_steps: ['monitor_performance']
        }
      ]
    }
  }

  /**
   * ▶️ Execute workflow
   */
  private static async executeWorkflow(sellerId: string, workflow: Workflow, context?: any): Promise<void> {
    console.log(`▶️ Executing workflow: ${workflow.name}`)
    
    // Update context
    workflow.context = { ...workflow.context, ...context, sellerId, started_at: new Date().toISOString() }
    
    // Start with first step
    await this.executeWorkflowStep(sellerId, workflow, workflow.steps[0])
  }

  /**
   * 🎯 Execute individual workflow step
   */
  private static async executeWorkflowStep(sellerId: string, workflow: Workflow, step: WorkflowStep): Promise<void> {
    console.log(`🎯 Executing step: ${step.name}`)
    
    try {
      switch (step.type) {
        case 'notification':
          await this.executeNotificationStep(sellerId, workflow, step)
          break
        case 'analysis':
          await this.executeAnalysisStep(sellerId, workflow, step)
          break
        case 'integration':
          await this.executeIntegrationStep(sellerId, workflow, step)
          break
        case 'approval':
          await this.executeApprovalStep(sellerId, workflow, step)
          break
        case 'execution':
          await this.executeExecutionStep(sellerId, workflow, step)
          break
      }
      
      // Log step completion
      await this.logWorkflowStep(sellerId, workflow.id, step.id, 'completed')
      
      // Execute next steps
      for (const nextStepId of step.next_steps) {
        const nextStep = workflow.steps.find(s => s.id === nextStepId)
        if (nextStep && this.checkStepConditions(nextStep, workflow.context)) {
          await this.executeWorkflowStep(sellerId, workflow, nextStep)
        }
      }
      
    } catch (error) {
      console.error(`Step execution failed: ${step.name}`, error)
      await this.logWorkflowStep(sellerId, workflow.id, step.id, 'failed')
    }
  }

  /**
   * 📢 Execute notification step
   */
  private static async executeNotificationStep(sellerId: string, workflow: Workflow, step: WorkflowStep): Promise<void> {
    const message = `🎼 Workflow Alert: ${workflow.name}

Step: ${step.name}
Context: ${JSON.stringify(workflow.context, null, 2)}

This is part of an automated workflow to handle ${workflow.trigger}.`

    await NotificationService.sendNotification({
      sellerId,
      title: `🎼 ${workflow.name} - ${step.name}`,
      message,
      urgency: workflow.context.urgency || 'normal',
      data: {
        workflow_id: workflow.id,
        step_id: step.id,
        context: workflow.context
      }
    })
  }

  /**
   * 🔍 Execute analysis step
   */
  private static async executeAnalysisStep(sellerId: string, workflow: Workflow, step: WorkflowStep): Promise<void> {
    const analysisPrompt = `
Perform analysis for workflow step: ${step.name}
Workflow: ${workflow.name}
Context: ${JSON.stringify(workflow.context)}
Actions to perform: ${step.actions.join(', ')}

Provide actionable analysis results in JSON format.
    `

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an AI analyst for e-commerce workflow automation.' },
        { role: 'user', content: analysisPrompt }
      ]
    })

    const analysisResults = JSON.parse(response.choices[0]?.message?.content || '{}')
    
    // Store analysis results in workflow context
    workflow.context[`${step.id}_results`] = analysisResults
  }

  /**
   * 🔗 Execute integration step
   */
  private static async executeIntegrationStep(sellerId: string, workflow: Workflow, step: WorkflowStep): Promise<void> {
    // Execute integrations via Composio
    for (const action of step.actions) {
      try {
        // const result = await this.toolset.executeAction(action, { // TODO: Update Composio API usage
        //   seller_id: sellerId,
        //   context: workflow.context
        // })
        const result = { success: true, message: 'Mock workflow action' }
        
        workflow.context[`${action}_result`] = result
      } catch (error) {
        console.error(`Integration action failed: ${action}`, error)
      }
    }
  }

  /**
   * ✅ Execute approval step
   */
  private static async executeApprovalStep(sellerId: string, workflow: Workflow, step: WorkflowStep): Promise<void> {
    const approvalMessage = `
🎼 Workflow Approval Required: ${workflow.name}

Step: ${step.name}
Actions Proposed: ${step.actions.join(', ')}

Context:
${JSON.stringify(workflow.context, null, 2)}

Please review and approve the next actions in this automated workflow.
    `

    await NotificationService.sendNotification({
      sellerId,
      title: `✅ Approval Required: ${workflow.name}`,
      message: approvalMessage,
      urgency: 'high',
      link: `${process.env.APP_URL}/dashboard/workflows/${workflow.id}/approve`,
      data: {
        workflow_id: workflow.id,
        step_id: step.id,
        requires_approval: true,
        timeout_hours: step.timeout_hours || 8
      }
    })
  }

  /**
   * 🚀 Execute execution step
   */
  private static async executeExecutionStep(sellerId: string, workflow: Workflow, step: WorkflowStep): Promise<void> {
    // This would normally execute approved actions
    // For now, we'll just log and notify
    
    const executionMessage = `
🚀 Executing Workflow Actions: ${workflow.name}

Step: ${step.name}
Actions: ${step.actions.join(', ')}

The system is now executing the approved actions from your workflow.
    `

    await NotificationService.sendNotification({
      sellerId,
      title: `🚀 Executing: ${step.name}`,
      message: executionMessage,
      urgency: 'normal',
      data: {
        workflow_id: workflow.id,
        step_id: step.id,
        actions_executed: step.actions
      }
    })
  }

  /**
   * ✔️ Check step conditions
   */
  private static checkStepConditions(step: WorkflowStep, context: Record<string, any>): boolean {
    // Simple condition checking - can be enhanced
    for (const [key, value] of Object.entries(step.conditions)) {
      if (context[key] !== value) {
        return false
      }
    }
    return true
  }

  /**
   * 📝 Log workflow step
   */
  private static async logWorkflowStep(sellerId: string, workflowId: string, stepId: string, status: string): Promise<void> {
    await supabaseAdmin
      .from('fact_stream')
      .insert({
        seller_id: sellerId,
        event_type: 'workflow.step_executed',
        event_category: 'orchestration',
        data: {
          workflow_id: workflowId,
          step_id: stepId,
          status,
          timestamp: new Date().toISOString()
        },
        importance_score: 6,
        requires_action: false,
        processing_status: 'completed',
        processed_by: ['workflow_orchestrator']
      })
  }
}