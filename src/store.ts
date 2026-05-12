import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Tab = "filter" | "noise" | "divider" | "resistor"

export interface FilterRow {
  id: number
  r: string
  c: string
}

export interface FilterState {
  rows: FilterRow[]
}

export interface NoiseState {
  gbw: string
  gain: string
  vnDensity: string
  filterOrder: number
  rcBandwidth: string
}

export interface DividerState {
  vi: string
  targetVo: string
  series: string
  useSeries: boolean
  useParallel: boolean
  seriesWeight: number
  configWeight: number
  errorWeight: number
  minTotal: string
  maxError: number
}

export interface ResistorState {
  target: string
  series: string
  useSeries: boolean
  useParallel: boolean
  maxError: number
  seriesWeight: number
  configWeight: number
  errorWeight: number
}

interface AppState {
  activeTab: Tab
  filter: FilterState
  noise: NoiseState
  divider: DividerState
  resistor: ResistorState
}

interface AppActions {
  setActiveTab: (tab: Tab) => void
  setFilter: (partial: Partial<FilterState>) => void
  setNoise: (partial: Partial<NoiseState>) => void
  setDivider: (partial: Partial<DividerState>) => void
  setResistor: (partial: Partial<ResistorState>) => void
}

export const useStore = create<AppState & AppActions>()(
  persist(
    (set) => ({
      activeTab: "filter",
      filter: { rows: [{ id: 0, r: "1k", c: "1u" }] },
      noise: { gbw: "1M", gain: "2", vnDensity: "10n", filterOrder: 1, rcBandwidth: "1k" },
      divider: {
        vi: "5",
        targetVo: "0.8",
        series: "E12",
        useSeries: true,
        useParallel: true,
        seriesWeight: 0.1,
        configWeight: 1.0,
        errorWeight: 5.0,
        minTotal: "100k",
        maxError: 5.0,
      },
      resistor: {
        target: "10k",
        series: "E12",
        useSeries: true,
        useParallel: true,
        maxError: 5.0,
        seriesWeight: 0.1,
        configWeight: 1.0,
        errorWeight: 5.0,
      },
      setActiveTab: (tab) => set({ activeTab: tab }),
      setFilter: (partial) => set((s) => ({ filter: { ...s.filter, ...partial } })),
      setNoise: (partial) => set((s) => ({ noise: { ...s.noise, ...partial } })),
      setDivider: (partial) => set((s) => ({ divider: { ...s.divider, ...partial } })),
      setResistor: (partial) => set((s) => ({ resistor: { ...s.resistor, ...partial } })),
    }),
    { name: "analog-calc-state" },
  ),
)
