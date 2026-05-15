import { formatSi, parseWithUnit } from "./units"
import { useStore } from "./store"

function f0(l: number, c: number): number {
  return 1 / (2 * Math.PI * Math.sqrt(l * c))
}

function computeRow(l: string, c: string): number | null {
  const lv = parseWithUnit(l)
  const cv = parseWithUnit(c)
  if (isNaN(lv) || isNaN(cv) || lv <= 0 || cv <= 0) return null
  return f0(lv, cv)
}

function hSquared(f: number, f0List: number[]): number {
  let result = 1
  for (const f0i of f0List) {
    result /= 1 + (f / f0i) ** 2
  }
  return result
}

function totalCutoffFreq(f0List: number[]): number {
  const minF0 = Math.min(...f0List)
  let lo = 0,
    hi = minF0
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (hSquared(mid, f0List) > 0.5) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function computeEnbw(f0List: number[]): number {
  const maxF0 = Math.max(...f0List)
  const fMax = maxF0 * 1000
  const n = 10000
  const h = fMax / n
  let sum = hSquared(0, f0List) + hSquared(fMax, f0List)
  for (let i = 1; i < n; i++) {
    const f = i * h
    sum += hSquared(f, f0List) * (i % 2 === 0 ? 2 : 4)
  }
  return (sum * h) / 3
}

export default function LcFilterCalculator() {
  const rows = useStore((s) => s.lcFilter.rows)
  const setLcFilter = useStore((s) => s.setLcFilter)

  function updateRow(id: number, field: "l" | "c", value: string) {
    setLcFilter({
      rows: rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    })
  }

  function addRow() {
    const last = rows[rows.length - 1]
    const maxId = rows.reduce((m, r) => Math.max(m, r.id), 0)
    const l = last ? last.l : ""
    const c = last ? last.c : ""
    setLcFilter({ rows: [...rows, { id: maxId + 1, l, c }] })
  }

  function removeRow(id: number) {
    setLcFilter({ rows: rows.filter((row) => row.id !== id) })
  }

  const f0List = rows
    .map((row) => computeRow(row.l, row.c))
    .filter((v): v is number => v !== null)
  const totalF0 =
    f0List.length > 0
      ? f0List.length === 1
        ? f0List[0]
        : totalCutoffFreq(f0List)
      : null
  const enbwVal =
    f0List.length > 0
      ? f0List.length === 1
        ? (f0List[0] * Math.PI) / 2
        : computeEnbw(f0List)
      : null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">LC 滤波器谐振频率计算</h2>

      {rows.map((row, i) => {
        const result = computeRow(row.l, row.c)
        return (
          <div key={row.id} className="p-3 border rounded space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 shrink-0">
                第{i + 1}级
              </span>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1"
                  value={row.l}
                  onChange={(e) => updateRow(row.id, "l", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  placeholder="L (H)"
                />
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1"
                  value={row.c}
                  onChange={(e) => updateRow(row.id, "c", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
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
                f<sub>0</sub> = {formatSi(result, "Hz", 3)}
              </p>
            )}
          </div>
        )
      })}

      <button
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-500 hover:text-blue-600"
        onClick={addRow}
      >
        + 增加阶数
      </button>

      {totalF0 !== null && enbwVal !== null && (
        <div className="p-3 bg-gray-50 rounded border space-y-2">
          <div>
            <p className="text-sm text-gray-500">总谐振频率</p>
            <p className="text-xl font-mono">{formatSi(totalF0, "Hz", 3)}</p>
            <p className="text-xs text-gray-400 font-mono">
              {f0List.length === 1 ? (
                <>f<sub>0</sub> = 1 / (2π√(LC))</>
              ) : (
                <>|H(f)|² = Π 1/(1+(f/f<sub>0i</sub>)²), |H(f<sub>0</sub>)|² = 0.5</>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">等效噪声带宽 (ENBW)</p>
            <p className="text-xl font-mono">{formatSi(enbwVal, "Hz", 3)}</p>
            <p className="text-xs text-gray-400 font-mono">
              {f0List.length === 1 ? (
                <>ENBW = f<sub>0</sub> × π/2</>
              ) : (
                <>ENBW = ∫₀^∞ |H(f)|² df</>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
