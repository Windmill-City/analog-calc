import DividerCalculator from "./DividerCalculator"
import FilterCalculator from "./FilterCalculator"
import NoiseCalculator from "./NoiseCalculator"
import ResistorFinder from "./ResistorFinder"
import { useStore, type Tab } from "./store"

const TABS: { key: Tab; label: string }[] = [
  { key: "filter", label: "RC滤波器" },
  { key: "noise", label: "运放噪声" },
  { key: "divider", label: "电阻分压" },
  { key: "resistor", label: "电阻取值" },
]

function App() {
  const activeTab = useStore((s) => s.activeTab)
  const setActiveTab = useStore((s) => s.setActiveTab)

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="max-w-3xl mx-auto w-full px-4 py-4 flex flex-col flex-1 min-h-0">
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

        <div className="bg-white rounded-lg shadow p-6 flex flex-col flex-1 min-h-0">
          {activeTab === "filter" && <FilterCalculator />}
          {activeTab === "noise" && <NoiseCalculator />}
          {activeTab === "divider" && <DividerCalculator />}
          {activeTab === "resistor" && <ResistorFinder />}
        </div>
      </div>
    </div>
  )
}

export default App
