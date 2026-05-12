import { invoke } from "@tauri-apps/api/core"
import { useEffect, useRef, useState } from "react"
import { formatResistance, formatSi, parseWithUnit } from "./units"

interface ResistorInfo {
  value: number
  components: number[]
  component_series: string[]
  config: string
}

interface Solution {
  r1: ResistorInfo
  r2: ResistorInfo
  vo: number
  vi: number
  error_percent: number
}

const SERIES = ["E6", "E12", "E24", "E96"]

const CONFIG_LABEL: Record<string, string> = {
  single: "",
  series: "串联",
  parallel: "并联",
}

const SERIES_COLOR: Record<string, string> = {
  E6: "bg-red-100 text-red-700",
  E12: "bg-orange-100 text-orange-700",
  E24: "bg-blue-100 text-blue-700",
  E96: "bg-green-100 text-green-700",
}

function Badge({ series }: { series: string }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${SERIES_COLOR[series] ?? "bg-gray-100 text-gray-700"}`}
    >
      {series}
    </span>
  )
}

function ResistorCell({ info }: { info: ResistorInfo }) {
  const val = formatResistance(info.value)
  if (info.config === "single") {
    return (
      <>
        <span className="mr-1">{val}</span>
        <Badge series={info.component_series[0]} />
      </>
    )
  }
  const op = info.config === "series" ? " + " : " | "
  const parts = info.components.map((c, i) => (
    <span key={i}>
      {i > 0 && <span className="mx-0.5">{op.trim()}</span>}
      <span className="mr-0.5">{formatResistance(c)}</span>
      <Badge series={info.component_series[i]} />
    </span>
  ))
  return (
    <>
      {parts}{" "}
      <span className="text-gray-500">
        ({CONFIG_LABEL[info.config]}, {val})
      </span>
    </>
  )
}

export default function DividerCalculator() {
  const [vi, setVi] = useState("5")
  const [targetVo, setTargetVo] = useState("0.8")
  const [series, setSeries] = useState("E12")
  const [useSeries, setUseSeries] = useState(true)
  const [useParallel, setUseParallel] = useState(true)
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [pending, setPending] = useState(false)
  const [seriesWeight, setSeriesWeight] = useState(0.1)
  const [configWeight, setConfigWeight] = useState(1.0)
  const [errorWeight, setErrorWeight] = useState(5.0)
  const [minTotal, setMinTotal] = useState("100k")
  const calcId = useRef(0)

  async function calc(
    v: string,
    tv: string,
    s: string,
    us: boolean,
    up: boolean,
    sw: number,
    cw: number,
    ew: number,
    mt: string,
  ) {
    const vv = parseWithUnit(v)
    const tvv = parseWithUnit(tv)
    if (isNaN(vv) || isNaN(tvv) || vv <= 0 || tvv <= 0) {
      setSolutions([])
      return
    }
    if (tvv >= vv) {
      setSolutions([])
      return
    }
    const mtv = parseWithUnit(mt)
    const minTotalVal = isNaN(mtv) || mtv <= 0 ? 0.0 : mtv
    const id = ++calcId.current
    setPending(true)
    try {
      const result = await invoke<Solution[]>("calculate_divider", {
        vi: vv,
        vo: tvv,
        series: s,
        useSeries: us,
        useParallel: up,
        count: 10,
        seriesWeight: sw,
        configWeight: cw,
        errorWeight: ew,
        minTotalResistance: minTotalVal,
      })
      if (id === calcId.current) {
        setSolutions(result)
        setPending(false)
      }
    } catch {
      if (id === calcId.current) setPending(false)
    }
  }

  useEffect(() => {
    calc(vi, targetVo, series, useSeries, useParallel, seriesWeight, configWeight, errorWeight, minTotal)
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">电阻分压计算器</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">
            输入电压 V<sub>i</sub> (V)
          </label>
          <input
            type="text"
            className="mt-1 w-full border rounded px-2 py-1"
            value={vi}
            onChange={(e) => setVi(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            onBlur={() => calc(vi, targetVo, series, useSeries, useParallel, seriesWeight, configWeight, errorWeight, minTotal)}
            placeholder="e.g. 5, 3.3, 100m"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            目标电压 V<sub>o</sub> (V)
          </label>
          <input
            type="text"
            className="mt-1 w-full border rounded px-2 py-1"
            value={targetVo}
            onChange={(e) => setTargetVo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            onBlur={() => calc(vi, targetVo, series, useSeries, useParallel, seriesWeight, configWeight, errorWeight, minTotal)}
            placeholder="e.g. 2.5, 1.8, 500m"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">电阻系列</label>
          <div className="flex gap-2">
            {SERIES.map((s) => (
              <button
                key={s}
                className={`px-3 py-1 rounded text-sm ${series === s ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                onClick={() => {
                  setSeries(s)
                  calc(vi, targetVo, s, useSeries, useParallel, seriesWeight, configWeight, errorWeight, minTotal)
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button
            type="button"
            className={`px-3 py-1 rounded text-sm ${useSeries ? "bg-green-700 text-white" : "bg-gray-200 text-gray-700"}`}
            onClick={() => {
              const v = !useSeries
              setUseSeries(v)
              calc(vi, targetVo, series, v, useParallel, seriesWeight, configWeight, errorWeight, minTotal)
            }}
          >
            串联
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded text-sm ${useParallel ? "bg-green-700 text-white" : "bg-gray-200 text-gray-700"}`}
            onClick={() => {
              const v = !useParallel
              setUseParallel(v)
              calc(vi, targetVo, series, useSeries, v, seriesWeight, configWeight, errorWeight, minTotal)
            }}
          >
            并联
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">
          总电阻最小值 R<sub>tot</sub> (Ω)
        </label>
        <input
          type="text"
          className="mt-1 w-full border rounded px-2 py-1"
          value={minTotal}
          onChange={(e) => setMinTotal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          onBlur={() => calc(vi, targetVo, series, useSeries, useParallel, seriesWeight, configWeight, errorWeight, minTotal)}
          placeholder="e.g. 1k, 10k, 100k (留空不限)"
        />
      </div>

      <details className="text-sm text-gray-600">
        <summary className="cursor-pointer select-none">排序权重</summary>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-3">
            <span className="w-24 shrink-0">系列权重</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={seriesWeight}
              onChange={(e) => {
                const v = +e.target.value
                setSeriesWeight(v)
                calc(vi, targetVo, series, useSeries, useParallel, v, configWeight, errorWeight, minTotal)
              }}
              className="flex-1"
            />
            <span className="w-10 text-right font-mono">{seriesWeight.toFixed(2)}</span>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-24 shrink-0">结构权重</span>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={configWeight}
              onChange={(e) => {
                const v = +e.target.value
                setConfigWeight(v)
                calc(vi, targetVo, series, useSeries, useParallel, seriesWeight, v, errorWeight, minTotal)
              }}
              className="flex-1"
            />
            <span className="w-10 text-right font-mono">{configWeight.toFixed(1)}</span>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-24 shrink-0">误差权重</span>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={errorWeight}
              onChange={(e) => {
                const v = +e.target.value
                setErrorWeight(v)
                calc(vi, targetVo, series, useSeries, useParallel, seriesWeight, configWeight, v, minTotal)
              }}
              className="flex-1"
            />
            <span className="w-10 text-right font-mono">{errorWeight.toFixed(1)}</span>
          </label>
        </div>
      </details>

      {pending && (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <svg
            className="animate-spin h-6 w-6 mr-2"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span className="text-sm">计算中...</span>
        </div>
      )}
      {!pending && solutions.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-2">
            找到 {solutions.length} 个方案
          </p>
          <div className="overflow-y-auto max-h-96">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">#</th>
                  <th className="border px-2 py-1 text-left">
                    R<sub>1</sub>
                  </th>
                  <th className="border px-2 py-1 text-left">
                    R<sub>2</sub>
                  </th>
                  <th className="border px-2 py-1 text-left">
                    V<sub>o</sub>
                  </th>
                  <th className="border px-2 py-1 text-left">
                    V<sub>i</sub>
                  </th>
                  <th className="border px-2 py-1 text-left">误差</th>
                </tr>
              </thead>
              <tbody>
                {solutions.map((sol, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{i + 1}</td>
                    <td className="border px-2 py-1 text-xs">
                      <ResistorCell info={sol.r1} />
                    </td>
                    <td className="border px-2 py-1 text-xs">
                      <ResistorCell info={sol.r2} />
                    </td>
                    <td className="border px-2 py-1 font-mono">
                      {formatSi(sol.vo, "V", 4)}
                    </td>
                    <td className="border px-2 py-1 font-mono">
                      {formatSi(sol.vi, "V", 4)}
                    </td>
                    <td className="border px-2 py-1 font-mono">
                      {sol.error_percent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            V<sub>o</sub> = V<sub>i</sub> × R<sub>2</sub> / (R<sub>1</sub> + R
            <sub>2</sub>)
            <br />V<sub>i</sub> = V<sub>o</sub> × (R<sub>1</sub> + R<sub>2</sub>
            ) / R<sub>2</sub>
          </p>
        </div>
      )}
    </div>
  )
}
