'use client';

import React, { useRef } from 'react';
import { Calendar, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import {
  parseFlexibleDateTime,
  formatForHumanInput,
  formatPreviewDateTime,
  getPresetDateTime,
} from '@/lib/date';

interface FlexibleDateTimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  showPresets?: boolean;
  presetType?: 'start' | 'end';
}

export function FlexibleDateTimeInput({
  label,
  value,
  onChange,
  placeholder = 'e.g. 21/11/2026, 07:00 PM',
  required = false,
  showPresets = false,
  presetType = 'start',
}: FlexibleDateTimeInputProps) {
  const hiddenPickerRef = useRef<HTMLInputElement>(null);
  const parsedDate = parseFlexibleDateTime(value);
  const hasValue = value.trim().length > 0;

  const handleOpenCalendar = () => {
    if (hiddenPickerRef.current) {
      if (typeof hiddenPickerRef.current.showPicker === 'function') {
        try {
          hiddenPickerRef.current.showPicker();
          return;
        } catch {
          // fallback
        }
      }
      hiddenPickerRef.current.focus();
    }
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        onChange(formatForHumanInput(d));
      }
    }
    e.target.value = '';
  };

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-white/70 tracking-wide uppercase">
          {label} {required && <span className="text-[#FF6A1A]">*</span>}
        </label>
        <span className="text-[10px] text-white/40">Free typing supported</span>
      </div>

      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl bg-white/[0.04] pl-4 pr-11 py-2.5 text-xs text-white placeholder-white/30 backdrop-blur-md border border-white/[0.08] focus:border-[#FF6A1A]/50 focus:ring-1 focus:ring-[#FF6A1A]/50 outline-none transition-all"
        />

        {/* Visual Calendar Picker button on right edge */}
        <button
          type="button"
          onClick={handleOpenCalendar}
          title="Open Calendar Picker"
          className="absolute right-2.5 p-1.5 rounded-lg text-white/50 hover:text-[#FF9A45] hover:bg-white/[0.08] transition-all"
        >
          <Calendar className="w-4 h-4" />
        </button>

        {/* Hidden native input for calendar dropdown */}
        <input
          ref={hiddenPickerRef}
          type="datetime-local"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          onChange={handleNativePickerChange}
        />
      </div>

      {/* Live Recognized Date Preview or Helper */}
      <div className="min-h-[18px]">
        {hasValue && parsedDate ? (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">✓ {formatPreviewDateTime(parsedDate)}</span>
          </div>
        ) : hasValue ? (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 font-medium">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Format: DD/MM/YYYY, HH:MM AM/PM</span>
          </div>
        ) : (
          <div className="text-[10px] text-white/30 truncate">
            Type e.g. 21/11/2026, 07:00 PM or click calendar
          </div>
        )}
      </div>

      {/* Quick Presets for Start / End time */}
      {showPresets && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-white/40 flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5 text-[#FF9A45]" />
            <span>Quick:</span>
          </span>
          <button
            type="button"
            onClick={() => onChange(getPresetDateTime('tomorrow', presetType === 'end' ? 22 : 19))}
            className="px-2 py-0.5 text-[10px] rounded-md bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 hover:text-white transition-all"
          >
            {presetType === 'end' ? 'Tmrw 10 PM' : 'Tmrw 7 PM'}
          </button>
          <button
            type="button"
            onClick={() => onChange(getPresetDateTime('saturday', presetType === 'end' ? 22 : 19))}
            className="px-2 py-0.5 text-[10px] rounded-md bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 hover:text-white transition-all"
          >
            {presetType === 'end' ? 'Sat 10 PM' : 'Sat 7 PM'}
          </button>
          <button
            type="button"
            onClick={() => onChange(getPresetDateTime('nextWeek', presetType === 'end' ? 22 : 19))}
            className="px-2 py-0.5 text-[10px] rounded-md bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 hover:text-white transition-all"
          >
            {presetType === 'end' ? '+7d 10 PM' : '+7d 7 PM'}
          </button>
        </div>
      )}
    </div>
  );
}
