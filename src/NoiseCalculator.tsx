import { invoke } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"
import { formatSi, parseWithUnit } from "./units"
import { useStore } from "./store"

export default function NoiseCalculator() {
  const noise = useStore((s) => s.noise)
  const setNoise = useStore((s) => s.setNoise)
  const { gbw, gain, vnDensity, filterOrder, rcBandwidth } = noise
  const enbFactorStr = filterOrder === 0 ? "" : filterOrder === 1 ? "π/2" : filterOrder === 2 ? "π/4" : "π/8"
  const [result, setResult] = useState<number | null>(null)

  async function calc(
    g: string,
    a: string,
    vn: string,
    order: number,
    bw: string,
  ) {
    const gv = parseWithUnit(g)
    const av = parseWithUnit(a)
    const vnv = parseWithUnit(vn)
    const bwv = parseWithUnit(bw)
    if (
      isNaN(gv) ||
      isNaN(av) ||
      isNaN(vnv) ||
      isNaN(bwv) ||
      gv <= 0 ||
      av <= 0 ||
      vnv <= 0 ||
      bwv <= 0
    )
      return
    const rms = await invoke<number>("calculate_noise", {
      gbw: gv,
      gain: av,
      vnDensity: vnv,
      filterOrder: order,
      rcBandwidth: bwv,
    })
    setResult(rms)
  }

  useEffect(() => {
    calc(gbw, gain, vnDensity, filterOrder, rcBandwidth)
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">运放 Vrms 噪声计算</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">GBW (Hz)</label>
          <input
            type="text"
            className="mt-1 w-full border rounded px-2 py-1"
            value={gbw}
            onChange={(e) => setNoise({ gbw: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            onBlur={() => calc(gbw, gain, vnDensity, filterOrder, rcBandwidth)}
            placeholder="e.g. 1M, 10M, 100k"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">增益 (V/V)</label>
          <input
            type="text"
            className="mt-1 w-full border rounded px-2 py-1"
            value={gain}
            onChange={(e) => setNoise({ gain: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            onBlur={() => calc(gbw, gain, vnDensity, filterOrder, rcBandwidth)}
            placeholder="e.g. 10, 100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            V<sub>n</sub> 密度 (V/√Hz)
          </label>
          <input
            type="text"
            className="mt-1 w-full border rounded px-2 py-1"
            value={vnDensity}
            onChange={(e) => setNoise({ vnDensity: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            onBlur={() => calc(gbw, gain, vnDensity, filterOrder, rcBandwidth)}
            placeholder="e.g. 10n, 0.1u, 1e-8"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            RC 滤波器带宽 (Hz)
          </label>
          <input
            type="text"
            className={`mt-1 w-full border rounded px-2 py-1 ${filterOrder === 0 ? "opacity-40" : ""}`}
            value={rcBandwidth}
            onChange={(e) => setNoise({ rcBandwidth: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            onBlur={() => calc(gbw, gain, vnDensity, filterOrder, rcBandwidth)}
            placeholder="e.g. 100k, 1M, 10k"
            disabled={filterOrder === 0}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">输出滤波器阶数</label>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded ${filterOrder === 0 ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => {
              setNoise({ filterOrder: 0 })
              calc(gbw, gain, vnDensity, 0, rcBandwidth)
            }}
          >
            无滤波
          </button>
          {[1, 2, 3].map((order) => (
            <button
              key={order}
              className={`px-3 py-1 rounded ${filterOrder === order ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              onClick={() => {
                setNoise({ filterOrder: order })
                calc(gbw, gain, vnDensity, order, rcBandwidth)
              }}
            >
              {order}阶 RC
            </button>
          ))}
        </div>
      </div>

      {result !== null && (
        <div className="p-3 bg-gray-50 rounded border">
          <p className="text-sm text-gray-500">
            总输出噪声 V<sub>rms</sub>
          </p>
          <p className="text-xl font-mono">{formatSi(result, "V", 3)}</p>
          <p className="text-xs text-gray-400 font-mono">
            {enbFactorStr ? (
              <>V<sub>rms</sub> = V<sub>n</sub> × √(min(GBW/A<sub>v</sub>, f<sub>RC</sub> × {enbFactorStr}))</>
            ) : (
              <>V<sub>rms</sub> = V<sub>n</sub> × √(GBW/A<sub>v</sub>)</>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
