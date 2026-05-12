import { useState } from "react";
import { parseWithUnit, formatSi } from "./units";

interface Row {
  id: number;
  r: string;
  c: string;
}

let nextId = 1;

function fc(r: number, c: number): number {
  return 1 / (2 * Math.PI * r * c);
}

function computeRow(r: string, c: string): number | null {
  const rv = parseWithUnit(r);
  const cv = parseWithUnit(c);
  if (isNaN(rv) || isNaN(cv) || rv <= 0 || cv <= 0) return null;
  return fc(rv, cv);
}

export default function FilterCalculator() {
  const [rows, setRows] = useState<Row[]>([{ id: 0, r: "1k", c: "1u" }]);

  function updateRow(id: number, field: "r" | "c", value: string) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { id: nextId++, r: "", c: "" }]);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">RC 滤波器截止频率计算</h2>

      {rows.map((row, i) => {
        const result = computeRow(row.r, row.c);
        return (
          <div key={row.id} className="p-3 border rounded space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 shrink-0">第{i + 1}级</span>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1"
                  value={row.r}
                  onChange={(e) => updateRow(row.id, "r", e.target.value)}
                  placeholder="R (Ω)"
                />
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1"
                  value={row.c}
                  onChange={(e) => updateRow(row.id, "c", e.target.value)}
                  placeholder="C (F)"
                />
              </div>
              {rows.length > 1 && (
                <button
                  className="shrink-0 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  onClick={() => removeRow(row.id)}
                >
                  删除
                </button>
              )}
            </div>
            {result !== null && (
              <p className="text-sm font-mono">
                f<sub>c</sub> = {formatSi(result, "Hz", 3)}
              </p>
            )}
          </div>
        );
      })}

      <button
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-500 hover:text-blue-600"
        onClick={addRow}
      >
        + 增加阶数
      </button>
    </div>
  );
}
