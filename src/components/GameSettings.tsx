// src/components/GameSettings.tsx
import { Settings as SettingsIcon } from 'lucide-react';
export const GameSettings = () => (
  <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl mt-10">
    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><SettingsIcon size={20}/> إعدادات جولة اللعب</h3>
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span>حجم الشبكة السداسية</span>
        <select className="bg-slate-800 p-2 rounded-lg border border-slate-700">
          <option>5x5 (Standard)</option>
          <option>7x7 (Expert)</option>
        </select>
      </div>
      <div className="flex justify-between items-center">
        <span>وقت الإجابة (ثانية)</span>
        <input type="number" defaultValue={30} className="w-20 bg-slate-800 p-2 rounded-lg border border-slate-700 text-center"/>
      </div>
    </div>
  </div>
);