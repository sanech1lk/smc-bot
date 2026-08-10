"use client";

import { useState } from "react";
import { Coins } from "lucide-react";
import { CURRENCIES } from "@/lib/currency";

export function CurrencyPicker({
  projectId,
  value,
  onChanged
}: {
  projectId: string;
  value: string;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleChange(currency: string) {
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency })
    });
    setSaving(false);
    if (res.ok) onChanged();
  }

  return (
    <div className="card space-y-2">
      <p className="flex items-center gap-2 font-semibold">
        <Coins size={18} className="text-text-secondary" />
        Валюта сметы
      </p>
      <select
        className="input"
        value={value}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value)}
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} — {c.label} ({c.code})
          </option>
        ))}
      </select>
      <p className="text-xs text-text-muted">
        Применяется ко всем сметам объекта и к экспорту в PDF.
      </p>
    </div>
  );
}
