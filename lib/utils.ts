export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }
  
  export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num)
  }
  
  export function cn(...classes: string[]): string {
    return classes.filter(Boolean).join(' ')
  }