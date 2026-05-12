import { invoke } from "@tauri-apps/api/core"
import { useEffect, useRef, useState } from "react"
import { formatResistance, parseWithUnit } from "./units"
import { useStore } from "./store"

interface ResistorFinderSolution {
  value: number
  components: number[]
  component_series: string[]
  config: string
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

function ResistorCell({ info }: { info: ResistorFinderSolution }) {
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

export default function ResistorFinder() {
  const resistor = useStore((s) => s.resistor)
  const setResistor = useStore((s) => s.setResistor)
  const { target, series, useSeries, useParallel, maxError, seriesWeight, configWeight, errorWeight } = resistor
  const [solutions, setSolutions] = useState<ResistorFinderSolution[]>([])
  const [pending, setPending] = useState(false)
  const calcId = useRef(0)

  async function calc(
    t: string,
    s: string,
    us: boolean,
    up: boolean,
    me: number,
    sw: number,
    cw: number,
    ew: number,
  ) {
    const tv = parseWithUnit(t)
    if (isNaN(tv) || tv <= 0) {
      setSolutions([])
      return
    }
    const id = ++calcId.current
    setPending(true)
    try {
      const result = await invoke<ResistorFinderSolution[]>("find_resistor_values", {
        target: tv,
        series: s,
        useSeries: us,
        useParallel: up,
        count: 20,
        maxError: me,
        seriesWeight: sw,
        configWeight: cw,
        errorWeight: ew,
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
    calc(target, series, useSeries, useParallel, maxError, seriesWeight, configWeight, errorWeight)
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">电阻取值</h2>

      <div>
        <label className="block text-sm font-medium">目标电阻值 (Ω)</label>
        <input
          type="text"
          className="mt-1 w-full border rounded px-2 py-1"
          value={target}
          onChange={(e) => setResistor({ target: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          onBlur={() => calc(target, series, useSeries, useParallel, maxError, seriesWeight, configWeight, errorWeight)}
          placeholder="e.g. 10k, 4.7k, 1M"
        />
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
                  setResistor({ series: s })
                  calc(target, s, useSeries, useParallel, maxError, seriesWeight, configWeight, errorWeight)
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
              setResistor({ useSeries: v })
              calc(target, series, v, useParallel, maxError, seriesWeight, configWeight, errorWeight)
            }}
          >
            串联
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded text-sm ${useParallel ? "bg-green-700 text-white" : "bg-gray-200 text-gray-700"}`}
            onClick={() => {
              const v = !useParallel
              setResistor({ useParallel: v })
              calc(target, series, useSeries, v, maxError, seriesWeight, configWeight, errorWeight)
            }}
          >
            并联
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="block text-sm font-medium">
            最大误差: {maxError.toFixed(1)}%
          </label>
          <button
            className="text-xs text-gray-400 hover:text-blue-600"
            onClick={() => {
              setResistor({ maxError: 5.0 })
              calc(target, series, useSeries, useParallel, 5.0, seriesWeight, configWeight, errorWeight)
            }}
          >
            复位
          </button>
        </div>
        <input
          type="range"
          min="0.1"
          max="20"
          step="0.1"
          value={maxError}
          onChange={(e) => {
            const v = +e.target.value
            setResistor({ maxError: v })
            calc(target, series, useSeries, useParallel, v, seriesWeight, configWeight, errorWeight)
          }}
          className="w-full"
        />
      </div>

      <details className="text-sm text-gray-600">
        <summary className="cursor-pointer select-none">排序权重</summary>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-3 group relative">
            <span className="w-24 shrink-0 cursor-help border-b border-dotted border-gray-400">系列权重</span>
            <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-3 py-2 w-72 shadow-lg pointer-events-none">
              偏好常见系列（E6 &gt; E12 &gt; E24 &gt; E96）的阻值<br />
              ↑ 增加：结果优先选用更易获取的阻值<br />
              ↓ 减少：忽略系列偏好，只看其他因素
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={seriesWeight}
              onChange={(e) => {
                const v = +e.target.value
                setResistor({ seriesWeight: v })
                calc(target, series, useSeries, useParallel, maxError, v, configWeight, errorWeight)
              }}
              className="flex-1"
            />
            <span className="w-10 text-right font-mono">{seriesWeight.toFixed(2)}</span>
          </label>
          <label className="flex items-center gap-3 group relative">
            <span className="w-24 shrink-0 cursor-help border-b border-dotted border-gray-400">结构权重</span>
            <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-3 py-2 w-72 shadow-lg pointer-events-none">
              偏好简单结构（单电阻 &gt; 串联 &gt; 并联）<br />
              ↑ 增加：结果优先使用更简洁的电路<br />
              ↓ 减少：允许复杂结构，增加组合可能性
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={configWeight}
              onChange={(e) => {
                const v = +e.target.value
                setResistor({ configWeight: v })
                calc(target, series, useSeries, useParallel, maxError, seriesWeight, v, errorWeight)
              }}
              className="flex-1"
            />
            <span className="w-10 text-right font-mono">{configWeight.toFixed(1)}</span>
          </label>
          <label className="flex items-center gap-3 group relative">
            <span className="w-24 shrink-0 cursor-help border-b border-dotted border-gray-400">误差权重</span>
            <div className="absolute left-0 top-full mt-1 z-10 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-3 py-2 w-72 shadow-lg pointer-events-none">
              偏好误差小的阻值组合<br />
              ↑ 增加：结果优先选择更准确的比值<br />
              ↓ 减少：允许较大误差，扩大可选范围
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={errorWeight}
              onChange={(e) => {
                const v = +e.target.value
                setResistor({ errorWeight: v })
                calc(target, series, useSeries, useParallel, maxError, seriesWeight, configWeight, v)
              }}
              className="flex-1"
            />
            <span className="w-10 text-right font-mono">{errorWeight.toFixed(1)}</span>
          </label>
        </div>
        <button
          className="text-xs text-gray-400 hover:text-blue-600"
          onClick={() => {
            setResistor({ seriesWeight: 0.1, configWeight: 1.0, errorWeight: 5.0 })
            calc(target, series, useSeries, useParallel, maxError, 0.1, 1.0, 5.0)
          }}
        >
          排序权重复位
        </button>
      </details>

      {pending && (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <svg className="animate-spin h-6 w-6 mr-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
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
                  <th className="border px-2 py-1 text-left">阻值</th>
                  <th className="border px-2 py-1 text-left">构成</th>
                  <th className="border px-2 py-1 text-left">误差</th>
                </tr>
              </thead>
              <tbody>
                {solutions.map((sol, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{i + 1}</td>
                    <td className="border px-2 py-1 font-mono">
                      {formatResistance(sol.value)}
                    </td>
                    <td className="border px-2 py-1 text-xs">
                      <ResistorCell info={sol} />
                    </td>
                    <td className="border px-2 py-1 font-mono">
                      {sol.error_percent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!pending && solutions.length === 0 && target && (
        <p className="text-sm text-gray-400 text-center py-4">未找到匹配的方案</p>
      )}
    </div>
  )
}
