import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/utils/notifications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sellerId, testType = 'basic' } = body

    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId is required' },
        { status: 400 }
      )
    }

    let result: any = {}

    switch (testType) {
      case 'basic':
        await NotificationService.sendNotification({
          sellerId,
          title: 'Test Notification',
          message: 'This is a test notification to verify the system is working correctly.',
          urgency: 'normal',
          link: `${process.env.APP_URL}/dashboard`,
          data: { test: true, timestamp: new Date().toISOString() }
        })
        result = { message: 'Basic notification sent successfully' }
        break

      case 'daily_summary':
        await NotificationService.sendDailySummary(sellerId)
        result = { message: 'Daily summary sent (if data available)' }
        break

      case 'weekly_report':
        await NotificationService.sendWeeklyReport(sellerId)
        result = { message: 'Weekly report sent (if data available)' }
        break

      case 'all_urgencies':
        // Test all urgency levels
        const urgencies: Array<'low' | 'normal' | 'high' | 'critical'> = ['low', 'normal', 'high', 'critical']
        
        for (const urgency of urgencies) {
          await NotificationService.sendNotification({
            sellerId,
            title: `${urgency.toUpperCase()} Test Alert`,
            message: `Testing ${urgency} urgency level notification to verify proper handling and routing.`,
            urgency,
            link: `${process.env.APP_URL}/dashboard`
          })
          
          // Small delay between notifications
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        result = { message: 'All urgency level notifications sent' }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: basic, daily_summary, weekly_report, or all_urgencies' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      sellerId,
      testType,
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('Notification test failed:', error)
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      message: 'Notification Test API',
      available_tests: [
        'basic - Send a basic test notification',
        'daily_summary - Send daily summary (if data exists)',
        'weekly_report - Send weekly report (if data exists)', 
        'all_urgencies - Test all urgency levels'
      ],
      usage: 'POST /api/test-notifications with { "sellerId": "your-seller-id", "testType": "basic" }'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get test info' },
      { status: 500 }
    )
  }
}