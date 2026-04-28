# WorkBuddy 长期记忆

## 张先生项目配置模板

### GitHub Pages 静态网站部署配置

**适用场景**：需要部署静态网页（H5报表、数据可视化等）到 GitHub Pages

**配置步骤**：

1. **创建仓库** - 在 GitHub 创建空仓库（不要勾选 README）
2. **本地初始化** - `git init` + `git remote add origin HTTPS URL`
3. **配置永久认证** - `git config --global credential.helper osxkeychain`
4. **GitHub 生成 Personal Access Token** - 永久有效，勾选 repo
5. **首次推送** - 推送后启用 GitHub Pages

---

### 已有项目配置

| 项目 | 仓库 | 部署地址 |
|------|------|----------|
| 回收数据报表 | 631325224-zrj/huishang-report | https://631325224-zrj.github.io/huishang-report |

---

## huishang-report 报表项目 - 关键里程碑

### 🎯 里程碑1（2026-04-03）：纯收金额字段修复

**问题**：报表显示的是"营收"数据，而不是"纯收金额"

**根本原因**：API 返回的数据结构不同于预期

**解决方案**：找到了正确的字段路径：
- **纯收金额**：`data.List.income.incomeTotal`
- **非收入金额**：`data.List.notIncome.notIncomeTotal`
- **实收（营业收入）**：`data.List.businessData.last`
- **应收（营业额）**：`data.List.businessData.orig`
- **优惠金额**：`data.List.businessData.discTotal`

**验证公式**：
- `应收 - 优惠 = 实收`
- `实收 - 非收入 = 纯收`

**代码位置**：`index.html` 的 `fetchShopData` 函数

---

### 🎯 里程碑2（2026-04-09）：月度汇总 API 选型修复 ✅

**问题**：月度汇总数据和文档始终差 80~251 元，无法消除

**根本原因**（历经多次错误后才找到）：
1. 最初用 `getserialdata` API + `last_total - not_income_money` → 有细微差异
2. 改用 `item_income_total` → 数据不正确
3. 改回 `last_total - not_income_money` → 差异依旧
4. **最终发现**：`getserialdata` API 口径 ≠ `getBusinessSituation` API 口径

**正确方案**：月度汇总（月维度数据）也必须用 `getBusinessSituation` API
- 代码位置：`queryMonthBillList` 函数（第410行附近）
- 纯收字段：`income.incomeTotal`（与日数据完全相同）
- 字段路径：`data.List.income.incomeTotal`

**教训**：不能用账单明细 API（`getserialdata`）来汇总月度数据，两个 API 数据源口径不同。

---

## 收银系统 API 数据结构（huiShang）

```json
{
  "data": {
    "List": {
      "income": {
        "incomeTotal": 938.00,      // 纯收金额
        "incomeList": [...]
      },
      "notIncome": {
        "notIncomeTotal": 0.00,    // 非收入金额
        "notIncomeList": []
      },
      "businessData": {
        "orig": 1851.50,           // 应收（营业额）
        "discTotal": 913.50,       // 优惠金额
        "last": 938.00,            // 实收（营业收入）
        ...
      }
    }
  }
}
```

---

## 用户偏好

- 张先生主要做项目管理工作
- 常用场景：数据可视化报表、H5页面开发
- 沟通方式：语音转文字
- 期望：AI 自动完成代码修改和部署推送

---

## ⚠️ AI 容易犯的错误（需严格避免）

### 1. 变量声明顺序错误
**问题**：在函数内使用变量时，该变量可能尚未初始化。
**案例**：在 `shopMonthlyData` 初始化前就尝试使用它。
**避免**：修改代码后，用 `read_lints` 检查语法错误；修改逻辑后，用 `read_file` 确认变量在使用前已声明。

### 2. 逐月查询导致超时
**问题**：一次性查询 12 个月 × 31 天 × 28 门店 = 大量请求，导致 `ERR_CONNECTION_TIMED_OUT`。
**避免**：优先使用日数据汇总到月数据（`日数据.slice(0,7)`）；如需历史数据，使用按需加载而非预加载。

### 3. 函数定义位置错误
**问题**：`replace_in_file` 插入新代码时，可能破坏原有函数的闭合或插入到函数体内。
**案例**：`calcChange = (a, b) => {` 后直接插入新代码，导致函数体被截断。
**避免**：插入代码前，先读取目标区域上下文，确认插入点；插入后检查函数是否正确闭合。

### 4. 变量遮蔽
**问题**：在同作用域内用 `const` 重新声明同名变量（如 `const monthlyData = {}` 出现两次），导致第一个声明被覆盖。
**避免**：搜索文件中是否已存在同名变量，或在插入前确认上下文。

### 5. 数据加载范围不足
**问题**：只加载过去 30 天数据，但月报需要展示完整月份（如 3 月 1-31 日）。
**避免**：加载范围至少覆盖上月完整数据；或使用按需加载补充缺失日期。

