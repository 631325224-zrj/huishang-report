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
