# 徽商故里·经营数据看板 项目总结

> 项目周期：2026-03 至 2026-05
> 项目地址：https://631325224-zrj.github.io/huishang-report/
> 仓库：631325224-zrj/huishang-report

---

## 一、项目概述

**目标**：为徽商故里（28家门店）搭建经营数据看板，支持日报/月报/年报/出租率四维分析。

**技术栈**：纯前端单页 HTML + JavaScript，无需后端，通过收银系统 API（huiShang）获取数据。

**部署**：GitHub Pages，支持 URL 直接访问。

---

## 二、核心功能模块

### 2.1 四大报表维度

| 维度 | 说明 |
|------|------|
| 日报 | 近7天每日纯收金额，支持图表可视化 |
| 月报 | 近12个月每月纯收，支持同比/环比切换 |
| 年报 | 各年度汇总，支持同比/环比切换 |
| 出租率 | 包间预订率统计，含午市/晚市分时段 |

### 2.2 筛选功能
- 区域筛选（北京/黄山/深圳）
- 门店筛选（28家门店独立查询）
- 日期/月份/年份选择
- 同比/环比切换

### 2.3 出租率计算规则

```
出租率 = (预订数 + Walkin包间数) / 总包间数
```

- **预订数**：从 `getBookOrderDetailData` 获取
  - 今天：计入 `已执行` + `未执行`
  - 历史日期：只计入 `已执行`
- **Walkin 包间**：从 `getserialdata` 获取
  - 排除 `order_type=2`（预订单）
  - 排除续单（`is_continued_bill` 为显式假值）
  - 只算包间（排除含数字/字母/外/盒/宴的名称）
- **总包间**：从 `getServiceArea` 获取，串行查询（并发=1）
- **市别判断**：按 `open_time` 小时 <16 → 午市，≥16 → 晚市

---

## 三、API 数据结构

### 3.1 getBusinessSituation（账单汇总）

```javascript
// 参数：centerId=集团总部ID, shopId=门店centerId, beginDate/endDate, dateType=1
{
  data: {
    List: {
      income: { incomeTotal: 938.00 },           // 纯收金额 ✅
      notIncome: { notIncomeTotal: 0.00 },       // 非收入金额
      businessData: {
        orig: 1851.50,    // 应收（营业额）
        discTotal: 913.50, // 优惠金额
        last: 938.00       // 实收（营业收入）
      }
    }
  }
}
```

**关键公式**：`应收 - 优惠 = 实收`，`实收 - 非收入 = 纯收`

### 3.2 getserialdata（账单明细）

```javascript
// 参数：centerId, shopId, beginDate/endDate, dateType=1
{
  data: {
    List: [
      {
        order_type: '1',          // 1=普通, 2=预订
        point_name: '包间A',       // 包间名称
        open_time: '14:30:00',    // 开台时间
        is_continued_bill: false,  // 是否续单
        income: 500.00
      }
    ]
  }
}
```

### 3.3 getServiceArea（包间数）

```javascript
// 参数：centerId=247412(集团总部), shopId=门店centerId
{
  data: {
    List: [
      { area_name: '包间A', ... },
      { area_name: '包间B', ... }
    ]
  }
}
```

---

## 四、关键里程碑

### 里程碑1（2026-04-03）：纯收金额字段修复 ✅

**问题**：报表显示的是"营收"数据，而不是"纯收金额"

**根因**：API 返回的数据结构不同于预期

**解决方案**：找到了正确的字段路径：
- **纯收金额**：`data.List.income.incomeTotal`
- **非收入金额**：`data.List.notIncome.notIncomeTotal`
- **实收（营业收入）**：`data.List.businessData.last`
- **应收（营业额）**：`data.List.businessData.orig`
- **优惠金额**：`data.List.businessData.discTotal`

---

### 里程碑2（2026-04-09）：月度汇总 API 选型修复 ✅

**问题**：月度汇总数据和文档始终差 80~251 元，无法消除

**根因**：不能用账单明细 API（`getserialdata`）来汇总月度数据，两个 API 数据源口径不同

**正确方案**：月度汇总（月维度数据）也必须用 `getBusinessSituation` API
- 参数：`beginDate/endDate + dateType=1`
- 纯收字段：`income.incomeTotal`

---

### 里程碑3（2026-04-15）：历史年份月度数据加载 ✅

**问题**：2025年度数据查询返回0

**API 支持范围**：
- `getBusinessSituation dateType=1 + beginDate/endDate`：返回**整月汇总** ✅
- `getBusinessSituation dateType=2 + settleDate`：返回**单日数据** ❌

**最终方案**：用 `getBusinessSituation beginDate/endDate + dateType=1`，28门店每月只需28次请求

---

### 里程碑4（2026-04-16）：getServiceArea 参数修复 ✅

**问题**：调用 `getServiceArea` 时只传了门店 centerId，返回 -400003（token 无效）

**根因**：`centerId` 参数是**餐饮集团ID**（247412），不是门店 ID

**正确用法**：`getServiceArea?centerId=247412&shopId={门店centerId}`

---

### 里程碑5（2026-05-07）：预加载双重累加 Bug 修复 ✅

**问题**：年度数据显示约1.58亿，偏大约15倍

