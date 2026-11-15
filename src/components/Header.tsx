import React, { useState, useRef, useEffect } from 'react';
import { Leaf, User, LogIn, LogOut, CheckCircle, Database, AlertCircle, Plus, Sparkles, Menu, X, Sun, Moon, Clock } from 'lucide-react';

interface HeaderProps {
  isAdmin: boolean;
  userEmail: string | null;
  onLoginToggle: () => void;
  onOpenInputModal: () => void;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  isDarkMode: boolean;
  onDarkModeToggle: () => void;
  isSyncing?: boolean;
  onSyncNow?: () => void;
  dataSource?: 'sheets' | 'cache' | null;
}

export default function Header({ 
  isAdmin, 
  userEmail, 
  onLoginToggle, 
  onOpenInputModal,
  onMobileMenuToggle,
  isMobileMenuOpen,
  isDarkMode,
  onDarkModeToggle,
  isSyncing = false,
  onSyncNow,
  dataSource
}: HeaderProps) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Helper
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-emerald-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 shadow-xs md:px-6">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 min-w-0">
        {/* Mobile Hamburger toggle */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition mr-1 cursor-pointer active:scale-95 md:hidden"
          title={isMobileMenuOpen ? 'Tutup Menu' : 'Buka Menu'}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5 text-emerald-600 animate-in spin-in-12 duration-200" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Official Puslit Karet Logo (Vector SVG Representation) */}
        <div className="relative shrink-0 select-none">
          <svg 
            viewBox="0 0 100 100" 
            className="h-9 w-9 sm:h-11 sm:w-11 drop-shadow-xs transition transform hover:scale-105"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Blue Circle Ring */}
            <circle cx="50" cy="50" r="46" stroke="#0018f9" strokeWidth="5.5" fill="white" />
            
            {/* Center Blue Rectangle Column */}
            <rect x="36" y="12" width="28" height="76" fill="#0018f9" />
            
            {/* Stylized White Tapping Panels */}
            <g stroke="white" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
              <line x1="40" y1="27" x2="56" y2="41.5" />
              <line x1="40" y1="33" x2="56" y2="47.5" />
              <line x1="40" y1="39" x2="56" y2="53.5" />
              <line x1="40" y1="45" x2="56" y2="59.5" />
              <line x1="40" y1="51" x2="56" y2="65.5" />
              
              {/* Vertical Latex Canal */}
              <line x1="56" y1="65" x2="56" y2="72.5" />
            </g>
            
            {/* Latex Collection Cup */}
            <path 
              d="M 51 72.5 A 5 5 0 0 0 61 72.5 Z" 
              fill="white" 
            />
          </svg>
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="font-display text-[9px] min-[340px]:text-[10.5px] min-[380px]:text-[12.5px] sm:text-sm md:text-base lg:text-lg font-extrabold tracking-tight text-slate-800 dark:text-slate-100 whitespace-nowrap leading-none mb-1">
            STASIUN KLIMATOLOGI
          </h1>
          <p className="font-sans text-[7px] min-[340px]:text-[8px] min-[380px]:text-[9px] sm:text-[10px] md:text-xs font-semibold tracking-wide text-emerald-600 dark:text-emerald-400 uppercase whitespace-nowrap leading-none">
            PUSLIT KARET • SEMBAWA
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Live Digital Clock Badge */}
        <div className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs transition duration-200">
          <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span>{formatDate(currentTime)}</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatTime(currentTime)} <span className="text-[10px] font-sans font-medium text-slate-400">WIB</span></span>
        </div>

        {/* User Identity Badging */}
        {userEmail ? (
          isAdmin ? (
            <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-600/10 dark:ring-emerald-400/20 md:flex">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Admin ({userEmail})</span>
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 ring-1 ring-blue-600/10 dark:ring-blue-400/20 md:flex">
              <CheckCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Tamu Terdaftar ({userEmail})</span>
            </div>
          )
        ) : (
          <div className="hidden items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700 md:flex">
            <AlertCircle className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <span>Mode Tamu Umum</span>
          </div>
        )}

        {/* Input Data Button (Only for Admin) */}
        {isAdmin && (
          <button
            onClick={onOpenInputModal}
            className="group flex items-center gap-1 sm:gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 sm:text-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4 shrink-0 transition group-hover:scale-110" />
            <span className="hidden xs:inline">Input Data</span>
            <span className="hidden sm:inline">Input</span>
          </button>
        )}

        {/* Dark Mode Toggle Button */}
        <button
          type="button"
          onClick={onDarkModeToggle}
          aria-label={isDarkMode ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-hidden transition active:scale-95 cursor-pointer"
          title={isDarkMode ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
        >
          {isDarkMode ? (
            <Sun className="h-4.5 w-4.5 text-amber-400 animate-in spin-in-12 duration-200" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-slate-600" />
          )}
        </button>

        {/* Profile Dropdown Controls */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-hidden cursor-pointer"
          >
            <User className="h-4.5 w-4.5" />
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-lg ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="mb-2.5 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pengguna Aktif</p>
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {userEmail ? (isAdmin ? "Stasiun Klimatologi Admin" : "Pengunjung Terverifikasi") : "Mode Tamu Umum"}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {userEmail ? userEmail : "tamu@puslitkaret.id"}
                </p>
              </div>

              <button
                onClick={() => {
                  onLoginToggle();
                  setShowProfileDropdown(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition cursor-pointer ${
                  userEmail
                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50'
                }`}
              >
                <span className="flex items-center gap-2">
                  {userEmail ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                  {userEmail ? (isAdmin ? 'Keluar Admin' : 'Keluar Tamu') : 'Masuk / Registrasi'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
