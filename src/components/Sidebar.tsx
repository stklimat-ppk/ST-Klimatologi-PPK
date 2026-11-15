import { useState } from 'react';
import { Home, BarChart2, MessageSquare, Download, Settings, Menu, ChevronLeft, ChevronRight, HelpCircle, Shield } from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileMenuOpen?: boolean;
  onItemClick?: () => void;
  isAdmin?: boolean;
}

export default function Sidebar({ activeTab, setActiveTab, isMobileMenuOpen = false, onItemClick, isAdmin = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'beranda' as ActiveTab, name: 'Beranda', icon: Home, desc: 'Pemantauan lapangan' },
    { id: 'grafik' as ActiveTab, name: 'Grafik Analisis', icon: BarChart2, desc: 'Tren klimatologi' },
    { id: 'asisten' as ActiveTab, name: 'Asisten Gemini', icon: MessageSquare, desc: 'Chat agroklimatologi' },
    { id: 'unduh' as ActiveTab, name: 'Unduh Data', icon: Download, desc: 'Ekspor berkas CSV/Excel' },
    { id: 'pengaturan' as ActiveTab, name: 'Pengaturan', icon: Settings, desc: isAdmin ? 'Backend GAS & info stasiun' : 'Panduan stasiun karet' },
  ];

  if (isAdmin) {
    menuItems.push({
      id: 'keamanan' as ActiveTab,
      name: 'Adms Keamanan',
      icon: Shield,
      desc: 'Verifikasi & Log Tamu'
    });
  }

  return (
    <aside
      className={`fixed inset-y-16 left-0 z-30 flex h-[calc(100vh-4rem)] flex-col border-r border-slate-800 bg-slate-900 text-slate-100 transition-transform duration-300 md:relative md:inset-auto md:z-auto md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } ${isCollapsed ? 'md:w-16' : 'md:w-64'} w-64`}
    >
      {/* Sidebar Header Collapse Control */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
        <span className={`font-display text-xs font-bold uppercase tracking-wider text-emerald-400 ${isCollapsed ? 'md:hidden' : ''}`}>
          Navigasi Menu
        </span>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Buka Menu' : 'Sembunyikan Menu'}
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation Buttons */}
      <nav className="flex-1 space-y-1.5 px-2 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (onItemClick) onItemClick();
              }}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition duration-150 cursor-pointer active:scale-[0.98] ${
                isActive
                  ? 'bg-emerald-600 font-semibold text-white shadow-md shadow-emerald-900/10'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                }`}
              />
              <div className={`flex flex-col items-start leading-none ${isCollapsed ? 'md:hidden' : 'block'}`}>
                <span className="text-sm">{item.name}</span>
                <span className={`mt-0.5 text-[10px] font-normal ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {item.desc}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Info */}
      <div className="border-t border-slate-800 p-4">
        {isCollapsed ? (
          <div className="flex justify-center text-slate-500">
            <HelpCircle className="h-5 w-5 hover:text-slate-300 cursor-pointer" />
          </div>
        ) : (
          <div className="rounded-xl bg-slate-800/60 p-3 text-[10px] text-slate-400 border border-slate-700/30">
            <p className="font-semibold text-slate-300 mb-1">Pusat Penelitian Karet</p>
            <p className="leading-relaxed">Metode BMKG & Standar Agroklimatologi Tanaman Karet Indonesia.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
