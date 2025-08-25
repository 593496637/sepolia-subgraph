# Subgraph 代码质量工具指南

## 📋 概述

本项目已配置了完整的代码质量检查工具链，包括 ESLint 和 Prettier，专门针对 The Graph Subgraph 开发进行了优化。

## 🛠️ 已安装的工具

### ESLint
- **@typescript-eslint/parser**: TypeScript 解析器
- **@typescript-eslint/eslint-plugin**: TypeScript 专用规则
- **eslint-config-prettier**: 与 Prettier 兼容的配置

### Prettier
- **prettier**: 代码格式化工具
- 配置文件：`.prettierrc.json`
- 忽略文件：`.prettierignore`

## 📝 可用的脚本命令

### Lint 相关命令

```bash
# 检查代码问题（只检查，不修复）
pnpm lint:check

# 检查并自动修复代码问题
pnpm lint

# 检查代码格式（只检查，不修复）
pnpm format:check

# 自动格式化代码
pnpm format

# 运行完整的代码质量检查（lint + format + typecheck）
pnpm code-quality

# 一键修复所有可修复的问题（lint + format）
pnpm fix
```

### 示例用法

```bash
# 开发前检查代码质量
pnpm code-quality

# 提交前自动修复问题
pnpm fix

# 单独运行不同的检查
pnpm lint:check      # 只检查语法问题
pnpm format:check    # 只检查格式问题
pnpm typecheck       # 只检查类型问题
```

## ⚙️ 配置说明

### ESLint 配置 (eslint.config.js)

**针对 AssemblyScript 的特殊优化**：
- 禁用了不兼容的 TypeScript 规则（如 `import type`）
- 配置了 The Graph 特有的全局变量（`BigInt`, `log`, `Address` 等）
- 优化了错误级别，开发友好

**主要规则**：
- ✅ 强制使用 `===` 而不是 `==`
- ✅ 禁止未使用的变量（以 `_` 开头的除外）
- ✅ 要求函数返回类型注解
- ✅ 统一的代码风格（缩进、引号、分号等）

### Prettier 配置 (.prettierrc.json)

**格式化规则**：
- 🎯 每行最大 100 字符
- 🎯 使用 2 个空格缩进
- 🎯 使用双引号
- 🎯 语句末尾使用分号
- 🎯 对象花括号内添加空格

**文件类型支持**：
- TypeScript (`.ts`)
- JSON (`.json`) 
- GraphQL (`.graphql`)
- YAML (`.yaml`)
- Markdown (`.md`)

## 🚫 忽略的文件

以下文件/目录会被自动忽略：
- `build/` - 编译输出
- `generated/` - The Graph 生成的类型文件
- `node_modules/` - 依赖包
- `abis/*.json` - ABI 文件（工具生成）

## 🔧 IDE 集成

### VS Code
1. 安装扩展：
   - ESLint
   - Prettier - Code formatter
   
2. 在 VS Code 设置中启用：
   ```json
   {
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "eslint.autoFixOnSave": true
   }
   ```

### 其他编辑器
大多数现代编辑器都支持 ESLint 和 Prettier 插件，请查阅相应文档。

## 🚀 工作流建议

### 开发流程
1. **编写代码**
2. **保存时自动格式化**（IDE 配置）
3. **提交前运行**: `pnpm fix`
4. **部署前运行**: `pnpm code-quality`

### CI/CD 集成
可以在 GitHub Actions 或其他 CI 工具中添加：
```yaml
- name: 代码质量检查
  run: |
    cd subgraph
    pnpm install
    pnpm code-quality
```

## 🛡️ AssemblyScript 特殊考虑

由于 The Graph 使用 AssemblyScript 编译，配置中做了以下调整：

1. **禁用不兼容的 TypeScript 规则**
   - `@typescript-eslint/consistent-type-imports: 'off'`
   
2. **添加 AssemblyScript 全局变量**
   - `BigInt`, `BigDecimal`, `Address`, `Bytes`, `log`, `ethereum`
   
3. **允许必要的语法**
   - 非空断言 (`!`) - AssemblyScript 中常用
   - console 使用 - 用于 `log.info` 等调试

## ❗ 常见问题

### Q: ESLint 报告 "Cannot find module" 错误
A: 运行 `pnpm codegen` 生成类型文件后再检查

### Q: Prettier 格式化后代码无法编译
A: 检查是否修改了 AssemblyScript 特殊语法，可能需要手动调整

### Q: 如何添加自定义规则？
A: 修改 `eslint.config.js` 中的 `rules` 部分

### Q: 如何忽略特定文件？
A: 在 `eslint.config.js` 的 `ignores` 数组中添加路径模式

## 📈 代码质量指标

运行 `pnpm code-quality` 成功表示：
- ✅ 无 ESLint 错误
- ✅ 代码格式符合 Prettier 标准  
- ✅ TypeScript 类型检查通过
- ✅ The Graph 编译成功

这确保了高质量、一致性的代码，便于团队协作和项目维护。