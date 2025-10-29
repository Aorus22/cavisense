import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, Circle } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { SimulationMode, SIMULATION_DATA } from './simulation-data'
import { useWebSocket } from './ws'

export const Route = createFileRoute('/')({
  component: CaviSenseDashboard,
})

const DEFAULT_TIME_SERIES_DATA = Array.from({ length: 50 }, (_, i) => ({
  time: i * 10,
  amplitude: (Math.random() - 0.5) * 1.6,
}))

const DEFAULT_FFT_DATA = [
  { freq: '0-100', energy: 0.85 },
  { freq: '100-200', energy: 0.12 },
  { freq: '200-400', energy: 0.08 },
  { freq: '400-800', energy: 0.03 },
  { freq: '>800', energy: 0.02 },
]

type TimeSeriesPoint = {
  time: number
  amplitude: number
}

type FrequencyPoint = {
  freq: string
  energy: number
}

function CaviSenseDashboard() {
  const [timeSeriesData, setTimeSeriesData] =
    useState<Array<TimeSeriesPoint>>(DEFAULT_TIME_SERIES_DATA)
  const [fftData, setFftData] = useState<Array<FrequencyPoint>>(DEFAULT_FFT_DATA)
  const [simulationMode, setSimulationMode] = useState<SimulationMode>(null)

  const { connectionState, latestSensorData, connectionError, handleManualReconnect } = useWebSocket()

  const resolvedMetrics = useMemo(() => {
    // Use simulated data if simulation mode is active
    const dataSource = simulationMode ? SIMULATION_DATA[simulationMode] : latestSensorData

    const numericOrNull = (value: unknown): number | null =>
      typeof value === 'number' && Number.isFinite(value) ? value : null

    if (simulationMode) {
      // For simulation data, use direct properties
      const simData = SIMULATION_DATA[simulationMode]
      return {
        flowRate: numericOrNull(simData.flowRate),
        totalHead: numericOrNull(simData.totalHead),
        rpm: numericOrNull(simData.rpm),
        fuelLevel: numericOrNull(simData.fuelLevel),
        coolantTemperature: numericOrNull(simData.coolantTemperature),
        oilPressure: numericOrNull(simData.oilPressure),
      }
    } else {
      // For real sensor data, handle alternative property names
      return {
        flowRate: numericOrNull((dataSource as any)?.flowRate ?? (dataSource as any)?.debit),
        totalHead: numericOrNull((dataSource as any)?.totalHead ?? (dataSource as any)?.head),
        rpm: numericOrNull((dataSource as any)?.rpm),
        fuelLevel: numericOrNull(
          (dataSource as any)?.fuelLevel ??
            (dataSource as any)?.fuel_level ??
            (dataSource as any)?.fuel ??
            (dataSource as any)?.levelBbm ??
            (dataSource as any)?.level_bbm,
        ),
        coolantTemperature: numericOrNull(
          (dataSource as any)?.coolantTemperature ??
            (dataSource as any)?.coolantTemp ??
            (dataSource as any)?.suhuPendingin ??
            (dataSource as any)?.suhu_pendingin ??
            (dataSource as any)?.temperature,
        ),
        oilPressure: numericOrNull((dataSource as any)?.oilPressure ?? (dataSource as any)?.oil_pressure),
      }
    }
  }, [latestSensorData, simulationMode])

  const connectionBadge = useMemo(() => {
    switch (connectionState) {
      case 'open':
        return { label: 'Terhubung', className: 'bg-green-500 hover:bg-green-600' }
      case 'connecting':
        return { label: 'Menghubungkan...', className: 'bg-yellow-500 hover:bg-yellow-600' }
      case 'error':
        return { label: 'Gangguan', className: 'bg-red-500 hover:bg-red-600' }
      default:
        return { label: 'Terputus', className: 'bg-gray-500 hover:bg-gray-600' }
    }
  }, [connectionState])

  const formatMetricValue = (value: number | null, unit?: string, precision?: number) => {
    if (value === null) return '—'
    const resolvedPrecision =
      typeof precision === 'number'
        ? precision
        : Math.abs(value) >= 1000
          ? 0
          : Math.abs(value) >= 100
            ? 1
            : 2
    const formatted = value.toFixed(resolvedPrecision)
    if (!unit) return formatted
    if (unit === '%') return `${formatted}%`
    return `${formatted} ${unit}`
  }

  // Update time series and FFT data based on simulation mode or WebSocket data
  useEffect(() => {
    if (simulationMode) {
      setTimeSeriesData(SIMULATION_DATA[simulationMode].timeSeries)
      setFftData(SIMULATION_DATA[simulationMode].fft)
    } else if (latestSensorData?.timeSeries) {
      setTimeSeriesData(latestSensorData.timeSeries)
    } else {
      setTimeSeriesData(DEFAULT_TIME_SERIES_DATA)
    }

    if (simulationMode) {
      setFftData(SIMULATION_DATA[simulationMode].fft)
    } else if (latestSensorData?.fft) {
      setFftData(latestSensorData.fft)
    } else {
      setFftData(DEFAULT_FFT_DATA)
    }
  }, [simulationMode, latestSensorData])

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-linear-to-r from-blue-800 to-blue-600 text-white p-6">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <div className="w-12 h-12 bg-blue-800 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-purple-600 rounded-full"></div>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold">CaviSense UMS</h1>
              <p className="text-sm opacity-90">Model: Weir Multiflo MF420EXHV | Asset ID: P-701</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">Lokasi: PIT-7 DEWATERING</p>
            <p className="text-sm">Selasa, 21 Oktober 2025 pukul 16.53.21</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6 space-y-4">
        <Card className="bg-white">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-lg font-semibold">Panel Simulasi Kondisi:</span>
              <Badge
                className={`px-6 py-2 text-base rounded-md cursor-pointer transition-all ${
                  simulationMode === 'normal'
                    ? 'bg-green-600 hover:bg-green-700 ring-2 ring-green-300'
                    : 'bg-green-500 hover:bg-green-600'
                } text-white`}
                onClick={() => setSimulationMode(simulationMode === 'normal' ? null : 'normal')}
              >
                Normal {simulationMode === 'normal' && '✓'}
              </Badge>
              <Badge
                className={`px-6 py-2 text-base rounded-md cursor-pointer transition-all ${
                  simulationMode === 'vibration-warning'
                    ? 'bg-yellow-600 hover:bg-yellow-700 ring-2 ring-yellow-300'
                    : 'bg-yellow-500 hover:bg-yellow-600'
                } text-white`}
                onClick={() => setSimulationMode(simulationMode === 'vibration-warning' ? null : 'vibration-warning')}
              >
                Peringatan Getaran {simulationMode === 'vibration-warning' && '✓'}
              </Badge>
              <Badge
                className={`px-6 py-2 text-base rounded-md cursor-pointer transition-all ${
                  simulationMode === 'critical-overheat'
                    ? 'bg-red-600 hover:bg-red-700 ring-2 ring-red-300'
                    : 'bg-red-500 hover:bg-red-600'
                } text-white`}
                onClick={() => setSimulationMode(simulationMode === 'critical-overheat' ? null : 'critical-overheat')}
              >
                Kritis (Overheat) {simulationMode === 'critical-overheat' && '✓'}
              </Badge>
              <Badge
                className={`px-6 py-2 text-base rounded-md cursor-pointer transition-all ${
                  simulationMode === 'critical-low-oil'
                    ? 'bg-red-700 hover:bg-red-800 ring-2 ring-red-400'
                    : 'bg-red-900 hover:bg-red-950'
                } text-white`}
                onClick={() => setSimulationMode(simulationMode === 'critical-low-oil' ? null : 'critical-low-oil')}
              >
                Kritis (Oli Rendah) {simulationMode === 'critical-low-oil' && '✓'}
              </Badge>
            </div>
            {connectionError ? (
              <Alert variant="destructive" className="max-w-2xl">
                <AlertDescription>{connectionError}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">WebSocket:</span>
                <Badge className={`${connectionBadge.className} text-white px-2 py-1 text-xs`}>
                  {connectionBadge.label}
                </Badge>
              </div>
              <Button
                onClick={handleManualReconnect}
                disabled={connectionState === 'connecting'}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Reconnect
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-4 border-green-500 bg-white">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 divide-x">
              <div className="text-center px-4">
                <p className="text-xs text-gray-500 uppercase mb-2">Status Unit</p>
                <p className="text-3xl font-bold text-green-500 flex items-center justify-center gap-2">
                  <Circle className="fill-green-500 w-4 h-4" /> NORMAL
                </p>
              </div>
              <div className="text-center px-4">
                <p className="text-xs text-gray-500 uppercase mb-2">Penyebab Status</p>
                <p className="text-lg font-semibold text-green-600">Semua Parameter Aman</p>
              </div>
              <div className="text-center px-4">
                <p className="text-xs text-gray-500 uppercase mb-2">Proteksi Shutdown Otomatis</p>
                <p className="text-3xl font-bold text-green-600">SIAGA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 grid grid-cols-3 gap-4">
            {[
              { label: 'Debit Aliran (L/s)', value: resolvedMetrics.flowRate, unit: 'L/s', color: '#3b82f6', maxValue: 100, index: 0 },
              { label: 'Total Head (M)', value: resolvedMetrics.totalHead, unit: 'm', color: '#f97316', maxValue: 200, index: 1 },
              { label: 'RPM Mesin', value: resolvedMetrics.rpm, unit: 'RPM', color: '#6366f1', maxValue: 3000, index: 2, precision: 0 },
            ].map((metric) => (
              <Card key={metric.label} className="bg-white">
                <CardContent className="pt-6 pb-6">
                  <p className="text-sm text-gray-500 uppercase mb-3 text-center">{metric.label}</p>
                  <div className="relative w-32 h-32 mx-auto">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="56" 
                        stroke={metric.color} 
                        strokeWidth="12" 
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56 * Math.min(1, (metric.value ?? 0) / metric.maxValue)} ${2 * Math.PI * 56}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {formatMetricValue(metric.value, '', metric.precision as number | undefined)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 text-center mt-1">{metric.unit}</p>
                </CardContent>
              </Card>
            ))}

            <Card className="bg-white col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase">Parameter Mesin Kritis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="font-medium">Level BBM</span>
                    <span className="font-bold">
                      {formatMetricValue(resolvedMetrics.fuelLevel, '%', 0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.max(0, Math.min(100, resolvedMetrics.fuelLevel ?? 0))}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="font-medium">Suhu Pendingin</span>
                  <span className="font-bold">
                    {formatMetricValue(resolvedMetrics.coolantTemperature, '°C')}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="font-medium">Tekanan Oli</span>
                  <span className="font-bold">
                    {formatMetricValue(resolvedMetrics.oilPressure, 'Bar')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white lg:col-span-2 lg:row-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sistem Proteksi Otomatis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Getaran Kritis (&gt;25g) - Status: Normal
                </AlertDescription>
              </Alert>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Mesin Overheat (&gt;100°C) - Status: Normal
                </AlertDescription>
              </Alert>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Tekanan Oli Rendah (&lt;2 Bar) - Status: Normal
                </AlertDescription>
              </Alert>
              <Button className="w-full bg-gray-400 hover:bg-gray-500 mt-auto h-12 text-sm">
                ⚙ SHUTDOWN POMPA (MANUAL)
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-xl font-bold">Pusat Diagnostik Getaran (CaviSense)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
              <div>
                <h3 className="text-sm font-bold mb-2">Sinyal Getaran Waktu Nyata (Time-Domain)</h3>
                <div className="bg-white border rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="time"
                        label={{ value: 'Waktu (ms)', position: 'insideBottom', offset: -5 }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        label={{ value: 'Amplitudo (g)', angle: -90, position: 'insideLeft' }}
                        tick={{ fontSize: 12 }}
                        domain={[-1, 1]}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="amplitude"
                        stroke="#60a5fa"
                        strokeWidth={1.5}
                        dot={false}
                        name="Amplitudo Getaran"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-500 mt-2 text-center">Amplitudo Getaran</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-2">Analisis Spektrum Frekuensi (FFT)</h3>
                <div className="bg-white border rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={fftData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="freq"
                        label={{ value: 'Frekuensi (Hz)', position: 'insideBottom', offset: -5 }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        label={{ value: 'Energi (normatif)', angle: -90, position: 'insideLeft' }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Bar dataKey="energy" fill="#3b82f6" name="Energi Getaran" />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-500 mt-2 text-center">Energi Getaran</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4 mt-4">
              <h3 className="text-sm font-bold mb-2">
                Diagnosis Otomatis (CaviSense AI)
                {simulationMode && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    MODE SIMULASI
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-700">
                {simulationMode ? (
                  <>
                    Mode simulasi aktif: <strong>
                      {simulationMode === 'normal' && 'Normal'}
                      {simulationMode === 'vibration-warning' && 'Peringatan Getaran'}
                      {simulationMode === 'critical-overheat' && 'Kritis (Overheat)'}
                      {simulationMode === 'critical-low-oil' && 'Kritis (Oli Rendah)'}
                    </strong>.
                    Data sensor menggunakan nilai simulasi untuk demonstrasi.
                  </>
                ) : (
                  'Sinyal getaran stabil. Energi terkonsentrasi pada frekuensi operasional mesin.'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
