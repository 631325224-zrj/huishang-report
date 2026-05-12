#!/bin/bash
# 代码审查前置检查脚本
# 用途：pre-commit hook 调用，在提交前自动检查代码质量

set -e

echo "🔍 开始代码审查前置检查..."

# 配置
ESLINT_FILES="index.html src/"
MAX_LINE_COUNT=400

# 1. 检查文件大小（防止单次提交过大）
echo "📏 检查变更规模..."
CHANGED_FILES=$(git diff --cached --name-only)
for file in $CHANGED_FILES; do
  if [ -f "$file" ]; then
    LINES=$(git diff --cached "$file" | grep -c "^+" || true)
    if [ "$LINES" -gt $MAX_LINE_COUNT ]; then
      echo "⚠️  $file 变更 $LINES 行，超过建议值 $MAX_LINE_COUNT 行"
      echo "   建议拆分为多个更小的提交"
    fi
  fi
done
echo "✅ 变更规模检查通过"

# 2. 检查是否有 console.log 遗留（仅检查代码文件，排除文档）
echo "🔎 检查调试代码..."
CODE_FILES=$(echo "$CHANGED_FILES" | grep -E "\.(js|ts|html)$" | tr '\n' ' ' || true)
if [ -n "$CODE_FILES" ]; then
  if grep -n "console\.log" $CODE_FILES 2>/dev/null | grep -v "//.*console\.log" | grep -v "console\.log.*//" > /dev/null; then
    echo "⚠️ 发现 console.log，请替换为 console.warn 或移除："
    grep -n "console\.log" $CODE_FILES 2>/dev/null | grep -v "//.*console\.log" | grep -v "console\.log.*//" | head -5
    echo "❌ Pre-commit 检查失败"
    exit 1
  fi
fi
echo "✅ 无调试代码遗留"

# 3. 检查 Promise 缺少 catch（仅检查代码文件）
echo "🔎 检查 Promise 错误处理..."
CODE_FILES=$(echo "$CHANGED_FILES" | grep -E "\.(js|ts|html)$" | tr '\n' ' ' || true)
PROMISE_ISSUES=""
if [ -n "$CODE_FILES" ]; then
  while IFS= read -r file; do
    while IFS= read -r line; do
      linenum=$(echo "$line" | grep -oE '^[0-9]+')
      # 检查接下来10行内是否有 .catch(
      if ! sed -n "${linenum},$((linenum+10))p" "$file" 2>/dev/null | grep -q "\.catch("; then
        PROMISE_ISSUES="⚠️ $file:$linenum: Promise.then() 后未发现 .catch()"
        break 2
      fi
    done < <(grep -n "\.then(" "$file" 2>/dev/null || true)
  done <<< "$CODE_FILES"
fi

if [ -n "$PROMISE_ISSUES" ]; then
  echo "$PROMISE_ISSUES"
  echo "❌ 发现 Promise 缺少错误处理"
  exit 1
fi
echo "✅ Promise 错误处理检查通过"

# 4. 检查敏感信息（仅检查代码文件）
echo "🔎 检查敏感信息..."
CODE_FILES=$(echo "$CHANGED_FILES" | grep -E "\.(js|ts|html)$" | tr '\n' ' ' || true)
if [ -n "$CODE_FILES" ]; then
  SENSITIVE_PATTERNS="password.*=.*['\"][^'\"]{4,}['\"]\|apiKey.*=.*['\"][^'\"]{8,}['\"]\|secret.*=.*['\"][^'\"]{8,}['\"]"
  if grep -E "$SENSITIVE_PATTERNS" $CODE_FILES 2>/dev/null | grep -v "example\|test\|demo\|YOUR_" | grep -v "//.*" > /dev/null; then
    echo "⚠️ 可能存在敏感信息硬编码，请使用环境变量"
    echo "❌ Pre-commit 检查失败"
    exit 1
  fi
fi
echo "✅ 无敏感信息泄露"

# 5. 检查 TODO/FIXME/HACK（可选）
echo "🔎 检查代码标记..."
TODO_COUNT=$(grep -rn "TODO\|FIXME\|HACK\|XXX" $CHANGED_FILES 2>/dev/null | grep -v "//.*TODO" | wc -l || true)
if [ "$TODO_COUNT" -gt 0 ]; then
  echo "📝 发现 $TODO_COUNT 个代码标记，建议处理后再提交"
  grep -rn "TODO\|FIXME\|HACK\|XXX" $CHANGED_FILES 2>/dev/null | grep -v "//.*TODO" | head -5
fi

echo ""
echo "✅ 代码审查前置检查全部通过！"
echo ""
echo "💡 提示：完整的代码审查请在 GitHub/GitLab PR 中进行"
echo "📖 查看代码审查指南：.codebuddy/CODE_REVIEW_GUIDE.md"
