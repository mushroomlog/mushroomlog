import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartDataPoint } from '../types';

interface EnvironmentChartProps {
  data: ChartDataPoint[];
}

const EnvironmentChart: React.FC<EnvironmentChartProps> = ({ data }) => {
  if (data.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center bg-white rounded-xl border border-earth-200 text-earth-500">
        <p>Log more data points to see trends.</p>
      </div>
    );
  }

  // Sort data by date just in case
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Format date for X Axis
  const formattedData = sortedData.map(d => ({
    ...d,
    shortDate: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }));

  return (
    <div className="h-72 w-full bg-white p-4 rounded-xl border border-earth-200 shadow-sm">
      <h3 className="text-sm font-semibold text-earth-800 mb-4">Environmental Trends</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="shortDate" 
            tick={{fontSize: 12, fill: '#6b7280'}} 
            stroke="#d1d5db"
          />
          <YAxis 
            yAxisId="left" 
            domain={['auto', 'auto']} 
            tick={{fontSize: 12, fill: '#ef4444'}} 
            stroke="#ef4444"
            label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#ef4444' }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            domain={[0, 100]} 
            tick={{fontSize: 12, fill: '#3b82f6'}} 
            stroke="#3b82f6"
            label={{ value: 'Humidity (%)', angle: 90, position: 'insideRight', fontSize: 10, fill: '#3b82f6' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#ef4444" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
          <Line yAxisId="right" type="monotone" dataKey="humidity" name="RH (%)" stroke="#3b82f6" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EnvironmentChart;