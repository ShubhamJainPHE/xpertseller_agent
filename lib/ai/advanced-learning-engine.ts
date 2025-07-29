import * as tf from '@tensorflow/tfjs-node'
import { OpenAI } from 'openai'
import { Anthropic } from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../database/connection'
import { intelligenceEngine } from '../intelligence/intelligence-engine'
import { eventBus, createEvent } from '../events/event-bus'

export interface LearningDataPoint {
  sellerId: string
  recommendationId: string
  agentType: string
  recommendationType: string
  contextFeatures: number[]
  targetOutcome: number
  actualOutcome: number
  timestamp: Date
  sellerFeatures: number[]
  marketFeatures: number[]
  productFeatures: number[]
}

export interface ModelPrediction {
  prediction: number
  confidence: number
  featureImportance: Record<string, number>
  explanation: string[]
  uncertaintyBounds: [number, number]
}

export interface LearningMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  meanAbsoluteError: number
  meanSquaredError: number
  rSquared: number
  learningVelocity: number
}

export interface PatternInsight {
  pattern: string
  strength: number
  frequency: number
  conditions: string[]
  examples: any[]
  actionableInsights: string[]
  confidence: number
}

export class AdvancedLearningEngine {
  private models = new Map<string, tf.LayersModel>()
  private scaler = new Map<string, { mean: number[]; std: number[] }>()
  private openai: OpenAI
  private anthropic: Anthropic
  private trainingData = new Map<string, LearningDataPoint[]>()
  private isTraining = false
  private modelMetrics = new Map<string, LearningMetrics>()
  private patternCache = new Map<string, PatternInsight[]>()

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    this.initializeModels()
  }

  private async initializeModels(): Promise<void> {
    try {
      console.log('🧠 Initializing Advanced Learning Engine...')

      // Initialize models for different prediction tasks
      await this.createModel('stockout_prediction', 15, 1) // 15 features → 1 output (days until stockout)
      await this.createModel('buy_box_prediction', 12, 1) // 12 features → 1 output (probability)
      await this.createModel('price_optimization', 20, 1) // 20 features → 1 output (optimal price)
      await this.createModel('demand_forecasting', 25, 7) // 25 features → 7 outputs (next 7 days)
      await this.createModel('recommendation_success', 18, 1) // 18 features → 1 output (success probability)

      // Load existing trained models if available
      await this.loadExistingModels()

      console.log('✅ Advanced Learning Engine initialized')

    } catch (error) {
      console.error('❌ Failed to initialize Advanced Learning Engine:', error)
    }
  }

  private async createModel(modelName: string, inputDim: number, outputDim: number): Promise<void> {
    try {
      // Create sophisticated neural network architecture
      const model = tf.sequential({
        layers: [
          // Input layer with dropout for regularization
          tf.layers.dense({
            inputShape: [inputDim],
            units: 128,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
          }),
          tf.layers.dropout({ rate: 0.3 }),

          // Hidden layers with batch normalization
          tf.layers.dense({
            units: 256,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
          }),
          tf.layers.batchNormalization(),
          tf.layers.dropout({ rate: 0.4 }),

          tf.layers.dense({
            units: 128,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
          }),
          tf.layers.batchNormalization(),
          tf.layers.dropout({ rate: 0.3 }),

          tf.layers.dense({
            units: 64,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.2 }),

          // Output layer
          tf.layers.dense({
            units: outputDim,
            activation: outputDim === 1 ? 'linear' : 'softmax'
          })
        ]
      })

      // Compile model with advanced optimizer
      model.compile({
        optimizer: tf.train.adamax(0.001),
        loss: outputDim === 1 ? 'meanSquaredError' : 'categoricalCrossentropy',
        metrics: ['accuracy', 'meanAbsoluteError']
      })

      this.models.set(modelName, model)
      console.log(`📊 Created ${modelName} model: ${inputDim} → ${outputDim}`)

    } catch (error) {
      console.error(`Failed to create model ${modelName}:`, error)
    }
  }

  // Main learning interface - processes recommendation outcomes
  async processLearningOutcome(outcome: {
    recommendationId: string
    sellerId: string
    agentType: string
    recommendationType: string
    implemented: boolean
    actualImpact: number
    predictedImpact: number
    accuracy: number
    contextData: any
    sellerData: any
    marketData: any
    productData: any
  }): Promise<void> {
    try {
      console.log(`🎯 Processing learning outcome for ${outcome.recommendationId}`)

      // Extract features from the outcome
      const features = await this.extractFeatures(outcome)
      
      // Create learning data point
      const dataPoint: LearningDataPoint = {
        sellerId: outcome.sellerId,
        recommendationId: outcome.recommendationId,
        agentType: outcome.agentType,
        recommendationType: outcome.recommendationType,
        contextFeatures: features.contextFeatures,
        targetOutcome: outcome.predictedImpact,
        actualOutcome: outcome.actualImpact,
        timestamp: new Date(),
        sellerFeatures: features.sellerFeatures,
        marketFeatures: features.marketFeatures,
        productFeatures: features.productFeatures
      }

      // Store training data
      const modelKey = this.getModelKey(outcome.agentType, outcome.recommendationType)
      if (!this.trainingData.has(modelKey)) {
        this.trainingData.set(modelKey, [])
      }
      this.trainingData.get(modelKey)!.push(dataPoint)

      // Trigger incremental learning if we have enough data
      const trainingSize = this.trainingData.get(modelKey)!.length
      if (trainingSize >= 10 && trainingSize % 5 === 0) {
        await this.performIncrementalLearning(modelKey)
      }

      // Extract patterns using AI
      await this.extractPatternsWithAI(dataPoint)

      // Update cross-agent learning
      await this.updateCrossAgentLearning(dataPoint)

      // Store learning outcome in database
      await this.storeLearningOutcome(dataPoint)

      console.log(`✅ Learning outcome processed for ${outcome.recommendationId}`)

    } catch (error) {
      console.error('Failed to process learning outcome:', error)
    }
  }

  // Intelligent prediction with ensemble methods
  async makePrediction(
    agentType: string,
    recommendationType: string,
    features: {
      contextFeatures: number[]
      sellerFeatures: number[]
      marketFeatures: number[]
      productFeatures: number[]
    }
  ): Promise<ModelPrediction> {
    try {
      const modelKey = this.getModelKey(agentType, recommendationType)
      const model = this.models.get(modelKey)

      if (!model) {
        return this.getDefaultPrediction(agentType, recommendationType)
      }

      // Normalize features
      const normalizedFeatures = this.normalizeFeatures(modelKey, [
        ...features.contextFeatures,
        ...features.sellerFeatures,
        ...features.marketFeatures,
        ...features.productFeatures
      ])

      // Make prediction
      const inputTensor = tf.tensor2d([normalizedFeatures])
      const predictionTensor = model.predict(inputTensor) as tf.Tensor
      const predictionData = await predictionTensor.data()
      
      // Clean up tensors
      inputTensor.dispose()
      predictionTensor.dispose()

      const prediction = predictionData[0]

      // Calculate confidence based on historical accuracy
      const confidence = this.calculatePredictionConfidence(modelKey, normalizedFeatures)

      // Generate explanation using AI
      const explanation = await this.generatePredictionExplanation(
        agentType,
        recommendationType,
        features,
        prediction,
        confidence
      )

      // Calculate uncertainty bounds
      const uncertaintyBounds = this.calculateUncertaintyBounds(prediction, confidence)

      // Calculate feature importance
      const featureImportance = await this.calculateFeatureImportance(modelKey, normalizedFeatures)

      return {
        prediction,
        confidence,
        featureImportance,
        explanation,
        uncertaintyBounds
      }

    } catch (error) {
      console.error('Prediction failed:', error)
      return this.getDefaultPrediction(agentType, recommendationType)
    }
  }

  // Pattern recognition using advanced algorithms
  async identifyPatterns(
    agentType: string,
    lookbackDays: number = 30
  ): Promise<PatternInsight[]> {
    try {
      const cacheKey = `patterns_${agentType}_${lookbackDays}`
      
      // Check cache first
      if (this.patternCache.has(cacheKey)) {
        const cached = this.patternCache.get(cacheKey)!
        const cacheAge = Date.now() - cached[0]?.timestamp || 0
        if (cacheAge < 4 * 60 * 60 * 1000) { // 4 hours cache
          return cached
        }
      }

      // Get recent learning data
      const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
      const relevantData = Array.from(this.trainingData.values())
        .flat()
        .filter(dp => dp.agentType === agentType && dp.timestamp >= cutoffDate)

      if (relevantData.length < 10) {
        return []
      }

      const patterns: PatternInsight[] = []

      // 1. Success Pattern Recognition
      const successPatterns = await this.identifySuccessPatterns(relevantData)
      patterns.push(...successPatterns)

      // 2. Failure Mode Detection
      const failurePatterns = await this.identifyFailurePatterns(relevantData)
      patterns.push(...failurePatterns)

      // 3. Temporal Pattern Analysis
      const temporalPatterns = await this.identifyTemporalPatterns(relevantData)
      patterns.push(...temporalPatterns)

      // 4. Context-Dependent Patterns
      const contextPatterns = await this.identifyContextPatterns(relevantData)
      patterns.push(...contextPatterns)

      // 5. Cross-Product Patterns
      const crossProductPatterns = await this.identifyCrossProductPatterns(relevantData)
      patterns.push(...crossProductPatterns)

      // Cache results
      this.patternCache.set(cacheKey, patterns)

      return patterns.sort((a, b) => b.strength - a.strength)

    } catch (error) {
      console.error('Pattern identification failed:', error)
      return []
    }
  }

  // Feature extraction from recommendation outcomes
  private async extractFeatures(outcome: any): Promise<{
    contextFeatures: number[]
    sellerFeatures: number[]
    marketFeatures: number[]
    productFeatures: number[]
  }> {
    try {
      // Context features (15 features)
      const contextFeatures = [
        outcome.accuracy || 0,
        outcome.implemented ? 1 : 0,
        Math.abs(outcome.actualImpact) || 0,
        Math.abs(outcome.predictedImpact) || 0,
        outcome.contextData?.urgency_score || 5,
        outcome.contextData?.confidence || 0.5,
        outcome.contextData?.risk_level || 0.5,
        outcome.contextData?.time_to_implement || 24,
        outcome.contextData?.market_volatility || 0.3,
        outcome.contextData?.seasonal_factor || 1.0,
        outcome.contextData?.competition_intensity || 0.5,
        outcome.contextData?.seller_experience || 12,
        outcome.contextData?.recommendation_complexity || 0.5,
        outcome.contextData?.resource_requirements || 0.3,
        outcome.contextData?.external_factors || 0.2
      ]

      // Seller features (12 features)
      const sellerFeatures = [
        outcome.sellerData?.total_revenue || 0,
        outcome.sellerData?.product_count || 0,
        outcome.sellerData?.avg_margin || 0,
        outcome.sellerData?.inventory_turnover || 0,
        outcome.sellerData?.customer_satisfaction || 4.0,
        outcome.sellerData?.operational_efficiency || 0.7,
        outcome.sellerData?.market_position || 0.5,
        outcome.sellerData?.brand_strength || 0.5,
        outcome.sellerData?.financial_stability || 0.8,
        outcome.sellerData?.growth_rate || 0.1,
        outcome.sellerData?.risk_tolerance || 0.5,
        outcome.sellerData?.automation_level || 0.3
      ]

      // Market features (10 features)
      const marketFeatures = [
        outcome.marketData?.demand_trend || 0,
        outcome.marketData?.price_volatility || 0.2,
        outcome.marketData?.competition_level || 0.5,
        outcome.marketData?.market_size || 1000,
        outcome.marketData?.growth_potential || 0.1,
        outcome.marketData?.entry_barriers || 0.3,
        outcome.marketData?.regulatory_risk || 0.1,
        outcome.marketData?.technology_disruption || 0.2,
        outcome.marketData?.economic_indicators || 0.5,
        outcome.marketData?.consumer_sentiment || 0.6
      ]

      // Product features (8 features)
      const productFeatures = [
        outcome.productData?.price || 0,
        outcome.productData?.velocity || 0,
        outcome.productData?.margin || 0,
        outcome.productData?.ranking || 0,
        outcome.productData?.review_score || 4.0,
        outcome.productData?.buy_box_percentage || 0.5,
        outcome.productData?.conversion_rate || 0.1,
        outcome.productData?.inventory_level || 0
      ]

      return {
        contextFeatures,
        sellerFeatures,
        marketFeatures,
        productFeatures
      }

    } catch (error) {
      console.error('Feature extraction failed:', error)
      return {
        contextFeatures: new Array(15).fill(0),
        sellerFeatures: new Array(12).fill(0),
        marketFeatures: new Array(10).fill(0),
        productFeatures: new Array(8).fill(0)
      }
    }
  }

  // Incremental learning to update models with new data
  private async performIncrementalLearning(modelKey: string): Promise<void> {
    if (this.isTraining) return // Prevent concurrent training

    try {
      this.isTraining = true
      console.log(`🎓 Starting incremental learning for ${modelKey}`)

      const model = this.models.get(modelKey)
      const trainingData = this.trainingData.get(modelKey)

      if (!model || !trainingData || trainingData.length < 10) {
        return
      }

      // Prepare training data
      const { inputs, outputs } = this.prepareTrainingData(trainingData)
      
      if (inputs.length === 0) return

      // Normalize features
      this.updateScaler(modelKey, inputs)
      const normalizedInputs = inputs.map(input => this.normalizeFeatures(modelKey, input))

      // Convert to tensors
      const inputTensor = tf.tensor2d(normalizedInputs)
      const outputTensor = tf.tensor2d(outputs.map(o => [o]))

      // Train model with early stopping
      const history = await model.fit(inputTensor, outputTensor, {
        epochs: 20,
        batchSize: Math.min(32, Math.floor(inputs.length / 4)),
        validationSplit: 0.2,
        shuffle: true,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (logs && logs.val_loss && logs.val_loss > logs.loss * 2) {
              console.log('Early stopping triggered')
              return true // Stop training if overfitting
            }
          }
        }
      })

      // Clean up tensors
      inputTensor.dispose()
      outputTensor.dispose()

      // Calculate and store metrics
      const metrics = await this.calculateModelMetrics(modelKey, trainingData)
      this.modelMetrics.set(modelKey, metrics)

      // Save model if performance improved
      await this.saveModelIfImproved(modelKey, metrics)

      console.log(`✅ Incremental learning completed for ${modelKey}`)
      console.log(`📊 Model metrics: Accuracy: ${metrics.accuracy.toFixed(3)}, MAE: ${metrics.meanAbsoluteError.toFixed(3)}`)

    } catch (error) {
      console.error(`Incremental learning failed for ${modelKey}:`, error)
    } finally {
      this.isTraining = false
    }
  }

  // Advanced pattern recognition using AI
  private async extractPatternsWithAI(dataPoint: LearningDataPoint): Promise<void> {
    try {
      // Get similar data points for pattern analysis
      const similarPoints = this.findSimilarDataPoints(dataPoint, 20)
      
      if (similarPoints.length < 5) return

      // Use Claude for pattern analysis
      const patternPrompt = `
Analyze these recommendation outcomes to identify success patterns:

Recommendation Type: ${dataPoint.recommendationType}
Agent: ${dataPoint.agentType}

Recent Outcomes:
${similarPoints.map((point, i) => `
${i + 1}. Predicted: ${point.targetOutcome.toFixed(0)}, Actual: ${point.actualOutcome.toFixed(0)}, Accuracy: ${((1 - Math.abs(point.targetOutcome - point.actualOutcome) / Math.abs(point.targetOutcome)) * 100).toFixed(1)}%
Context: ${JSON.stringify(point.contextFeatures.slice(0, 5))}
`).join('')}

Identify patterns in:
1. What conditions lead to accurate predictions
2. What seller characteristics correlate with success
3. What market conditions affect outcomes
4. What timing factors matter

Provide insights as JSON:
{
  "success_patterns": [
    {
      "pattern": "pattern description",
      "conditions": ["condition1", "condition2"],
      "strength": number (0-1),
      "examples": ["example1", "example2"]
    }
  ],
  "failure_patterns": [
    {
      "pattern": "failure pattern description", 
      "warning_signs": ["sign1", "sign2"],
      "mitigation": ["strategy1", "strategy2"]
    }
  ],
  "recommendations": ["recommendation1", "recommendation2"]
}
`

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: patternPrompt
        }]
      })

      const analysis = JSON.parse(response.content[0].text || '{}')

      // Store pattern insights
      await this.storePatternInsights(dataPoint, analysis)

    } catch (error) {
      console.error('AI pattern extraction failed:', error)
    }
  }

  // Cross-agent learning coordination
  private async updateCrossAgentLearning(dataPoint: LearningDataPoint): Promise<void> {
    try {
      // Find correlations with other agents' outcomes
      const crossAgentInsights = await this.findCrossAgentCorrelations(dataPoint)
      
      if (crossAgentInsights.length > 0) {
        // Share insights with intelligence engine
        await intelligenceEngine.query({
          type: 'pattern_recognition',
          domain: 'cross_domain',
          sellerId: dataPoint.sellerId,
          context: {
            cross_agent_learning: true,
            insights: crossAgentInsights,
            source_agent: dataPoint.agentType
          }
        })

        // Publish cross-agent learning event
        await eventBus.publish(createEvent(
          'learning.cross_agent_insight',
          'performance',
          dataPoint.sellerId,
          {
            source_agent: dataPoint.agentType,
            insights: crossAgentInsights,
            correlation_strength: crossAgentInsights.reduce((sum, insight) => sum + insight.strength, 0) / crossAgentInsights.length
          },
          { importance: 7 }
        ))
      }

    } catch (error) {
      console.error('Cross-agent learning update failed:', error)
    }
  }

  // Success pattern identification
  private async identifySuccessPatterns(data: LearningDataPoint[]): Promise<PatternInsight[]> {
    const patterns: PatternInsight[] = []

    try {
      // Group by accuracy levels
      const highAccuracy = data.filter(d => this.calculateAccuracy(d) > 0.8)
      const mediumAccuracy = data.filter(d => this.calculateAccuracy(d) > 0.6 && this.calculateAccuracy(d) <= 0.8)
      
      if (highAccuracy.length >= 3) {
        // Analyze what makes recommendations highly accurate
        const commonFeatures = this.findCommonFeatures(highAccuracy)
        
        if (commonFeatures.length > 0) {
          patterns.push({
            pattern: 'High Accuracy Success Pattern',
            strength: highAccuracy.length / data.length,
            frequency: highAccuracy.length,
            conditions: commonFeatures,
            examples: highAccuracy.slice(0, 3).map(d => ({
              predicted: d.targetOutcome,
              actual: d.actualOutcome,
              accuracy: this.calculateAccuracy(d)
            })),
            actionableInsights: [
              'Focus on recommendations with similar feature patterns',
              'Increase confidence for recommendations matching these conditions',
              'Prioritize similar contexts for future recommendations'
            ],
            confidence: Math.min(0.95, highAccuracy.length / 10)
          })
        }
      }

      // Impact pattern analysis
      const highImpact = data.filter(d => Math.abs(d.actualOutcome) > 1000)
      if (highImpact.length >= 3) {
        const impactFeatures = this.findCommonFeatures(highImpact)
        
        patterns.push({
          pattern: 'High Impact Success Pattern',
          strength: highImpact.reduce((sum, d) => sum + Math.abs(d.actualOutcome), 0) / data.reduce((sum, d) => sum + Math.abs(d.actualOutcome), 1),
          frequency: highImpact.length,
          conditions: impactFeatures,
          examples: highImpact.slice(0, 3).map(d => ({
            type: d.recommendationType,
            impact: d.actualOutcome
          })),
          actionableInsights: [
            'Recommendations with these conditions generate higher business impact',
            'Allocate more resources to similar opportunities',
            'Fast-track recommendations matching these patterns'
          ],
          confidence: Math.min(0.9, highImpact.length / 8)
        })
      }

    } catch (error) {
      console.error('Success pattern identification failed:', error)
    }

    return patterns
  }

  // Failure pattern detection
  private async identifyFailurePatterns(data: LearningDataPoint[]): Promise<PatternInsight[]> {
    const patterns: PatternInsight[] = []

    try {
      // Group by accuracy levels
      const lowAccuracy = data.filter(d => this.calculateAccuracy(d) < 0.4)
      const negativeImpact = data.filter(d => d.actualOutcome < 0 && d.targetOutcome > 0)
      
      if (lowAccuracy.length >= 3) {
        const failureFeatures = this.findCommonFeatures(lowAccuracy)
        
        patterns.push({
          pattern: 'Low Accuracy Failure Pattern',
          strength: lowAccuracy.length / data.length,
          frequency: lowAccuracy.length,
          conditions: failureFeatures,
          examples: lowAccuracy.slice(0, 3).map(d => ({
            predicted: d.targetOutcome,
            actual: d.actualOutcome,
            accuracy: this.calculateAccuracy(d)
          })),
          actionableInsights: [
            'Avoid recommendations with these feature combinations',
            'Implement additional validation for similar contexts',
            'Lower confidence for recommendations matching these patterns'
          ],
          confidence: Math.min(0.9, lowAccuracy.length / 8)
        })
      }

      if (negativeImpact.length >= 2) {
        const negativeFeatures = this.findCommonFeatures(negativeImpact)
        
        patterns.push({
          pattern: 'Negative Impact Warning Pattern',
          strength: negativeImpact.length / data.length,
          frequency: negativeImpact.length,
          conditions: negativeFeatures,
          examples: negativeImpact.slice(0, 3).map(d => ({
            predicted: d.targetOutcome,
            actual: d.actualOutcome,
            loss: d.actualOutcome - d.targetOutcome
          })),
          actionableInsights: [
            'High risk pattern - implement additional safeguards',
            'Require manual approval for similar recommendations',
            'Investigate root causes of negative outcomes'
          ],
          confidence: Math.min(0.95, negativeImpact.length / 5)
        })
      }

    } catch (error) {
      console.error('Failure pattern identification failed:', error)
    }

    return patterns
  }

  // Temporal pattern analysis - identifies time-based patterns
  private async identifyTemporalPatterns(data: LearningDataPoint[]): Promise<PatternInsight[]> {
    const patterns: PatternInsight[] = []

    try {
      // Sort data by timestamp
      const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      
      // Day of week patterns
      const dayOfWeekPerformance = new Map<number, { count: number; avgAccuracy: number; avgImpact: number }>()
      
      sortedData.forEach(d => {
        const dayOfWeek = d.timestamp.getDay()
        const accuracy = this.calculateAccuracy(d)
        
        if (!dayOfWeekPerformance.has(dayOfWeek)) {
          dayOfWeekPerformance.set(dayOfWeek, { count: 0, avgAccuracy: 0, avgImpact: 0 })
        }
        
        const dayData = dayOfWeekPerformance.get(dayOfWeek)!
        dayData.count++
        dayData.avgAccuracy = (dayData.avgAccuracy * (dayData.count - 1) + accuracy) / dayData.count
        dayData.avgImpact = (dayData.avgImpact * (dayData.count - 1) + d.actualOutcome) / dayData.count
      })

      // Find significant day-of-week patterns
      const bestDay = Array.from(dayOfWeekPerformance.entries())
        .filter(([_, data]) => data.count >= 3)
        .sort(([_, a], [__, b]) => b.avgAccuracy - a.avgAccuracy)[0]

      if (bestDay && bestDay[1].avgAccuracy > 0.7) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        
        patterns.push({
          pattern: `${dayNames[bestDay[0]]} High Performance Pattern`,
          strength: bestDay[1].avgAccuracy,
          frequency: bestDay[1].count,
          conditions: [`day_of_week:${dayNames[bestDay[0]]}`, `avg_accuracy:${bestDay[1].avgAccuracy.toFixed(3)}`],
          examples: sortedData
            .filter(d => d.timestamp.getDay() === bestDay[0])
            .slice(0, 3)
            .map(d => ({
              timestamp: d.timestamp.toISOString().split('T')[0],
              accuracy: this.calculateAccuracy(d),
              impact: d.actualOutcome
            })),
          actionableInsights: [
            `Recommendations implemented on ${dayNames[bestDay[0]]}s show higher success rates`,
            'Consider scheduling important recommendations for this day',
            'Increase confidence for recommendations on this day'
          ],
          confidence: Math.min(0.8, bestDay[1].count / 10)
        })
      }

      // Time series trend analysis
      if (sortedData.length >= 10) {
        const timeWindowSize = Math.max(3, Math.floor(sortedData.length / 5))
        const recentWindow = sortedData.slice(-timeWindowSize)
        const earlierWindow = sortedData.slice(0, timeWindowSize)
        
        const recentAccuracy = recentWindow.reduce((sum, d) => sum + this.calculateAccuracy(d), 0) / recentWindow.length
        const earlierAccuracy = earlierWindow.reduce((sum, d) => sum + this.calculateAccuracy(d), 0) / earlierWindow.length
        
        const improvementTrend = recentAccuracy - earlierAccuracy
        
        if (Math.abs(improvementTrend) > 0.1) {
          patterns.push({
            pattern: improvementTrend > 0 ? 'Learning Acceleration Pattern' : 'Performance Degradation Pattern',
            strength: Math.abs(improvementTrend),
            frequency: timeWindowSize,
            conditions: [
              `trend_direction:${improvementTrend > 0 ? 'improving' : 'declining'}`,
              `improvement_rate:${(improvementTrend * 100).toFixed(1)}%`,
              `recent_accuracy:${recentAccuracy.toFixed(3)}`
            ],
            examples: recentWindow.slice(0, 3).map(d => ({
              timestamp: d.timestamp.toISOString().split('T')[0],
              accuracy: this.calculateAccuracy(d)
            })),
            actionableInsights: improvementTrend > 0 ? [
              'Model is learning and improving over time',
              'Continue current learning strategies',
              'Consider increasing recommendation frequency'
            ] : [
              'Model performance is declining - investigate causes',
              'Review recent changes in market conditions',
              'Consider retraining with fresh data'
            ],
            confidence: Math.min(0.9, Math.abs(improvementTrend) * 5)
          })
        }
      }

      // Seasonal patterns (if enough data)
      if (sortedData.length >= 30) {
        const seasonalPatterns = this.analyzeSeasonalPatterns(sortedData)
        patterns.push(...seasonalPatterns)
      }

    } catch (error) {
      console.error('Temporal pattern identification failed:', error)
    }

    return patterns
  }

  // Context-dependent pattern analysis
  private async identifyContextPatterns(data: LearningDataPoint[]): Promise<PatternInsight[]> {
    const patterns: PatternInsight[] = []

    try {
      // Group by recommendation types
      const typeGroups = new Map<string, LearningDataPoint[]>()
      data.forEach(d => {
        if (!typeGroups.has(d.recommendationType)) {
          typeGroups.set(d.recommendationType, [])
        }
        typeGroups.get(d.recommendationType)!.push(d)
      })

      // Analyze each recommendation type
      for (const [recType, points] of typeGroups.entries()) {
        if (points.length < 5) continue

        const avgAccuracy = points.reduce((sum, p) => sum + this.calculateAccuracy(p), 0) / points.length
        const avgImpact = points.reduce((sum, p) => sum + Math.abs(p.actualOutcome), 0) / points.length

        // Feature correlation analysis
        const featureCorrelations = this.analyzeFeatureCorrelations(points)
        const strongCorrelations = featureCorrelations.filter(corr => Math.abs(corr.correlation) > 0.6)

        if (strongCorrelations.length > 0) {
          patterns.push({
            pattern: `${recType} Context Pattern`,
            strength: avgAccuracy,
            frequency: points.length,
            conditions: strongCorrelations.map(corr => 
              `${corr.featureName}:${corr.correlation > 0 ? 'positive' : 'negative'}_correlation`
            ),
            examples: points.slice(0, 3).map(p => ({
              recommendationType: p.recommendationType,
              accuracy: this.calculateAccuracy(p),
              impact: p.actualOutcome,
              keyFeatures: this.getTopFeatures(p)
            })),
            actionableInsights: [
              `${recType} recommendations perform best under specific conditions`,
              'Use feature correlations to improve targeting',
              `Average expected impact: $${avgImpact.toFixed(0)}`
            ],
            confidence: Math.min(0.85, points.length / 15)
          })
        }
      }

      // Seller context patterns
      const sellerGroups = new Map<string, LearningDataPoint[]>()
      data.forEach(d => {
        if (!sellerGroups.has(d.sellerId)) {
          sellerGroups.set(d.sellerId, [])
        }
        sellerGroups.get(d.sellerId)!.push(d)
      })

      // Find seller-specific patterns
      for (const [sellerId, points] of sellerGroups.entries()) {
        if (points.length < 8) continue

        const sellerAccuracy = points.reduce((sum, p) => sum + this.calculateAccuracy(p), 0) / points.length
        
        if (sellerAccuracy > 0.8 || sellerAccuracy < 0.4) {
          const sellerFeatures = this.analyzeSellerFeatures(points)
          
          patterns.push({
            pattern: sellerAccuracy > 0.8 ? 'High-Performing Seller Pattern' : 'Challenging Seller Pattern',
            strength: Math.abs(sellerAccuracy - 0.6), // Distance from average
            frequency: points.length,
            conditions: [
              `seller_accuracy:${sellerAccuracy.toFixed(3)}`,
              ...sellerFeatures.slice(0, 3)
            ],
            examples: points.slice(0, 2).map(p => ({
              recommendationType: p.recommendationType,
              accuracy: this.calculateAccuracy(p)
            })),
            actionableInsights: sellerAccuracy > 0.8 ? [
              'This seller profile responds well to recommendations',
              'Consider offering more advanced optimization features',
              'Use as reference for similar sellers'
            ] : [
              'This seller profile needs customized approach',
              'Implement additional validation and support',
              'Consider simplified recommendations initially'
            ],
            confidence: Math.min(0.8, points.length / 12)
          })
        }
      }

    } catch (error) {
      console.error('Context pattern identification failed:', error)
    }

    return patterns
  }

  // Cross-product pattern analysis
  private async identifyCrossProductPatterns(data: LearningDataPoint[]): Promise<PatternInsight[]> {
    const patterns: PatternInsight[] = []

    try {
      // Group by seller to find cross-product correlations
      const sellerGroups = new Map<string, LearningDataPoint[]>()
      data.forEach(d => {
        if (!sellerGroups.has(d.sellerId)) {
          sellerGroups.set(d.sellerId, [])
        }
        sellerGroups.get(d.sellerId)!.push(d)
      })

      for (const [sellerId, points] of sellerGroups.entries()) {
        if (points.length < 6) continue

        // Analyze portfolio effects
        const portfolioEffects = this.analyzePortfolioEffects(points)
        
        if (portfolioEffects.strength > 0.3) {
          patterns.push({
            pattern: 'Cross-Product Portfolio Effect',
            strength: portfolioEffects.strength,
            frequency: points.length,
            conditions: [
              `portfolio_size:${portfolioEffects.productCount}`,
              `category_diversity:${portfolioEffects.categoryDiversity}`,
              `synergy_effect:${portfolioEffects.synergyScore.toFixed(3)}`
            ],
            examples: portfolioEffects.examples,
            actionableInsights: [
              'Recommendations show portfolio-wide effects',
              'Consider holistic optimization strategies',
              'Account for cross-product dependencies'
            ],
            confidence: Math.min(0.75, points.length / 20)
          })
        }

        // Category clustering effects
        const categoryEffects = this.analyzeCategoryClusteringEffects(points)
        
        if (categoryEffects.length > 0) {
          patterns.push(...categoryEffects.map(effect => ({
            pattern: `Category Clustering Effect: ${effect.category}`,
            strength: effect.strength,
            frequency: effect.count,
            conditions: [
              `category:${effect.category}`,
              `cluster_performance:${effect.performance.toFixed(3)}`,
              `product_count:${effect.count}`
            ],
            examples: effect.examples,
            actionableInsights: [
              `Products in ${effect.category} show correlated performance`,
              'Apply category-specific optimization strategies',
              'Consider category-level resource allocation'
            ],
            confidence: Math.min(0.8, effect.count / 10)
          })))
        }
      }

    } catch (error) {
      console.error('Cross-product pattern identification failed:', error)
    }

    return patterns
  }

  // Calculate comprehensive model metrics
  private async calculateModelMetrics(modelKey: string, data: LearningDataPoint[]): Promise<LearningMetrics> {
    try {
      const model = this.models.get(modelKey)
      if (!model || data.length === 0) {
        return this.getDefaultMetrics()
      }

      // Prepare test data
      const testData = data.slice(-Math.min(20, Math.floor(data.length * 0.3))) // Use last 30% for testing
      const { inputs, outputs } = this.prepareTrainingData(testData)
      
      if (inputs.length === 0) {
        return this.getDefaultMetrics()
      }

      // Normalize inputs
      const normalizedInputs = inputs.map(input => this.normalizeFeatures(modelKey, input))
      
      // Make predictions
      const inputTensor = tf.tensor2d(normalizedInputs)
      const predictions = model.predict(inputTensor) as tf.Tensor
      const predictionData = await predictions.data()
      
      // Clean up tensors
      inputTensor.dispose()
      predictions.dispose()

      // Calculate metrics
      const actualValues = outputs
      const predictedValues = Array.from(predictionData)

      const accuracy = this.calculateAccuracy_Metrics(actualValues, predictedValues)
      const precision = this.calculatePrecision(actualValues, predictedValues)
      const recall = this.calculateRecall(actualValues, predictedValues)
      const f1Score = (2 * precision * recall) / (precision + recall) || 0
      const meanAbsoluteError = this.calculateMAE(actualValues, predictedValues)
      const meanSquaredError = this.calculateMSE(actualValues, predictedValues)
      const rSquared = this.calculateRSquared(actualValues, predictedValues)

      // Calculate learning velocity (improvement rate)
      const learningVelocity = this.calculateLearningVelocity(modelKey, data)

      return {
        accuracy,
        precision,
        recall,
        f1Score,
        meanAbsoluteError,
        meanSquaredError,
        rSquared,
        learningVelocity
      }

    } catch (error) {
      console.error('Model metrics calculation failed:', error)
      return this.getDefaultMetrics()
    }
  }

  // Generate AI-powered prediction explanations
  private async generatePredictionExplanation(
    agentType: string,
    recommendationType: string,
    features: any,
    prediction: number,
    confidence: number
  ): Promise<string[]> {
    try {
      const explanationPrompt = `
Explain this AI prediction for an Amazon seller:

Agent: ${agentType}
Recommendation Type: ${recommendationType}
Prediction: ${prediction.toFixed(2)}
Confidence: ${(confidence * 100).toFixed(1)}%

Input Features:
- Context Features: ${features.contextFeatures.slice(0, 5).map((f: number) => f.toFixed(2)).join(', ')}
- Seller Features: ${features.sellerFeatures.slice(0, 5).map((f: number) => f.toFixed(2)).join(', ')}
- Market Features: ${features.marketFeatures.slice(0, 5).map((f: number) => f.toFixed(2)).join(', ')}
- Product Features: ${features.productFeatures.slice(0, 4).map((f: number) => f.toFixed(2)).join(', ')}

Provide a clear, actionable explanation in 3-4 bullet points:

1. Main driver of this prediction
2. Key supporting factors
3. Confidence reasoning
4. Risk factors or limitations

Make it understandable for a business owner, not a data scientist.
`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{
          role: 'system',
          content: 'You are an expert at explaining AI predictions to business owners. Be clear, concise, and actionable.'
        }, {
          role: 'user',
          content: explanationPrompt
        }],
        temperature: 0.3,
        max_tokens: 400
      })

      const explanation = response.choices[0].message.content || ''
      return explanation.split('\n').filter(line => line.trim()).slice(0, 4)

    } catch (error) {
      console.error('Prediction explanation failed:', error)
      return [
        `Prediction: ${prediction.toFixed(2)} with ${(confidence * 100).toFixed(1)}% confidence`,
        'Based on current market conditions and historical performance',
        'Consider market volatility when implementing',
        'Monitor results and provide feedback for learning'
      ]
    }
  }

  // Feature importance calculation using SHAP-like approach
  private async calculateFeatureImportance(modelKey: string, features: number[]): Promise<Record<string, number>> {
    try {
      const model = this.models.get(modelKey)
      if (!model) {
        return {}
      }

      const importance: Record<string, number> = {}
      const baselinePrediction = await this.makePredictionWithFeatures(model, features)

      // Feature names mapping
      const featureNames = [
        'accuracy', 'implemented', 'impact_magnitude', 'predicted_impact', 'urgency',
        'confidence', 'risk_level', 'time_to_implement', 'market_volatility', 'seasonal',
        'competition', 'experience', 'complexity', 'resources', 'external_factors',
        'revenue', 'product_count', 'margin', 'inventory_turnover', 'satisfaction',
        'efficiency', 'market_position', 'brand_strength', 'financial_stability', 'growth',
        'risk_tolerance', 'automation', 'demand_trend', 'price_volatility', 'competition_level',
        'market_size', 'growth_potential', 'entry_barriers', 'regulatory_risk', 'tech_disruption',
        'economic_indicators', 'consumer_sentiment', 'price', 'velocity', 'product_margin',
        'ranking', 'review_score', 'buy_box_rate', 'conversion_rate', 'inventory_level'
      ]

      // Calculate importance by feature perturbation
      for (let i = 0; i < Math.min(features.length, featureNames.length); i++) {
        const perturbedFeatures = [...features]
        perturbedFeatures[i] = 0 // Zero out the feature
        
        const perturbedPrediction = await this.makePredictionWithFeatures(model, perturbedFeatures)
        const importanceScore = Math.abs(baselinePrediction - perturbedPrediction)
        
        importance[featureNames[i]] = importanceScore
      }

      // Normalize importance scores
      const maxImportance = Math.max(...Object.values(importance))
      if (maxImportance > 0) {
        Object.keys(importance).forEach(key => {
          importance[key] = importance[key] / maxImportance
        })
      }

      // Return top 10 most important features
      const sortedImportance = Object.entries(importance)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

      return sortedImportance

    } catch (error) {
      console.error('Feature importance calculation failed:', error)
      return {}
    }
  }

  // Uncertainty quantification
  private calculateUncertaintyBounds(prediction: number, confidence: number): [number, number] {
    // Calculate prediction intervals based on confidence
    const uncertainty = (1 - confidence) * Math.abs(prediction) * 0.5
    const lowerBound = prediction - uncertainty
    const upperBound = prediction + uncertainty
    
    return [lowerBound, upperBound]
  }

  // Prediction confidence calculation
  private calculatePredictionConfidence(modelKey: string, features: number[]): number {
    try {
      const metrics = this.modelMetrics.get(modelKey)
      if (!metrics) {
        return 0.5 // Default confidence
      }

      // Base confidence from model accuracy
      let confidence = metrics.accuracy * 0.6

      // Adjust based on feature quality
      const featureQuality = this.assessFeatureQuality(features)
      confidence += featureQuality * 0.2

      // Adjust based on historical performance
      const historicalPerformance = metrics.learningVelocity > 0 ? 0.1 : -0.1
      confidence += historicalPerformance

      // Adjust based on prediction certainty
      const predictionCertainty = 1 - (metrics.meanAbsoluteError / (Math.abs(features.reduce((sum, f) => sum + f, 0)) + 1))
      confidence += predictionCertainty * 0.1

      return Math.max(0.1, Math.min(0.95, confidence))

    } catch (error) {
      console.error('Confidence calculation failed:', error)
      return 0.5
    }
  }

  // Helper methods for calculations
  private calculateAccuracy(dataPoint: LearningDataPoint): number {
    if (dataPoint.targetOutcome === 0) return 0.5
    return Math.max(0, 1 - Math.abs(dataPoint.targetOutcome - dataPoint.actualOutcome) / Math.abs(dataPoint.targetOutcome))
  }

  private calculateAccuracy_Metrics(actual: number[], predicted: number[]): number {
    if (actual.length === 0) return 0
    
    let correct = 0
    for (let i = 0; i < actual.length; i++) {
      const accuracy = actual[i] === 0 ? 0.5 : Math.max(0, 1 - Math.abs(actual[i] - predicted[i]) / Math.abs(actual[i]))
      if (accuracy > 0.7) correct++
    }
    
    return correct / actual.length
  }

  private calculatePrecision(actual: number[], predicted: number[]): number {
    let truePositives = 0
    let falsePositives = 0
    
    for (let i = 0; i < actual.length; i++) {
      const actualPositive = actual[i] > 0
      const predictedPositive = predicted[i] > 0
      
      if (actualPositive && predictedPositive) truePositives++
      if (!actualPositive && predictedPositive) falsePositives++
    }
    
    return truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0
  }

  private calculateRecall(actual: number[], predicted: number[]): number {
    let truePositives = 0
    let falseNegatives = 0
    
    for (let i = 0; i < actual.length; i++) {
      const actualPositive = actual[i] > 0
      const predictedPositive = predicted[i] > 0
      
      if (actualPositive && predictedPositive) truePositives++
      if (actualPositive && !predictedPositive) falseNegatives++
    }
    
    return truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0
  }

  private calculateMAE(actual: number[], predicted: number[]): number {
    let sum = 0
    for (let i = 0; i < actual.length; i++) {
      sum += Math.abs(actual[i] - predicted[i])
    }
    return sum / actual.length
  }

  private calculateMSE(actual: number[], predicted: number[]): number {
    let sum = 0
    for (let i = 0; i < actual.length; i++) {
      sum += Math.pow(actual[i] - predicted[i], 2)
    }
    return sum / actual.length
  }

  private calculateRSquared(actual: number[], predicted: number[]): number {
    const actualMean = actual.reduce((sum, val) => sum + val, 0) / actual.length
    
    let totalSumSquares = 0
    let residualSumSquares = 0
    
    for (let i = 0; i < actual.length; i++) {
      totalSumSquares += Math.pow(actual[i] - actualMean, 2)
      residualSumSquares += Math.pow(actual[i] - predicted[i], 2)
    }
    
    return totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0
  }

  private calculateLearningVelocity(modelKey: string, data: LearningDataPoint[]): number {
    if (data.length < 10) return 0
    
    // Sort by timestamp
    const sortedData = data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    // Compare early vs recent performance
    const earlyPeriod = sortedData.slice(0, Math.floor(data.length / 3))
    const recentPeriod = sortedData.slice(-Math.floor(data.length / 3))
    
    const earlyAccuracy = earlyPeriod.reduce((sum, d) => sum + this.calculateAccuracy(d), 0) / earlyPeriod.length
    const recentAccuracy = recentPeriod.reduce((sum, d) => sum + this.calculateAccuracy(d), 0) / recentPeriod.length
    
    return recentAccuracy - earlyAccuracy
  }

  // /lib/ai/advanced-learning-engine.ts - Part 3/3

  /**
   * Data preparation and normalization methods
   */
  private prepareTrainingData(data: any[]): Float32Array[] {
    try {
      if (!data || data.length === 0) {
        this.logger.warn('Empty training data provided');
        return [];
      }

      return data.map(item => {
        const features = this.extractFeatures(item);
        return this.normalizeFeatures(features);
      });
    } catch (error) {
      this.logger.error('Error preparing training data:', error);
      return [];
    }
  }

  private extractFeatures(data: any): number[] {
    try {
      const features: number[] = [];
      
      // Extract numerical features
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'number' && !isNaN(value)) {
          features.push(value);
        } else if (typeof value === 'string') {
          // Convert strings to hash values for categorical data
          features.push(this.hashString(value) % 1000);
        } else if (typeof value === 'boolean') {
          features.push(value ? 1 : 0);
        }
      });

      return features.length > 0 ? features : [0]; // Ensure at least one feature
    } catch (error) {
      this.logger.error('Error extracting features:', error);
      return [0];
    }
  }

  private normalizeFeatures(features: number[]): Float32Array {
    try {
      if (features.length === 0) return new Float32Array([0]);

      const min = Math.min(...features);
      const max = Math.max(...features);
      const range = max - min;

      if (range === 0) {
        return new Float32Array(features.map(() => 0.5));
      }

      const normalized = features.map(f => (f - min) / range);
      return new Float32Array(normalized);
    } catch (error) {
      this.logger.error('Error normalizing features:', error);
      return new Float32Array([0]);
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Model persistence and loading functionality
   */
  private async saveModel(
    agentId: string,
    model: tf.LayersModel,
    metadata: any
  ): Promise<void> {
    try {
      const modelKey = `model:${agentId}:${Date.now()}`;
      
      // Save model to IndexedDB (browser) or memory (server)
      await model.save(`localstorage://${modelKey}`);
      
      // Store model metadata in Supabase
      const { error } = await this.supabase
        .from('learning_models')
        .insert({
          agent_id: agentId,
          model_key: modelKey,
          metadata,
          created_at: new Date().toISOString(),
          performance_score: metadata.accuracy || 0
        });

      if (error) throw error;
      
      this.logger.info(`Model saved for agent ${agentId}:`, modelKey);
    } catch (error) {
      this.logger.error('Error saving model:', error);
      throw error;
    }
  }

  private async loadModel(agentId: string): Promise<tf.LayersModel | null> {
    try {
      // Get latest model metadata
      const { data, error } = await this.supabase
        .from('learning_models')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        this.logger.warn(`No saved model found for agent ${agentId}`);
        return null;
      }

      const modelData = data[0];
      const model = await tf.loadLayersModel(`localstorage://${modelData.model_key}`);
      
      this.logger.info(`Model loaded for agent ${agentId}`);
      return model;
    } catch (error) {
      this.logger.error('Error loading model:', error);
      return null;
    }
  }

  /**
   * Pattern storage and retrieval methods
   */
  private async storePattern(
    agentId: string,
    pattern: LearningPattern,
    outcome: LearningOutcome
  ): Promise<void> {
    try {
      const patternData = {
        agent_id: agentId,
        pattern_type: pattern.type,
        pattern_data: pattern,
        outcome_data: outcome,
        confidence_score: pattern.confidence,
        created_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('learning_patterns')
        .insert(patternData);

      if (error) throw error;

      // Store in Redis for fast access
      const key = `pattern:${agentId}:${pattern.id}`;
      await this.redis.hset(key, {
        pattern: JSON.stringify(pattern),
        outcome: JSON.stringify(outcome),
        timestamp: Date.now().toString()
      });

      this.logger.info(`Pattern stored for agent ${agentId}:`, pattern.id);
    } catch (error) {
      this.logger.error('Error storing pattern:', error);
      throw error;
    }
  }

  private async retrievePatterns(
    agentId: string,
    type?: string,
    limit: number = 100
  ): Promise<{ pattern: LearningPattern; outcome: LearningOutcome }[]> {
    try {
      let query = this.supabase
        .from('learning_patterns')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type) {
        query = query.eq('pattern_type', type);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(row => ({
        pattern: row.pattern_data,
        outcome: row.outcome_data
      }));
    } catch (error) {
      this.logger.error('Error retrieving patterns:', error);
      return [];
    }
  }

  /**
   * Similarity algorithms
   */
  private calculateSimilarity(features1: number[], features2: number[]): number {
    try {
      if (features1.length !== features2.length) {
        // Pad shorter array with zeros
        const maxLength = Math.max(features1.length, features2.length);
        features1 = [...features1, ...new Array(maxLength - features1.length).fill(0)];
        features2 = [...features2, ...new Array(maxLength - features2.length).fill(0)];
      }

      return this.cosineSimilarity(features1, features2);
    } catch (error) {
      this.logger.error('Error calculating similarity:', error);
      return 0;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    try {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }

      normA = Math.sqrt(normA);
      normB = Math.sqrt(normB);

      if (normA === 0 || normB === 0) return 0;

      return dotProduct / (normA * normB);
    } catch (error) {
      this.logger.error('Error calculating cosine similarity:', error);
      return 0;
    }
  }

  private euclideanDistance(a: number[], b: number[]): number {
    try {
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        sum += Math.pow(a[i] - b[i], 2);
      }
      return Math.sqrt(sum);
    } catch (error) {
      this.logger.error('Error calculating euclidean distance:', error);
      return Infinity;
    }
  }

  /**
   * Feature correlation analysis
   */
  private analyzeFeatureCorrelations(data: number[][]): Map<string, number> {
    try {
      const correlations = new Map<string, number>();
      
      if (data.length < 2) return correlations;

      const features = data[0].length;
      
      for (let i = 0; i < features; i++) {
        for (let j = i + 1; j < features; j++) {
          const correlation = this.pearsonCorrelation(
            data.map(row => row[i]),
            data.map(row => row[j])
          );
          correlations.set(`${i}-${j}`, correlation);
        }
      }

      return correlations;
    } catch (error) {
      this.logger.error('Error analyzing feature correlations:', error);
      return new Map();
    }
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    try {
      const n = x.length;
      if (n !== y.length || n === 0) return 0;

      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
      const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

      return denominator === 0 ? 0 : numerator / denominator;
    } catch (error) {
      this.logger.error('Error calculating Pearson correlation:', error);
      return 0;
    }
  }

  /**
   * Helper methods and utilities
   */
  private generateModelId(): string {
    return `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateLearningData(data: any): boolean {
    return data && 
           typeof data === 'object' && 
           Object.keys(data).length > 0;
  }

  private createDefaultModel(inputShape: number): tf.LayersModel {
    try {
      const model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [inputShape],
            units: Math.max(32, Math.min(128, inputShape * 2)),
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: Math.max(16, Math.min(64, inputShape)),
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 1,
            activation: 'sigmoid'
          })
        ]
      });

      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      return model;
    } catch (error) {
      this.logger.error('Error creating default model:', error);
      throw error;
    }
  }

  private async cleanupOldModels(agentId: string, keepCount: number = 5): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('learning_models')
        .select('id, model_key')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data) return;

      const modelsToDelete = data.slice(keepCount);
      
      for (const model of modelsToDelete) {
        // Delete from storage
        try {
          const models = await tf.io.listModels();
          const modelUrl = `localstorage://${model.model_key}`;
          if (models[modelUrl]) {
            await tf.io.removeModel(modelUrl);
          }
        } catch (storageError) {
          this.logger.warn('Error deleting model from storage:', storageError);
        }

        // Delete from database
        await this.supabase
          .from('learning_models')
          .delete()
          .eq('id', model.id);
      }

      this.logger.info(`Cleaned up ${modelsToDelete.length} old models for agent ${agentId}`);
    } catch (error) {
      this.logger.error('Error cleaning up old models:', error);
    }
  }

  /**
   * Error handling and default values
   */
  private handleLearningError(error: any, context: string): LearningOutcome {
    this.logger.error(`Learning error in ${context}:`, error);
    
    return {
      success: false,
      accuracy: 0,
      confidence: 0,
      predictions: [],
      modelId: 'error',
      timestamp: new Date(),
      metadata: {
        error: error.message,
        context
      }
    };
  }

  private getDefaultPrediction(): { value: number; confidence: number } {
    return {
      value: 0.5, // Neutral prediction
      confidence: 0.1 // Low confidence
    };
  }

  private async handleCriticalError(error: any, agentId: string): Promise<void> {
    this.logger.error(`Critical learning engine error for agent ${agentId}:`, error);
    
    // Emit error event
    await this.redis.xadd(
      'learning:errors',
      '*',
      'agent_id', agentId,
      'error', JSON.stringify({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    );

    // Reset agent's learning state if needed
    await this.resetAgentLearning(agentId);
  }

  private async resetAgentLearning(agentId: string): Promise<void> {
    try {
      // Clear Redis cache
      const keys = await this.redis.keys(`learning:${agentId}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      // Mark models as inactive
      await this.supabase
        .from('learning_models')
        .update({ active: false })
        .eq('agent_id', agentId);

      this.logger.info(`Reset learning state for agent ${agentId}`);
    } catch (error) {
      this.logger.error('Error resetting agent learning:', error);
    }
  }

  /**
   * Performance monitoring and metrics
   */
  private async recordMetrics(agentId: string, metrics: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('learning_metrics')
        .insert({
          agent_id: agentId,
          metrics_data: metrics,
          recorded_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      this.logger.error('Error recording metrics:', error);
    }
  }

  /**
   * Cleanup and disposal
   */
  async dispose(): Promise<void> {
    try {
      // Dispose all TensorFlow models
      Object.values(this.models).forEach(model => {
        if (model) model.dispose();
      });

      // Clear caches
      this.predictionCache.clear();
      this.models = {};

      this.logger.info('Advanced Learning Engine disposed');
    } catch (error) {
      this.logger.error('Error disposing learning engine:', error);
    }
  }
}

// Export singleton instance
export const advancedLearningEngine = new AdvancedLearningEngine();
}