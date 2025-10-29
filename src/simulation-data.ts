export type SimulationMode = 'normal' | 'vibration-warning' | 'critical-overheat' | 'critical-low-oil' | null

export const SIMULATION_DATA = {
  normal: {
    flowRate: 45.5,
    totalHead: 153.2,
    rpm: 1450,
    fuelLevel: 78.5,
    coolantTemperature: 85.3,
    oilPressure: 3.2,
    timeSeries: Array.from({ length: 50 }, (_, i) => ({
      time: i * 10,
      amplitude: (Math.random() - 0.5) * 0.5, // Low vibration
    })),
    fft: [
      { freq: '0-100', energy: 0.05 },
      { freq: '100-200', energy: 0.02 },
      { freq: '200-400', energy: 0.01 },
      { freq: '400-800', energy: 0.005 },
      { freq: '>800', energy: 0.002 },
    ],
  },
  'vibration-warning': {
    flowRate: 42.1,
    totalHead: 148.7,
    rpm: 1420,
    fuelLevel: 75.2,
    coolantTemperature: 87.1,
    oilPressure: 3.1,
    timeSeries: Array.from({ length: 50 }, (_, i) => ({
      time: i * 10,
      amplitude: (Math.random() - 0.5) * 1.2, // Moderate vibration
    })),
    fft: [
      { freq: '0-100', energy: 0.15 },
      { freq: '100-200', energy: 0.08 },
      { freq: '200-400', energy: 0.05 },
      { freq: '400-800', energy: 0.02 },
      { freq: '>800', energy: 0.01 },
    ],
  },
  'critical-overheat': {
    flowRate: 38.9,
    totalHead: 142.3,
    rpm: 1380,
    fuelLevel: 72.8,
    coolantTemperature: 115.7, // Overheat
    oilPressure: 2.9,
    timeSeries: Array.from({ length: 50 }, (_, i) => ({
      time: i * 10,
      amplitude: (Math.random() - 0.5) * 1.8, // High vibration
    })),
    fft: [
      { freq: '0-100', energy: 0.35 },
      { freq: '100-200', energy: 0.18 },
      { freq: '200-400', energy: 0.12 },
      { freq: '400-800', energy: 0.06 },
      { freq: '>800', energy: 0.03 },
    ],
  },
  'critical-low-oil': {
    flowRate: 35.6,
    totalHead: 139.8,
    rpm: 1350,
    fuelLevel: 71.4,
    coolantTemperature: 89.2,
    oilPressure: 1.2, // Low oil pressure
    timeSeries: Array.from({ length: 50 }, (_, i) => ({
      time: i * 10,
      amplitude: (Math.random() - 0.5) * 2.2, // Very high vibration
    })),
    fft: [
      { freq: '0-100', energy: 0.45 },
      { freq: '100-200', energy: 0.25 },
      { freq: '200-400', energy: 0.18 },
      { freq: '400-800', energy: 0.09 },
      { freq: '>800', energy: 0.04 },
    ],
  },
}