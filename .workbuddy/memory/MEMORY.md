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

### 7. 数据重复累加（2026-04-05 新增）
**问题**：初始加载已包含某月部分数据，ensureMonthData 加载完整月份时未清除旧数据，导致累加变大。
**案例**：初始 35 天数据包含 2 月 6-28 日，ensureMonthData 加载完整 2 月时再次累加，导致数值偏大（如 1374131 而非 692168）。
**避免**：ensureMonthData 加载前必须先清零该月所有相关数据（monthlyData、yearlyData、shopMonthlyData、shopYearlyData）再重新聚合。

---

### 最佳实践
1. **每次修改后立即运行 `read_lints`** 检查语法错误
2. **修改逻辑前先读取上下文**，确认变量声明顺序和作用域
3. **复杂修改分步进行**，每步验证后再继续
4. **添加诊断日志**（`console.log`），帮助定位问题
