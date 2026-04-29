# H5 游戏合集 → 微信小程序转换设计方案

## 概述

将现有 36 款 H5 小游戏转换为单一微信小程序（游戏合集），采用原生小程序 + 轻量适配层方案，分批迭代上线。核心目标：流量变现 + 体验升级。

## 决策记录

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 小程序形态 | 单一合集小程序 | 统一入口，便于交叉推广和用户留存 |
| 上线策略 | 分批迭代，首批 9 款 | 降低风险，快速验证模式 |
| 技术方案 | 原生小程序 + 手动适配 | 游戏已是纯 Canvas 2D，迁移路径最短，性能最优 |
| DOM 游戏处理 | 全部转 Canvas | 统一技术栈，降低维护成本 |
| 社交/变现 | 第一版全部包含 | 广告（Banner/插屏/激励视频）+ 好友排行榜 + 分享裂变 |

## 第一批游戏（9 款）

| # | 游戏 | 代码量 | 类型 | 选入理由 |
|---|------|--------|------|---------|
| 1 | stack 叠叠乐 | 638行 | 休闲 | 最简单，跑通全流程 |
| 2 | snake 贪吃蛇 | 1,288行 | 休闲 | 经典，Canvas 逻辑直接 |
| 3 | flappy Flappy Bird | 1,033行 | 街机 | 病毒传播潜力大 |
| 4 | tetris 俄罗斯方块 | 1,620行 | 休闲 | 国民级游戏 |
| 5 | match3 消消乐 | 1,716行 | 休闲 | 消除类在中国极受欢迎 |
| 6 | fruit 切水果 | 1,142行 | 街机 | 触屏天然适配 |
| 7 | breakout 打砖块 | 1,200行 | 街机 | 经典街机，丰富品类 |
| 8 | 2048 | 862行 | 休闲 | 验证 DOM→Canvas 转换路径 |
| 9 | pvz 植物大战僵尸 | 1,861行 | 策略 | 中国市场号召力极强 |

前 7 款为现成 Canvas 游戏，第 8 款验证 DOM→Canvas 方案，第 9 款为重量级游戏。

## 小程序整体架构

### 项目目录结构

```
mini-games-collection/
├── app.js                    # 全局逻辑：广告管理、分享配置
├── app.json                  # 路由 + 分包配置
├── app.wxss                  # 全局样式（暗色主题）
│
├── pages/                    # 主包（≤2MB）
│   ├── home/                 # 游戏大厅首页
│   └── category/             # 分类浏览页
│
├── lib/                      # 共享适配层（主包内）
│   ├── adapter.js            # H5→小程序 Canvas API 适配
│   ├── storage.js            # localStorage → wx.storage 映射
│   ├── audio.js              # 音效管理器
│   ├── ad-manager.js         # 广告组件统一管理
│   └── share.js              # 分享裂变逻辑
│
├── packages/                 # 游戏分包（每包≤2MB）
│   ├── pkg-casual/           # 休闲类：snake, tetris, 2048, match3, stack, ...
│   ├── pkg-arcade/           # 街机类：flappy, breakout, fruit, ...
│   ├── pkg-puzzle/           # 益智类：sudoku, minesweeper, wordle, ...
│   └── pkg-strategy/         # 策略类：pvz, tower, tank, ...
│
├── components/               # 公共组件
│   ├── game-canvas/          # 通用游戏 Canvas 容器组件
│   ├── scoreboard/           # 成绩面板
│   └── game-over/            # 游戏结束弹窗（重试/分享/排行榜）
│
└── open-data/                # 开放数据域（好友排行榜）
    ├── index.js              # 排行榜渲染逻辑
    └── index.json
```

### 分包策略

按游戏类型分为 4 大类（休闲/街机/益智/策略），每个分包 ≤2MB。主包仅放首页 + 共享 lib，控制在 2MB 内。每款游戏纯代码约 30-60KB，36 款游戏总包远低于 20MB 上限。

### 游戏分类

| 分类 | 游戏 |
|------|------|
| 休闲 | snake, tetris, 2048, match3, stack, flappy, mole, pong, suika |
| 街机 | breakout, fruit, runner, shooter, invaders, pacman, mario, contra, frogger |
| 益智 | sudoku, minesweeper, wordle, memory, maze, gomoku, klotski, idiom |
| 策略 | pvz, tower, tank, angry, blackjack, solitaire, bubble |

## 适配层核心设计

### H5 → 小程序 API 映射

