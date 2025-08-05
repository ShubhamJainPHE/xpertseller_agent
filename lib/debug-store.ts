// Simple in-memory store for debug data
let debugData: any = null

export function setDebugData(data: any) {
  debugData = data
}

export function getDebugData() {
  return debugData
}

export function clearDebugData() {
  debugData = null
}