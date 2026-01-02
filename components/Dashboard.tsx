
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Expense } from '../types';

interface DashboardProps {
  expenses: Expense[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Dashboard: React.FC<DashboardProps> = ({ expenses }) => {
  const categoryData = React.useMemo(() => {
    const data: Record<string, number> = {};
    expenses.forEach(e => {
      data[e.category] = (data[e.category] || 0) + e.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6 overflow-y-auto h-full space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-slate-400 text-sm uppercase font-bold mb-1">Total de Prejuízo</h3>
          <div className="text-4xl font-black text-emerald-500">R$ {totalSpent.toFixed(2)}</div>
          <p className="text-xs text-slate-500 mt-2">Poderia estar rendendo 1% ao mês, mas você prefere gastar...</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-slate-400 text-sm uppercase font-bold mb-1">Qtd. de Deslizes</h3>
          <div className="text-4xl font-black text-blue-500">{expenses.length}</div>
          <p className="text-xs text-slate-500 mt-2">Vezes que sua dignidade financeira foi testada.</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-slate-400 text-sm uppercase font-bold mb-1">Maior Gasto Único</h3>
          <div className="text-4xl font-black text-rose-500">R$ {Math.max(0, ...expenses.map(e => e.amount)).toFixed(2)}</div>
          <p className="text-xs text-slate-500 mt-2">Aquele momento de pânico absoluto no extrato.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-[400px] flex flex-col">
          <h3 className="text-white font-bold mb-4">Onde sua grana some?</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-[400px] flex flex-col">
          <h3 className="text-white font-bold mb-4">Evolução do Buraco Financeiro</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expenses.slice(-10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleDateString()} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
