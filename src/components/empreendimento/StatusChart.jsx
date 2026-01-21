import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function StatusChart({ stats, registros, theme = 'light' }) {
  const isDark = theme === 'dark';

  // Use stats if provided, otherwise calculate from registros
  // Add safety check for both stats and registros
  const statusCounts = stats ? {
    "Pendente": stats.pendente || 0,
    "Em Andamento": stats.andamento || 0,
    "Concluído": stats.concluido || 0
  } : {
    "Pendente": Array.isArray(registros) ? registros.filter(r => r.status === "Pendente").length : 0,
    "Em Andamento": Array.isArray(registros) ? registros.filter(r => r.status === "Em Andamento").length : 0,
    "Concluído": Array.isArray(registros) ? registros.filter(r => r.status === "Concluído").length : 0
  };

  // Calculate total
  const total = statusCounts["Pendente"] + statusCounts["Em Andamento"] + statusCounts["Concluído"];

  const pieData = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: status,
      value: count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0
    }));

  const COLORS = {
    "Pendente": "#f97316",
    "Em Andamento": "#3b82f6", 
    "Concluído": "#10b981"
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} registro{data.value !== 1 ? 's' : ''} ({data.payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Não mostrar label para fatias muito pequenas

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className={isDark ? 'bg-gray-800' : ''}>
      <CardHeader>
        <CardTitle className={isDark ? 'text-white' : ''}>Distribuição de Status dos Registros</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-center py-12">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <PieChart className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Nenhum registro para exibir</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Gráfico de Pizza */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomLabel}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry) => (
                      <span style={{ color: entry.color, fontWeight: 'medium' }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Resumo detalhado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className={`text-center p-4 rounded-lg border ${isDark ? 'bg-orange-900/50 border-orange-700' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className={`font-medium ${isDark ? 'text-orange-200' : 'text-orange-800'}`}>Pendente</span>
                </div>
                <p className={`text-2xl font-bold ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>{statusCounts.Pendente}</p>
                <p className={`text-sm ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                  {total > 0 ? ((statusCounts.Pendente / total) * 100).toFixed(1) : 0}% do total
                </p>
              </div>
              
              <div className={`text-center p-4 rounded-lg border ${isDark ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className={`font-medium ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>Em Andamento</span>
                </div>
                <p className={`text-2xl font-bold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>{statusCounts["Em Andamento"]}</p>
                <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {total > 0 ? ((statusCounts["Em Andamento"] / total) * 100).toFixed(1) : 0}% do total
                </p>
              </div>
              
              <div className={`text-center p-4 rounded-lg border ${isDark ? 'bg-green-900/50 border-green-700' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className={`font-medium ${isDark ? 'text-green-200' : 'text-green-800'}`}>Concluído</span>
                </div>
                <p className={`text-2xl font-bold ${isDark ? 'text-green-300' : 'text-green-600'}`}>{statusCounts["Concluído"]}</p>
                <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  {total > 0 ? ((statusCounts["Concluído"] / total) * 100).toFixed(1) : 0}% do total
                </p>
              </div>
            </div>

            {/* Total geral */}
            <div className={`text-center p-4 rounded-lg border ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total de Registros</p>
              <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{total}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}