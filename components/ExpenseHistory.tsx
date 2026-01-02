
import React from 'react';
import { Expense } from '../types';
import { ShoppingCart, Coffee, CreditCard, Home, Briefcase, Trash2 } from 'lucide-react';

interface ExpenseHistoryProps {
  expenses: Expense[];
  onDelete?: (id: string) => void;
}

const getCategoryIcon = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes('alimentação') || c.includes('food') || c.includes('comer') || c.includes('restaurante')) return <ShoppingCart className="w-4 h-4" />;
  if (c.includes('lazer') || c.includes('café') || c.includes('cerveja') || c.includes('diversão')) return <Coffee className="w-4 h-4" />;
  if (c.includes('casa') || c.includes('aluguel') || c.includes('moradia')) return <Home className="w-4 h-4" />;
  if (c.includes('trabalho') || c.includes('software') || c.includes('investimento')) return <Briefcase className="w-4 h-4" />;
  return <CreditCard className="w-4 h-4" />;
};

export const ExpenseHistory: React.FC<ExpenseHistoryProps> = ({ expenses, onDelete }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 p-4">
      <h2 className="text-xl font-bold mb-4 text-emerald-400 flex items-center gap-2">
        <CreditCard className="w-6 h-6" /> Registro de Bobagens
      </h2>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {expenses.length === 0 ? (
          <p className="text-slate-500 italic text-sm">Nenhum gasto registrado ainda. Você está sendo mão de vaca?</p>
        ) : (
          expenses.slice().reverse().map((expense) => (
            <div key={expense.id} className="group relative bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-emerald-500 transition-colors">
              {onDelete && (
                <button 
                  onClick={() => onDelete(expense.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-500 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="flex justify-between items-start mb-1 pr-6">
                <span className="text-xs font-mono text-emerald-500 uppercase">{expense.category}</span>
                <span className="text-[10px] text-slate-500">{new Date(expense.timestamp).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                {getCategoryIcon(expense.category)}
                <span className="font-semibold text-slate-200 truncate text-sm">{expense.description}</span>
              </div>
              <div className="text-lg font-bold text-white">
                R$ {expense.amount.toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
