# Analog Calc — 模拟电路计算器

基于 Tauri v2 的桌面应用，提供模拟电路设计中常用的计算工具。

## 功能

| 计算器 | 说明 |
|---|---|
| **RC滤波器** | 支持多级 RC 滤波器，计算每级截止频率、整体截止频率，以及等效噪声带宽（ENBW，基于 Simpson 积分） |
| **运放噪声** | 根据 GBW、增益、噪声密度、滤波器阶数计算运放电路总 RMS 输出噪声 |
| **电阻分压** | 在 E6/E12/E24/E96 系列中搜索最优分压电阻组合，支持串联/并联扩展，可配置权重评分 |
| **电阻取值** | 输入目标电阻值，从 E6/E12/E24/E96 系列中找出最接近的单电阻或串联/并联组合 |

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | [Tauri v2](https://v2.tauri.app/)（Rust） |
| 前端 | React 19 + TypeScript + Tailwind CSS v4 |
| 构建工具 | Vite 7 |
| 包管理 | pnpm |

## 开发

```bash
# 安装依赖
pnpm install

# 启动前端开发服务器（浏览器 http://localhost:1420）
pnpm dev

# 启动完整桌面应用
pnpm tauri dev

# 构建生产版本
pnpm tauri build

# 仅构建前端
pnpm build
```

## 项目结构

```
src/                         # React 前端
├── App.tsx                  # 根组件（选项卡导航）
├── main.tsx                 # React 入口
├── units.ts                 # SI 单位解析与格式化工具
├── FilterCalculator.tsx     # RC 滤波器计算
├── NoiseCalculator.tsx      # 运放噪声计算
├── ResistorFinder.tsx       # 电阻取值
└── DividerCalculator.tsx    # 电阻分压计算

src-tauri/                   # Rust 后端
├── src/lib.rs               # 核心命令（calculate_cutoff / noise / divider / find_resistor_values）
├── src/main.rs              # 程序入口
└── tauri.conf.json          # Tauri 配置
```

## 许可

本项目基于 Apache License 2.0 开源。详见 [LICENSE](./LICENSE) 文件。
