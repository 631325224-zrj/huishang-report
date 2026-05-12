# 代码审查标准与流程指南

> 本项目：huishang-report 报表应用
> 版本：v1.0
> 日期：2026-05-12

---

## 一、审查目标

1. **减少 Bug 逃逸**：在合并前发现至少 80% 的逻辑错误
2. **降低返工率**：同一类问题不应重复出现
3. **知识传承**：通过审查促进团队技术成长
4. **代码质量**：可读性、可维护性、可测试性

---

## 二、审查分级标准

### 🔴 P0 - 必须修复（阻断级）

| 类别 | 检查项 |
|------|--------|
| **安全** | SQL/代码注入风险、敏感信息泄露、XSS漏洞、未授权访问 |
| **正确性** | 逻辑错误导致功能失效、数据计算错误、边界条件未处理 |
| **稳定性** | 未捕获的异常导致崩溃、Promise 未处理、资源泄漏 |
| **兼容性** | API 破坏性变更、未处理的 null/undefined |

### 🟡 P1 - 应该修复

| 类别 | 检查项 |
|------|--------|
| **可读性** | 函数超过 50 行、嵌套超过 3 层、变量命名不规范 |
| **可维护性** | 重复代码超过 3 处、魔法数字/字符串、硬编码配置 |
| **性能** | N+1 查询、不必要的循环、内存泄漏隐患 |
| **测试** | 核心业务逻辑缺少单元测试 |

### 💭 P2 - 建议改进

| 类别 | 检查项 |
|------|--------|
| **风格** | 代码格式不一致、缺少 JSDoc 注释 |
| **最佳实践** | 可以用更现代的语法/API简化 |
| **文档** | 复杂逻辑缺少解释 |

---

## 三、PR 审查流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   开发完成   │───▶│  开发者自检  │───▶│   提交 PR   │───▶│  自动化检查  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   合并代码   │◀───│  审查通过   │◀───│  审查者评审  │◀───│  静态分析   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 3.1 开发者自检清单（提交前必须确认）

- [ ] 代码通过 ESLint/JSHint 检查
- [ ] 新增函数/模块有 JSDoc 注释
- [ ] 异步代码（async/await/Promise）有完整的 .catch() 或 try-catch
- [ ] 没有 console.log/console.warn 遗留（调试代码）
- [ ] 敏感信息（Token、密钥）不提交到代码库
- [ ] 相关的单元测试已添加/更新
- [ ] 变更范围不超过 500 行（超出需要拆分子任务）

### 3.2 审查者职责

1. **必须检查项**：P0 级别全部通过
2. **应该检查项**：P1 级别给出修改建议
3. **可选检查项**：P2 级别仅建议
4. **审查时间**：一般 PR 24 小时内完成，紧急情况 4 小时内

### 3.3 合并条件

- ✅ 所有 P0 问题已修复
- ✅ 至少 1 人 approve
- ✅ CI/CD 流水线通过
- ✅ 审查者无 blocker 意见

---

## 四、本项目专项检查清单

针对 huishang-report 报表应用的特定问题：

### 4.1 异步数据加载

```javascript
// ❌ 错误：Promise 缺少 catch
Promise.all(promises).then(() => { ... });

// ✅ 正确：完整的错误处理
Promise.all(promises)
  .then(() => { ... })
  .catch(err => { ... });

// ✅ 或者使用 try-await
try {
  await asyncOperation();
} catch (e) {
  // 必须有错误处理逻辑
}
```

### 4.2 API 调用规范

- [ ] 所有 fetch/axios 调用设置 timeout（建议 12 秒）
- [ ] 所有 API 调用在 catch 中记录错误日志
- [ ] 敏感配置（Token、API URL）从环境变量读取
- [ ] 避免在循环中发起 API 调用（使用 batch 或 queue）

### 4.3 状态管理

