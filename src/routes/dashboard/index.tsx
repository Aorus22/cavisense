import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Route = createFileRoute('/dashboard/')({
  component: CaviSenseDashboard
});

// Sample data for charts
const timeSeriesData = Array.from({ length: 50 }, (_, i) => ({
  time: i * 10,
  amplitude: (Math.random() - 0.5) * 1.6
}));

const fftData = [
  { freq: '0-100', energy: 0.85 },
  { freq: '100-200', energy: 0.12 },
  { freq: '200-400', energy: 0.08 },
  { freq: '400-800', energy: 0.03 },
  { freq: '>800', energy: 0.02 }
];

function CaviSenseDashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
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
        {/* Condition Simulation Panel */}
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-lg font-semibold">Panel Simulasi Kondisi:</span>
              <Badge className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 text-base rounded-md">
                Normal
              </Badge>
              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 text-base rounded-md">
                Peringatan Getaran
              </Badge>
              <Badge className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 text-base rounded-md">
                Kritis (Overheat)
              </Badge>
              <Badge className="bg-red-900 hover:bg-red-950 text-white px-6 py-2 text-base rounded-md">
                Kritis (Oli Rendah)
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Status Overview - Green Border */}
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

        {/* Grid Layout: 3 cols + 1 tall col */}
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left side: 3x2 grid */}
          <div className="lg:col-span-3 grid grid-cols-3 gap-4">
            {/* Row 1: Debit, Total Head, RPM */}
            <Card className="bg-white">
              <CardContent className="pt-6">
                <p className="text-xs text-gray-500 uppercase mb-3 text-center">Debit Aliran (L/S)</p>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                    <circle 
                      cx="64" 
                      cy="64" 
                      r="56" 
                      stroke="#3b82f6" 
                      strokeWidth="12" 
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56 * 0.6} ${2 * Math.PI * 56}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl font-bold">411</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="pt-6">
                <p className="text-xs text-gray-500 uppercase mb-3 text-center">Total Head (M)</p>
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                    <circle 
                      cx="64" 
                      cy="64" 
                      r="56" 
                      stroke="#f97316" 
                      strokeWidth="12" 
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56 * 0.7} ${2 * Math.PI * 56}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl font-bold">153</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardContent className="pt-6 pb-6">
                <p className="text-xs text-gray-500 uppercase mb-2 text-center">RPM Mesin</p>
                <p className="text-6xl font-bold text-center leading-tight">1758</p>
              </CardContent>
            </Card>

            {/* Row 2: Critical Parameters (spans 3 columns) */}
            <Card className="bg-white col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase">Parameter Mesin Kritis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="font-medium">Level BBM</span>
                    <span className="font-bold">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="font-medium">Suhu Pendingin</span>
                  <span className="font-bold">88 °C</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="font-medium">Tekanan Oli</span>
                  <span className="font-bold">4.5 Bar</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right side: Protection System (tall, spans 2 rows) */}
          <Card className="bg-white lg:col-span-2 lg:row-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sistem Proteksi Otomatis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">Getaran Kritis (&gt;25g)</span>
                <CheckCircle2 className="text-green-500 w-7 h-7" />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">Mesin Overheat (&gt;100°C)</span>
                <CheckCircle2 className="text-green-500 w-7 h-7" />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">Tekanan Oli Rendah (&lt;2 Bar)</span>
                <CheckCircle2 className="text-green-500 w-7 h-7" />
              </div>
              <Button className="w-full bg-gray-400 hover:bg-gray-500 mt-auto h-12 text-sm">
                ⚙ SHUTDOWN POMPA (MANUAL)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Diagnostics Center */}
        <Card className="bg-white">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-xl font-bold">Pusat Diagnostik Getaran (CaviSense)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
              {/* Time Domain Signal */}
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

              {/* FFT Analysis */}
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

            {/* AI Diagnosis */}
            <div className="bg-gray-50 border rounded-lg p-4 mt-4">
              <h3 className="text-sm font-bold mb-2">Diagnosis Otomatis (CaviSense AI)</h3>
              <p className="text-sm text-gray-700">
                Sinyal getaran stabil. Energi terkonsentrasi pada frekuensi operasional mesin.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}