| H5 API | 小程序替代 | 处理方式 |
|--------|-----------|---------|
| `canvas.getContext('2d')` | `Canvas.getContext('2d')` | API 一致，无需适配 |
| Canvas 2D 绑制方法（fillRect, arc, stroke, beginPath 等） | 小程序 CanvasRenderingContext2D | 全部一致，核心绘制代码零改动 |
| `requestAnimationFrame()` | `canvas.requestAnimationFrame()` | adapter 封装全局 rAF |
| `localStorage` | `wx.setStorageSync/getStorageSync` | storage.js 提供兼容接口 |
| `addEventListener('touchstart')` | WXML `bindtouchstart` | game-canvas 组件转发并统一坐标 |
| `addEventListener('keydown')` | 无键盘 API | 虚拟按键组件替代 |
| `new Image()` | `canvas.createImage()` | 游戏无图片资源，不涉及 |
| `new Audio()` | `wx.createInnerAudioContext()` | audio.js 封装 |
| DOM 操作 | 无 DOM API | HUD 用 WXML 组件，游戏逻辑用 Canvas |

### adapter.js 核心职责

```javascript
function createGameAdapter(canvas, ctx) {
  // 1. requestAnimationFrame 适配
  const rAF = cb => canvas.requestAnimationFrame(cb)

  // 2. 触摸事件标准化 — 处理 DPR 缩放和 canvas 偏移
  // 小程序 touch 事件 → 统一的 {x, y} 坐标

  // 3. localStorage 兼容层
  const storage = { getItem, setItem, removeItem }

  // 4. canvas 尺寸管理 — 处理 DPR，返回逻辑宽高

  return { canvas, ctx, rAF, storage, width, height }
}
```

每款游戏只需将入口改为 `function initGame(adapter)`，接收适配器对象，内部游戏逻辑基本原样复用。

### 虚拟按键方案

三种操控模板覆盖所有游戏：

| 模板 | 适用游戏 | 实现 |
|------|---------|------|
| 方向摇杆 | snake, pacman, tank 等（上下左右方向类） | Canvas 绘制虚拟摇杆，映射为方向键事件 |
| 点击/滑动 | flappy, fruit, match3 等（已是触屏操作） | 无需改造，原有触摸逻辑直接复用 |
| 复合操控 | mario, contra, pvz 等（方向 + 动作按钮） | 左侧方向摇杆 + 右侧动作按钮 |

## 游戏大厅首页

### 页面结构

- 顶部搜索栏
- 热门推荐 Banner（轮播展示本周热门游戏）
- 分类 Tab 切换（全部/休闲/街机/益智/策略）
- 3 列网格游戏卡片（图标 + 名称 + 热度数据）
- 底部 Banner 广告位

### 视觉风格

延续现有 H5 版暗色霓虹主题：背景 `#07080f`，主色调 `#818cf8`，字体 `system-ui`，neon glow 效果。

## 广告变现策略

### 三种广告形态

| 广告类型 | 展示位置/时机 | eCPM 参考 | 用户体验影响 |
|---------|-------------|----------|------------|
| Banner 广告 | 游戏大厅底部、游戏暂停页面 | ¥10-30/千次 | 低，被动展示 |
| 插屏广告 | 游戏结束时（每 3 局触发 1 次）、切换游戏时 | ¥30-80/千次 | 中，需控制频率 |
| 激励视频 | 用户主动选择观看（复活/2x分数/解锁提示） | ¥80-200/千次 | 低，用户主动 |

### 激励视频场景 × 游戏类型

| 激励场景 | 休闲类 | 街机类 | 益智类 | 策略类 |
|---------|--------|--------|--------|--------|
| 看广告复活 | — | 核心 | — | 核心 |
| 看广告 2x 分数 | 核心 | 适用 | — | — |
| 看广告解锁提示 | — | — | 核心 | — |

### ad-manager.js

```javascript
class AdManager {
  showBanner()                     // 创建/显示 banner，自动吸底
  hideBanner()                     // 游戏中隐藏 banner
  showInterstitial()               // 内置冷却计时器，≥3 局才触发
  showRewarded(onSuccess, onFail)  // 预加载 + 展示 + 完播回调
}
```

游戏侧调用示例：`adManager.showRewarded(() => player.revive())`

### 广告开通策略

广告位需先上线小程序并累计 1000+ UV 后申请流量主。建议先上线基础版本积累用户，达标后再接入广告。

## 分享裂变设计

### 分享闭环流程

