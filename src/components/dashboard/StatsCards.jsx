
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";

const colorVariants = {
  blue: {
    light: "bg-blue-500 text-blue-600",
    dark: "bg-blue-600 text-blue-400"
  },
  green: {
    light: "bg-green-500 text-green-600",
    dark: "bg-green-600 text-green-400"
  },
  purple: {
    light: "bg-purple-500 text-purple-600", 
    dark: "bg-purple-600 text-purple-400"
  },
  orange: {
    light: "bg-orange-500 text-orange-600",
    dark: "bg-orange-600 text-orange-400"
  }
};

export default function StatsCards({ title, value, icon: Icon, color, trend, theme = 'light' }) {
  const isDark = theme === 'dark';
  const colorClass = colorVariants[color][isDark ? 'dark' : 'light'];

  return (
    <Card className={`relative overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
      <div className={`absolute top-0 right-0 w-24 h-24 opacity-10 ${colorClass.split(' ')[0]} rounded-full transform translate-x-8 -translate-y-8`} />
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          </div>
          <div className={`p-3 rounded-xl bg-opacity-20 ${colorClass.split(' ')[0]}`}>
            <Icon className={`w-6 h-6 ${colorClass.split(' ')[1]}`} />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center mt-4 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Info className="w-4 h-4 mr-1" />
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