- [ ] 状态变更有清晰的日志（debug 模式）
- [ ] 状态依赖明确，避免隐式依赖
- [ ] 状态重置逻辑完整（防止内存泄漏）

### 4.4 缓存策略

- [ ] localStorage/sessionStorage 写入前检查容量
- [ ] 缓存版本管理（用于升级时清理旧数据）
- [ ] 缓存 key 命名规范（避免冲突）

### 4.5 性能问题

- [ ] DOM 操作批量执行（DocumentFragment）
- [ ] 避免在 render 中进行数据计算（预处理）
- [ ] 事件监听器及时移除（防止内存泄漏）
- [ ] 大数据集合渲染使用虚拟滚动

---

## 五、常见问题模式与修复

### 5.1 Promise 地狱

```javascript
// ❌ 回调地狱
doSomething().then(() => {
  doAnother().then(() => {
    doMore().then(() => { ... });
  });
});

// ✅ async/await 扁平化
async function process() {
  await doSomething();
  await doAnother();
  await doMore();
}
```

### 5.2 变量提升与 TDZ

```javascript
// ❌ 错误：在声明前使用 let 变量
function foo() {
  console.log(x); // ReferenceError
  let x = 1;
}

// ✅ 正确：先声明后使用
function foo() {
  let x = 1;
  console.log(x);
}
```

### 5.3 循环中的异步

```javascript
// ❌ 错误：期望顺序执行但实际并发
for (const item of items) {
  await process(item); // 实际是串行的！
}

// ✅ 如需并发控制
const batches = [];
for (let i = 0; i < items.length; i += 10) {
  batches.push(items.slice(i, i + 10));
}
for (const batch of batches) {
  await Promise.all(batch.map(item => process(item)));
}
```

---

## 六、审查评论模板

### 🔴 Blocker（阻断）
```
🔴 **[问题类型]**
位置：第 XX 行
描述：...

**影响**：...
**建议**：
- ...
```

### 🟡 Suggestion（建议）
```
🟡 **[建议]**
位置：第 XX 行
描述：...

**建议**：...
**理由**：...
```

### 💭 Nit（微小改进）
```
💭 **[nit]**
位置：第 XX 行
描述：...
```

### ✅ Praise（表扬）
```
✅ **亮点**
位置：第 XX 行
描述：这部分处理得很好，因为...
```

---

## 七、自动化工具配置

### 7.1 ESLint 配置

```json
{
  "rules": {
    "no-console": "warn",
    "no-debugger": "error",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": "error",
    "no-unused-vars": "error",
    "no-implicit-globals": "warn",
    "strict": ["error", "global"]
  }
}
```

### 7.2 Git Hooks

```bash
#!/bin/bash
# .git/hooks/pre-commit

# 检查 ESLint
npx eslint src/ --quiet
if [ $? -ne 0 ]; then
  echo "❌ ESLint 检查失败"
  exit 1
fi

# 检查 console.log
if grep -r "console\.log" src/; then
  echo "⚠️ 发现 console.log，请使用 console.warn 或移除"
  exit 1
fi

echo "✅ Pre-commit 检查通过"
```

---

## 八、审查效率建议

1. **小步提交**：每次 PR 不超过 400 行
2. **描述清晰**：PR 描述包含「改了什么」「为什么改」「怎么测试」
3. **截图/动画**：UI 变更附带截图
4. **自测记录**：在 PR 中说明已通过的手动测试场景

---

## 九、附录：错误模式索引

| 错误模式 | 发现次数 | 预防措施 |
|----------|----------|----------|
| Promise 未 catch | 3 | ESLint + 培训 |
| TDZ 引用 | 1 | ESLint + 代码检查 |
| API 超时 | 2 | 设置 timeout |
| 缓存未失效 | 2 | 缓存版本管理 |
| 数据重复累加 | 2 | 单元测试 |

---

*本指南由 Code Reviewer Agent 生成
更新日期：2026-05-12*
