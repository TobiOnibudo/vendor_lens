"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Search, X } from "lucide-react";

interface ProfileOption {
  id: string;
  full_name: string;
  email: string;
}

interface VendorOwnerSelectProps {
  vendorId: string;
  value: string;
  selectedName?: string;
  onChange: (ownerId: string, displayName?: string) => void;
  disabled?: boolean;
}

function profileLabel(p: ProfileOption) {
  if (p.full_name && p.email) return `${p.full_name} (${p.email})`;
  return p.full_name || p.email;
}

export function VendorOwnerSelect({
  vendorId,
  value,
  selectedName,
  onChange,
  disabled,
}: VendorOwnerSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [committedLabel, setCommittedLabel] = useState(selectedName ?? "");
  const [suggestions, setSuggestions] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  useEffect(() => {
    if (value && selectedName) {
      setCommittedLabel(selectedName);
      setQuery(selectedName);
    } else if (!value) {
      setCommittedLabel("");
      setQuery("");
    }
  }, [value, selectedName]);

  const fetchSuggestions = useCallback(
    async (search: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ vendorId });
        if (search.trim()) params.set("q", search.trim());
        const res = await fetch(`/api/profiles?${params}`);
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = await res.json();
        setSuggestions(data.profiles || []);
        setHighlightIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [vendorId]
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchSuggestions(query), 250);
    return () => clearTimeout(timer);
  }, [query, open, fetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        if (value && committedLabel) setQuery(committedLabel);
        else if (!value) setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, committedLabel]);

  function selectProfile(profile: ProfileOption) {
    const label = profileLabel(profile);
    setCommittedLabel(label);
    setQuery(label);
    onChange(profile.id, label);
    setOpen(false);
  }

  function clearOwner() {
    setCommittedLabel("");
    setQuery("");
    onChange("", undefined);
    setOpen(false);
    setSuggestions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      if (value && committedLabel) setQuery(committedLabel);
      else setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) =>
        i < suggestions.length - 1 ? i + 1 : i
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : -1));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      selectProfile(suggestions[highlightIndex]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        Owner
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) {
              onChange("", undefined);
              setCommittedLabel("");
            }
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search by name or email…"
          disabled={disabled}
          className="pl-9 pr-16"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          )}
          {value && !disabled && (
            <button
              type="button"
              onClick={clearOwner}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Clear owner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {open && !disabled && (
        <ul
          className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {!loading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">
              {query.trim()
                ? "No users found"
                : "Type a name or email to search"}
            </li>
          )}
          {suggestions.map((profile, index) => (
            <li
              key={profile.id}
              role="option"
              aria-selected={highlightIndex === index}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                highlightIndex === index
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-700 hover:bg-slate-50",
                value === profile.id && "font-medium"
              )}
              onMouseEnter={() => setHighlightIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectProfile(profile);
              }}
            >
              {profileLabel(profile)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
