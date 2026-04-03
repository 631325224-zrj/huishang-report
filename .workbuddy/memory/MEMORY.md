# WorkBuddy 长期记忆

## 张先生项目配置模板

### GitHub Pages 静态网站部署配置

**适用场景**：需要部署静态网页（H5报表、数据可视化等）到 GitHub Pages

**配置步骤**：

1. **创建仓库**
   - 在 GitHub 创建空仓库（不要勾选 README）
   - 仓库名：如 `huishang-report`

2. **本地初始化**
   ```bash
   cd ~/WorkBuddy/项目名
   git init
   git remote add origin https://github.com/用户名/仓库名.git
   ```

3. **配置永久认证（避免每次输入 Token）**
   ```bash
   # 配置 Credential Helper 保存到 macOS 钥匙串
   git config --global credential.helper osxkeychain
   
   # 切换到 HTTPS（比 SSH 更稳定）
   git remote set-url origin https://github.com/用户名/仓库名.git
   ```

4. **GitHub 生成 Personal Access Token**
   - 打开 https://github.com/settings/tokens
   - 点 **Generate new token (classic)**
   - Note：填写说明如 `项目名 deploy`
   - Expiration：选择 **No expiration**（永久有效）
   - Scopes：勾选 `repo`
   - 生成后复制保存

5. **首次推送**
   ```bash
   git add .
   git commit -m "initial"
   git push
   # 用户名：GitHub 用户名
   # 密码：粘贴 Token
   ```

6. **启用 GitHub Pages**
   - 仓库 Settings → Pages
   - Source：选择 `main` 分支和 `/ (root)`
   - 保存后等待 1-2 分钟

7. **访问地址**
   - `https://用户名.github.io/仓库名`

---

### 已有项目配置

| 项目 | 仓库 | 部署地址 |
|------|------|----------|
| 回收数据报表 | 631325224-zrj/huishang-report | https://631325224-zrj.github.io/huishang-report |

### 常用命令

```bash
# 修改代码后推送
cd ~/WorkBuddy/Claw && git add . && git commit -m "更新说明" && git push

# 查看状态
git status

# 查看提交历史
git log --oneline
```

---

## 用户偏好

- 张先生主要做项目管理工作
- 常用场景：数据可视化报表、H5页面开发
- 沟通方式：语音转文字
- 期望：AI 自动完成代码修改和部署推送
