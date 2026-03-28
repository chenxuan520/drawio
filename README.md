# drawio fork

这是一个基于 draw.io / diagrams.net 改出来的私有版本，当前主要改动是把默认的第三方云存储入口收敛成 WebDAV 文件管理。

## 当前改动

### 1. Open From 菜单调整

`File -> Open From` 里目前保留和新增的入口如下：

- `WebDAV...`
- `Trello...`
- `Browser...`
- `Device...`
- `URL...`

已经移除的入口：

- Google Drive
- Dropbox
- GitHub
- OneDrive
- Microsoft 365
- GitLab

### 2. WebDAV 文件管理

点击 `WebDAV...` 后：

- 先填写 WebDAV 地址、用户名、密码
- 配置会缓存到本地浏览器
- 登录成功后显示远端 `.drawio` 文件列表
- 支持搜索文件
- 支持打开文件到当前画布
- 支持重命名
- 支持删除（带二次确认）
- 支持创建空白 `.drawio` 文件

### 3. 文件行为

- 只显示 `.drawio` 文件
- 打开文件时直接复用当前 tab
- 文件名会自动解码显示，空格不会显示成 `%20`
- 已接入保存流程，可继续保存回 WebDAV

## 相关文件

本次 fork 里和 WebDAV 相关的主要文件：

- `js/diagramly/WebdevClient.js`
- `js/diagramly/WebdevFile.js`
- `js/diagramly/WebdevPatch.js`
- `js/bootstrap.js`
- `js/diagramly/Devel.js`

## GitHub Actions

### Release

仓库包含自动发布工作流：`.github/workflows/release.yml`

触发方式：

- push 一个匹配 `v*` 的 tag
- 例如：`v1.0.0`

示例：

```bash
git tag v1.0.0
git push origin v1.0.0
```

push 后会自动创建 GitHub Release，并自动生成 release notes。

### CI

仓库包含基础 CI 工作流：`.github/workflows/ci.yml`

当前会在以下场景自动运行：

- `push`
- `pull_request`

当前检查内容：

- `js/` 目录下所有非 `.min.js` 文件的 JavaScript 语法检查
- `js/embed.dev.js` 和 `js/diagramly/Embed.js` 这两个历史模板文件默认跳过检查（结尾由外部替换补全）

## 后续可继续补的内容

如果后面还需要，可以继续补：

- release 附件打包上传
- 更完整的项目构建流程
- WebDAV 目录层级浏览
- 更细的前端样式整理
