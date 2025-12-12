
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ProfileData } from '../types';

interface RadarProfileChartProps {
    data: ProfileData[];
    color?: string;
}

const RadarProfileChart: React.FC<RadarProfileChartProps> = ({ data, color = "#8884d8" }) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <defs>
                    <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
                        <stop offset="100%" stopColor={color} stopOpacity={0.2}/>
                    </radialGradient>
                </defs>
                <PolarGrid stroke="#6b7280" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#d1d5db', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'none' }} axisLine={false} />
                <Radar 
                    name="Score" 
                    dataKey="score" 
                    stroke={color}
                    fill="url(#radarGradient)"
                    fillOpacity={0.6} 
                />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        borderColor: '#4b5563',
                        color: '#f3f4f6'
                    }} 
                />
                <Legend wrapperStyle={{ color: '#e5e7eb' }} />
            </RadarChart>
        </ResponsiveContainer>
    );
};

export default RadarProfileChart;
