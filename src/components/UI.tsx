import React from 'react'
import type { Espece } from '../types'
import { ESPECE_COLORS } from '../types'

// ── Bouton principal ──────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
}

export function Btn({
  variant = 'primary', size = 'md', fullWidth, loading,
  children, className = '', disabled, ...props
}: BtnProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none'
  const sizes = { sm: 'px-3 py-2 text-sm', md: 'px-4 py-3 text-base', lg: 'px-6 py-4 text-lg' }
  const variants = {
    primary:   'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
    secondary: 'bg-gray-800 text-gray-100 hover:bg-gray-700 border border-gray-700',
    danger:    'bg-red-600 text-white hover:bg-red-700',
    ghost:     'text-amber-500 hover:bg-amber-500/10',
  }
  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? <Spinner size={16} /> : children}
    </button>
  )
}

// ── Bouton toggle (liste AppSheet-style) ──────────────────────
interface ToggleBtnProps {
  label: string
  selected: boolean
  onClick: () => void
  color?: string
}
export function ToggleBtn({ label, selected, onClick, color }: ToggleBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-3.5 px-4 rounded-xl text-base font-medium transition-all active:scale-98 border ${
        selected
          ? 'border-amber-500 text-white'
          : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500'
      }`}
      style={selected && color ? { backgroundColor: color, borderColor: color } : undefined}
    >
      {label}
    </button>
  )
}

// ── Input texte ───────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  required?: boolean
  error?: string
}
export function Input({ label, required, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-400">
          {label}{required && <span className="text-amber-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`w-full bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white placeholder-gray-500 text-base focus:outline-none focus:border-amber-500 transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  required?: boolean
  options: { value: string; label: string }[]
}
export function Select({ label, required, options, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-400">
          {label}{required && <span className="text-amber-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={`w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-amber-500 transition-colors appearance-none ${className}`}
        {...props}
      >
        <option value="">— Choisir —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── Stepper nombre ────────────────────────────────────────────
interface StepperProps {
  label?: string
  value: number
  min?: number
  max?: number
  onChange: (v: number) => void
  required?: boolean
}
export function Stepper({ label, value, min = 1, max = 99, onChange, required }: StepperProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-400">
          {label}{required && <span className="text-amber-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <span className="flex-1 text-white text-base px-4 py-3">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="px-5 py-3 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-xl font-light"
        >−</button>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="px-5 py-3 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-xl font-light border-l border-gray-700"
        >+</button>
      </div>
    </div>
  )
}

// ── Badge espèce ──────────────────────────────────────────────
export function EspeceBadge({ espece }: { espece: Espece }) {
  const color = ESPECE_COLORS[espece]
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {espece}
    </span>
  )
}

// ── Badge retire ──────────────────────────────────────────────
export function RetireBadge({ retire }: { retire: boolean }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      retire ? 'bg-green-900/60 text-green-300' : 'bg-orange-900/60 text-orange-300'
    }`}>
      {retire ? '✓ Retiré' : '● Actif'}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeOpacity="0.3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      className={`bg-gray-800/80 border border-gray-700/50 rounded-2xl p-4 ${onClick ? 'cursor-pointer active:scale-98 hover:border-gray-600' : ''} transition-all ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'amber' }: {
  label: string; value: number | string; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    amber: 'text-amber-400', green: 'text-green-400',
    blue: 'text-blue-400', red: 'text-red-400', purple: 'text-purple-400'
  }
  return (
    <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-4 space-y-1">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${colors[color] ?? 'text-amber-400'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
export function Empty({ message, icon = '🔍' }: { message: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
      <span className="text-5xl">{icon}</span>
      <p className="text-sm text-center">{message}</p>
    </div>
  )
}
