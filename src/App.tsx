import { useState } from "react"
import DividerCalculator from "./DividerCalculator"
import FilterCalculator from "./FilterCalculator"
import NoiseCalculator from "./NoiseCalculator"

type Tab = "filter" | "noise" | "divider"

const TABS: { key: Tab; label: string }[] = [
  { key: "filter", label: "RC滤波器" },
  { key: "noise", label: "运放噪声" },
  { key: "divider", label: "电阻分压" },
]

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("filter")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <nav className="flex gap-1 mb-6 border-b">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="bg-white rounded-lg shadow p-6">
          {activeTab === "filter" && <FilterCalculator />}
          {activeTab === "noise" && <NoiseCalculator />}
          {activeTab === "divider" && <DividerCalculator />}
        </div>
      </div>
    </div>
  )
}

export default App