1. **游戏结束** → 显示分数和「挑战好友」按钮
2. **触发分享** → 动态生成分享卡片（游戏截图 + 分数 + 挑战文案）
3. **好友点击** → 直接进入对应游戏页面，显示分享者分数作为挑战目标
4. **竞争驱动** → 好友玩完看到排行榜 → 继续分享 → 形成「玩→分享→挑战→再分享」循环

### 分享触发点

- 游戏结束弹窗「挑战好友」按钮
- 右上角菜单自然分享
- 新纪录时自动弹出分享提示

### 分享卡片文案示例

- 「我在贪吃蛇拿了 1280 分，你能超过我吗？」
- 「俄罗斯方块第 15 关，来挑战！」

### share.js

通过 `wx.onShareAppMessage` 和 `wx.onShareTimeline` 配置，分享参数携带 gameId 和 score，落地页解析参数直接跳转对应游戏。

## 好友排行榜

### 开放数据域架构

微信要求好友关系数据只能在隔离的"开放数据域"中访问：

- **主域** → 调用 `wx.setUserCloudStorage` 上报分数（每款游戏独立 key：`score_snake`、`score_tetris` 等）
- **主域** → 通过 `postMessage` 通知开放数据域显示排行榜
- **开放数据域** → 调用 `wx.getFriendCloudStorage` 获取好友数据
- **开放数据域** → 用 Canvas 渲染排行榜 UI
- **展示** → 通过 sharedCanvas 覆盖在主域页面上

### 排行榜 UI

- 显示好友头像、昵称、分数、排名
- 当前用户高亮显示
- 底部竞争引导：「超越小红，还差 680 分!」

### 关键约束

- 开放数据域只能读取好友数据，不能反向传数据给主域
- 排行榜 UI 必须在开放数据域内用 Canvas 绘制
- 每款游戏用不同 key 存储分数

## 前置准备

### 1. 账号与资质

- 注册微信小程序账号（**必须企业主体**，个人主体无法申请游戏类目）
- 完成微信认证（企业 ¥300/年）
- 小程序类目选择「小游戏 → 休闲游戏」

### 2. 开发环境

- 下载微信开发者工具
- 创建小游戏项目（AppID 绑定）
- 配置项目基础结构
- 开通广告组件权限
- 开通开放数据域

### 3. 审核注意事项

- 游戏内容合规（无暴力/赌博元素）
- **不使用知名 IP 名称**：mario→「平台冒险」、contra→「经典突击」、pvz→「植物守卫战」、angry→「弹弓飞鸟」
- 用户隐私协议页面
- 广告频率合规

## 单游戏标准转换管线

每款游戏从 H5 单文件转换为小程序分包页面的 5 步流程：

### Step 1: 提取游戏逻辑

从 `<game>/index.html` 的 `<script>` 中提取纯 JS 逻辑，移除所有 DOM 引用，封装为 `module.exports = { initGame }`。

### Step 2: 接入适配层

`initGame(adapter)` 接收适配器对象：`adapter.rAF` 替代 `requestAnimationFrame`，`adapter.storage` 替代 `localStorage`。

### Step 3: 创建小程序页面

```
packages/pkg-casual/snake/
├── index.wxml    # Canvas 容器 + HUD + 虚拟按键
├── index.js      # 页面生命周期 + adapter 初始化 + 调用 initGame
├── index.json    # 页面配置（引用 game-canvas 组件）
├── index.wxss    # HUD 样式
└── game.js       # 从 H5 提取的游戏核心逻辑
```

### Step 4: 接入广告 & 社交

游戏结束时调用 `adManager.showInterstitial()`，显示分享按钮，上报分数到开放数据域。

### Step 5: 测试调优

微信开发者工具调试 → 真机预览 → 性能检查（帧率/内存）→ 触控响应测试。

## 工时预估

| 阶段 | 内容 | 工时 |
|------|------|------|
| 基础设施 | 适配层 + 游戏容器组件 + 广告管理器 + 大厅首页 | 3-4 天 |
| 首款游戏（stack） | 最简单的游戏，跑通全流程验证 | 1 天 |
| 第 2-8 款游戏 | 基础设施就绪后批量转换，每款约 0.5-1 天 | 4-7 天 |
| 2048 DOM→Canvas | 需完全重写渲染层 | 1-2 天 |
| 排行榜 + 分享 | 开放数据域 + 分享卡片生成 | 2-3 天 |
| **合计（第一批 9 款）** | | **约 12-17 天** |

后续批次（第 10-36 款）预计每款 0.5 天，基础设施已就绪可快速复制。