**根因**：预加载循环中同时写本地变量和全局对象，两者引用相同导致叠加两倍

**修复**：预加载只写本地变量，不重复写 `DATA.*`

---

### 里程碑6（2026-05-19）：出租率续单判断修复 ✅

**问题**：朝阳店晚市显示24（正确值为22，多2条）

**根因**：续单判断用 `is_continued_bill === true`，漏掉了字符串 `"1"` 等格式

**正确判断**：
```javascript
const icb = b.is_continued_bill;
if (icb != null && icb !== false && icb !== '' && icb !== 'false' && icb !== 'F' && icb !== 0 &&
    String(icb).trim().toLowerCase() !== 'false' && String(icb) !== '0') return; // 续单排除
```

---

### 里程碑7（2026-05-20）：月度汇总 income=0 警告过滤 ✅

**问题**：新门店上线前月份 income=0，控制台大量警告

**修复**：在 SHOPS 配置中增加 `onlineDate` 字段，查询时跳过上线前月份

---

### 里程碑8（2026-05-20）：出租率预订过滤日期区分 ✅

**问题**：今天出租率统计漏掉"未执行"预订

**修复**：
- 今天：计入 `已执行` + `未执行`
- 历史日期：只计入 `已执行`

---

### 里程碑9（2026-05-20）：全局加载整合出租率预加载 ✅

**问题**：有缓存时页面先呈现，出租率还在后台加载

**修复**：
- `loadAllData()` 增加第四阶段：预加载出租率
- 有缓存时也等 `loadAllData()`（含出租率）完成后才呈现页面
- 效果：切到出租率 Tab 时数据已就绪

---

## 五、架构设计

### 5.1 加载流程（四阶段）

```
Phase 1: 近7天日数据（7×28=196次API，5并发）
Phase 2: 当月全部门店汇总（28次API，5并发）
Phase 3: 本年+去年所有月份（分3批，每批3个月，3并发）
Phase 4: 当日出租率数据（28次API，串行）
```

### 5.2 缓存机制

| 类型 | 存储位置 | 说明 |
|------|----------|------|
| 月度数据 | localStorage | key=`month_{YYYY-MM}`，含门店明细 |
| 已加载标记 | localStorage | `loadedMonths` Set，避免重复加载 |
| 出租率数据 | 内存 | `OCC_DATA`，仅当前会话有效 |

### 5.3 Token 管理

- 自动刷新：token 失效时自动刷新并重试
- 重试策略：最多3次，间隔2秒
- 错误码：`401/403/-400004/-400003/-400002/-400001`

---

## 六、门店配置

### 6.1 门店列表（28家）

| 门店 | 区域 | centerId | 上线日期 |
|------|------|----------|----------|
| 徽商故里朝阳门店 | 北京 | 247413 | 2025-06 |
| 徽商故里安贞店 | 北京 | 247414 | 2025-06 |
| 徽商故里万丰店 | 北京 | 247415 | 2025-06 |
| ... | ... | ... | ... |
| 徽商故里仙人洞店 | 黄山 | 247439 | 2026-02 |

### 6.2 新增门店配置

在 `ALL_SHOPS` 数组中添加：
```javascript
{ name: '新店名', region: '区域', centerId: ID, onlineDate: 'YYYY-MM' }
```

---

## 七、常见问题排查

### 7.1 数据为0
1. 检查 Token 是否有效（F12 → Console）
2. 检查 API 返回状态码
3. 确认日期范围是否正确

### 7.2 出租率异常
1. 查看控制台诊断日志 `[出租率合计]`
2. 确认包间数是否正确（`getServiceArea`）
3. 检查预订过滤条件是否正确

### 7.3 加载缓慢
- 首次加载约需 2-3 分钟（28门店×24个月）
- 有缓存后约需 30 秒（仅刷新最新数据）
- 出租率加载约需 1-2 分钟（串行查询28门店）

---

## 八、后续项目参考

### 8.1 项目模板

新建类似项目时，可参考本项目的：
1. **数据结构设计**：`DATA` 对象统一管理所有状态
2. **加载策略**：分阶段加载 + 缓存 + 并发控制
3. **缓存机制**：localStorage 存月度数据，`loadedMonths` Set 避免重复
4. **错误处理**：Token 刷新重试、API 错误码识别

### 8.2 API 调用规范

1. **centerId 参数**：集团总部 ID（如247412），不是门店 ID
2. **shopId 参数**：门店的 centerId
3. **dateType**：1=整月汇总，2=单日数据
4. **字段路径**：纯收金额 `income.incomeTotal`，不是 `businessData.last`

### 8.3 GitHub Pages 部署

1. 创建仓库，配置 GitHub Pages
2. `git push` 自动部署
3. 访问 `https://{username}.github.io/{repo}/`

---

## 九、版本历史

| 版本 | 日期 | 主要内容 |
|------|------|----------|
| v26-fix2 | 2026-05-07 | 回滚 dateType=1，修复双重累加 Bug |
| v26-fix3 | 2026-05-19 | 出租率续单判断修复 |
| v26-fix4 | 2026-05-20 | 警告过滤、预订过滤、全局加载整合 |

---

*文档生成时间：2026-05-20*
