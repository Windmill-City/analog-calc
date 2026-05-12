import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { parseWithUnit, formatResistance, formatSi } from "./units";

interface Solution {
  r1: number;
  r2: number;
  vo: number;
  error_percent: number;
}

const SERIES = ["E6", "E12", "E24", "E96"];

export default function DividerCalculator() {
  const [vi, setVi] = useState("5");
  const [targetVo, setTargetVo] = useState("2.5");
  const [series, setSeries] = useState("E24");
  const [useCombinations, setUseCombinations] = useState(false);
  const [solutions, setSolutions] = useState<Solution[]>([]);

  async function calc(v: string, tv: string, s: string, comb: boolean) {
    const vv = parseWithUnit(v);
    const tvv = parseWithUnit(tv);
    if (isNaN(vv) || isNaN(tvv) || vv <= 0 || tvv <= 0 || tvv >= vv) return;
    const result = await invoke<Solution[]>("calculate_divider", {
      vi: vv,
      targetVo: tvv,
      series: s,
      useCombinations: comb,
      count: 10,
    });
    setSolutions(result);
  }

  useEffect(() => { calc(vi, targetVo, series, useCombinations); }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">电阻分压计算器</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">输入电压 V<sub>i</sub> (V)</label>
          <input
            type="text"
            className="mt-1 w-full border rounded px-2 py-1"
            value={vi}
            onChange={(e) => setVi(e.target.value)}
            onBlur={() => calc(vi, targetVo, series, useCombinations)}
            placeholder="e.g. 5, 3.3, 100m"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">目标电压 V<sub>o</sub> (V)</label>
          <input
            type="text"
            className="mt-1 w-full border rounded px-2 py-1"
            value={targetVo}
            onChange={(e) => setTargetVo(e.target.value)}
            onBlur={() => calc(vi, targetVo, series, useCombinations)}
            placeholder="e.g. 2.5, 1.8, 500m"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">电阻系列</label>
          <div className="flex gap-2">
            {SERIES.map((s) => (
              <button
                key={s}
                className={`px-3 py-1 rounded text-sm ${series === s ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                onClick={() => { setSeries(s); calc(vi, targetVo, s, useCombinations); }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 mt-5">
          <input
            type="checkbox"
            checked={useCombinations}
            onChange={(e) => { const v = e.target.checked; setUseCombinations(v); calc(vi, targetVo, series, v); }}
          />
          <span className="text-sm">允许串并联组合</span>
        </label>
      </div>

      {solutions.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-2">
            找到 {solutions.length} 个方案 (V<sub>i</sub> = {vi} 固定, 目标 V<sub>o</sub> = {targetVo})
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">#</th>
                <th className="border px-2 py-1 text-left">R<sub>1</sub></th>
                <th className="border px-2 py-1 text-left">R<sub>2</sub></th>
                <th className="border px-2 py-1 text-left">V<sub>o</sub></th>
                <th className="border px-2 py-1 text-left">误差</th>
              </tr>
            </thead>
            <tbody>
              {solutions.map((sol, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{i + 1}</td>
                  <td className="border px-2 py-1">{formatResistance(sol.r1)}</td>
                  <td className="border px-2 py-1">{formatResistance(sol.r2)}</td>
                  <td className="border px-2 py-1 font-mono">{formatSi(sol.vo, "V", 4)}</td>
                  <td className="border px-2 py-1 font-mono">{sol.error_percent.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">
            V<sub>o</sub> = V<sub>i</sub> × R<sub>2</sub> / (R<sub>1</sub> + R<sub>2</sub>)
          </p>
        </div>
      )}
    </div>
  );
}
