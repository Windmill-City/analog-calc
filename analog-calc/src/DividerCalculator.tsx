import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { parseWithUnit, formatResistance, formatSi } from "./units";

interface ResistorInfo {
  value: number;
  components: number[];
  config: string;
}

interface Solution {
  r1: ResistorInfo;
  r2: ResistorInfo;
  vo: number;
  error_percent: number;
}

const SERIES = ["E6", "E12", "E24", "E96"];

const CONFIG_LABEL: Record<string, string> = {
  single: "",
  series: "串联",
  parallel: "并联",
};

function formatResistorComposition(info: ResistorInfo): string {
  const val = formatResistance(info.value);
  if (info.config === "single") return val;
  const op = info.config === "series" ? " + " : " // ";
  const components = info.components.map(formatResistance).join(op);
  return `${components} (${CONFIG_LABEL[info.config]}, ${val})`;
}

export default function DividerCalculator() {
  const [vi, setVi] = useState("5");
  const [targetVo, setTargetVo] = useState("2.5");
  const [series, setSeries] = useState("E24");
  const [useSeries, setUseSeries] = useState(false);
  const [useParallel, setUseParallel] = useState(false);
  const [solutions, setSolutions] = useState<Solution[]>([]);

  async function calc(v: string, tv: string, s: string, us: boolean, up: boolean) {
    const vv = parseWithUnit(v);
    const tvv = parseWithUnit(tv);
    if (isNaN(vv) || isNaN(tvv) || vv <= 0 || tvv <= 0 || tvv >= vv) return;
    const result = await invoke<Solution[]>("calculate_divider", {
      vi: vv,
      targetVo: tvv,
      series: s,
      useSeries: us,
      useParallel: up,
      count: 10,
    });
    setSolutions(result);
  }

  useEffect(() => { calc(vi, targetVo, series, useSeries, useParallel); }, []);

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
            onBlur={() => calc(vi, targetVo, series, useSeries, useParallel)}
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
            onBlur={() => calc(vi, targetVo, series, useSeries, useParallel)}
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
                onClick={() => { setSeries(s); calc(vi, targetVo, s, useSeries, useParallel); }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={useSeries}
              onChange={(e) => { const v = e.target.checked; setUseSeries(v); calc(vi, targetVo, series, v, useParallel); }}
            />
            <span className="text-sm">允许串联</span>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={useParallel}
              onChange={(e) => { const v = e.target.checked; setUseParallel(v); calc(vi, targetVo, series, useSeries, v); }}
            />
            <span className="text-sm">允许并联</span>
          </label>
        </div>
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
                  <td className="border px-2 py-1 text-xs">{formatResistorComposition(sol.r1)}</td>
                  <td className="border px-2 py-1 text-xs">{formatResistorComposition(sol.r2)}</td>
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