### 6. 清零后 key 仍存在导致跳过加载（2026-04-05 新增）
**问题**：将 `monthlyData[key]` 清零后，`key in monthlyData` 仍为 true，导致 ensureMonthData 判断"已加载"而跳过，数据永久显示 0。
**案例**：修复重复累加时清零了 2月数据，但清零后 key 未删除，下次判断 `key in DATA.monthlyData` 为 true 直接跳过加载。
**解决方案**：用独立的 `loadedMonths` Set 记录"已完整加载"状态，不依赖数据值/key存在来判断是否加载过。

### 8. localStorage 脏缓存 key 错误（2026-04-08 新增）
**问题**：bug 期间把错误年份的 key（如 `2025-03` 实为 `2026-03`）写入了 localStorage，后续刷新从缓存读到错误数据。
**解决方案**：`lsRestoreMonths` 加校验逻辑：年份须在 onlineYear~curYear 范围内，不能是未来月份，格式须为 `YYYY-MM`。发现非法 key 自动从 localStorage 删除。

### 11. 历史年份月度数据为0（getserialdata 超时）（2026-04-15 新增）
**问题**：年报点击后，2025年所有门店数据显示0.00。
**根本原因**：`queryMonthBillList` 使用 `getserialdata` 逐天逐页查询，历史年份每月需31天×28门店×多页 = 千次以上请求，全部超时。
**解决方案**：改用 `getBusinessSituation`（`dateType=2` 月维度），每门店只需1次请求，直接返回整月 `income.incomeTotal`，数据口径与日数据完全一致。缓存版本升级 v6→v7。
**教训**：月度/年度查询不能用明细 API（getserialdata），必须用 `getBusinessSituation`。
- `dateType=3`（月维度）：仅对**当前年（2026）** 有效，返回整月数据；对**历史年（2025）** 只返回月初1天数据（约14825元/天）
- `getBusinessSituation beginDate/endDate`：**历史年不支持**此参数组合
- **`getserialdata`**：历史年唯一正确的 API，纯收公式 = `last_total - not_income_money`（实收-非收入），不能用 `income` 字段！
- `getserialdata dateType=3`：**也不支持整月**，等同月初1天数据，无效
- 当前代码 `queryMonthBillList` 已按此逻辑分叉：2026年用 dateType=3，2025年用 getserialdata 逐天查（8天/批，300ms间隔）
- `ensureYearData`：改为月份串行队列（2个并发 worker），避免12月×28门店全部同时发起请求超时


**问题**：初始化第一阶段从 localStorage 恢复历史月份数据（`lsRestoreMonths`），第三阶段预加载又对同一月份发 API 请求并累加，导致年度数据比收银系统偏大（2025 年各门店数据约偏大 2,100 元）。
**解决方案**：预加载前后各检查一次 `loadedMonths.has(pk)`，已加载则跳过，不再重复累加。
**配合升级**：缓存版本 v5→v6，强制清除脏数据。
**问题**：初始 `STATE.compare='yoy'`，`STATE.yearB=2025`，`render()` 触发 `ensureMonthData(2025, month)`，API 不支持真实历史年份，实际返回当前月数据，被存入 `2025-XX` 错误 key，导致数据混乱。
**解决方案**：
1. `ensureMonthData` 头部增加年份校验：年份须 `>= onlineYear` 且 `<= 当前年`，否则跳过
2. `render()` 里同比（yoy）模式不触发 `ensureMonthData`，只有环比（mom）才触发
**教训**：API 只能查询系统上线后的数据，调用前必须校验年份合法性。

### 7. 数据重复累加（2026-04-05 新增）
**问题**：初始加载已包含某月部分数据，ensureMonthData 加载完整月份时未清除旧数据，导致累加变大。
**案例**：初始 35 天数据包含 2 月 6-28 日，ensureMonthData 加载完整 2 月时再次累加，导致数值偏大（如 1374131 而非 692168）。
**避免**：ensureMonthData 加载前必须先清零该月所有相关数据（monthlyData、yearlyData、shopMonthlyData、shopYearlyData）再重新聚合。

### 12. getServiceArea centerId 参数含义（2026-04-16 新增）
**问题**：调用 `getServiceArea` 时只传了门店 centerId，返回 -400003（token 无效）。
**根本原因**：`centerId` 参数是**餐饮集团ID**（247412），不是门店 ID。`shopId` 才是门店的 centerId（可选参数）。
**正确用法**：`getServiceArea?centerId=247412&shopId={门店centerId}&pageNo=1&pageSize=200`
**教训**：`getServiceArea` 和 `getBusinessSituation` 参数规范相同：`centerId` = 集团总部 ID，`shopId` = 门店自身 centerId。

---

### 最佳实践
1. **每次修改后立即运行 `read_lints`** 检查语法错误
2. **修改逻辑前先读取上下文**，确认变量声明顺序和作用域
3. **复杂修改分步进行**，每步验证后再继续
4. **添加诊断日志**（`console.log`），帮助定位问题
