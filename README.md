# Bot Workbench

**给 Tobs Bot 模式用的开源 3D 工作台。**

实时 Bot 状态、角色卡、项目协作、会议纪要、定时任务，以及一个会动、会吃零食、会溜达的 3D 办公室。

完全开源、免费、无遥测。只读 Tobs 本地数据，不写数据库。

![霓虹夜航](docs/screenshots/office-neon.png)

## 功能

- **3D 办公室**：13 个 Bot、楼层、工位、会议室、休息区
- **实时状态**：在忙 / 开会 / 等你 / 卡住 / 休息、当前任务、token 用量
- **角色卡**：堆叠展开，打开私聊、邀请到会议室
- **项目**：项目群、永久/临时成员、任务板
- **会议**：临时群、纪要、模型选择
- **定时任务**：查看、删除
- **五套风格**：晨曦纸鸢 / 霓虹夜航 / 森之秘语 / 水墨云游 / 山河朱阙
- **昼夜自定义**：自动、白天、黑夜
- **360 全景**：可粘贴/选择自己的等距柱状全景图作为背景
- **休息区动作**：睡觉、吃零食、喝咖啡、看书、伸懒腰、溜达
- 3D 渲染全部本地打包，不依赖 CDN

![晨曦纸鸢](docs/screenshots/office-dawn.png)

![森之秘语](docs/screenshots/office-moss.png)

## 安装

需要：

- DeepSeek Harness（DSH）
- Tobs `@botharness/tobs` 1.6.x
- Bot 模式里有 Bot

### 方式一：GitHub Releases（推荐）

1. 从 Releases 下载 `bot-workbench-0.1.0.tgz`
2. 在 DSH profile 目录安装：

```bash
pnpm add file:/absolute/path/to/bot-workbench-0.1.0.tgz
```

3. 把 `bot-workbench` 加入 profile 的 bundles：

```json
{
  "dsh": {
    "profile": {
      "bundles": ["...", "bot-workbench"]
    }
  }
}
```

4. 重启 DSH。

也可以直接在 DSH 里：

```text
plugin_manager install_bundle
target: file:/absolute/path/to/bot-workbench-0.1.0.tgz
```

### 方式二：从仓库安装

```bash
git clone https://github.com/yangmu-dot/bot-workbench.git
cd <DSH profile directory>
pnpm add file:/absolute/path/to/bot-workbench
```

然后把 `bot-workbench` 加入 bundles，重启 DSH。

## 使用

重启后进入 **Bot 模式**：

- 打开面板菜单 →「监控室」
- 点「办公室」进入 3D 办公室
- 左上角切换风格、昼夜
- 「360 全景」可以粘贴自己的全景图
- 点 Bot 看详情，拖动旋转办公室

## 数据与隐私

- 只读 `~/.dsh/botharness/botharness.db` 和 Bot 会话日志
- 不写 Tobs 数据库
- 不上传数据、不调用外部天气/统计服务
- 会议、项目、设置保存在 `~/.dsh/bot-workbench/`
- 3D 静态资源随插件安装，不请求 CDN

## 目录

```text
index.js                 Host API / 静态资源
client.js                DSH Web 客户端
cordis.patch.yml         bundle 入口
office/                  3D 办公室
  index.html
  src/
  vendor/                本地 Three.js
  styles.css
locale/                  中英文元数据
portraits/               自定义头像
docs/screenshots/        README 截图
```

## 开发

- 改 `index.js` 需要重启 Host
- 改 `client.js` 后刷新页面；客户端插件可能需要重启 DSH
- 改 `office/` 是纯静态资源，关掉办公室重开即可
- 3D 使用 Three.js 0.170，已内置在 `office/vendor/`

## DSH 插件市场

市场条目在 [`market/bot-workbench.yml`](market/bot-workbench.yml)。DSH 社区市场需要公开仓库满 1 天后，向 `awesome-dsh-plugin` 提交收录 PR；审核通过后再由市场索引收录。

## License

MIT。见 [LICENSE](LICENSE)。

截图使用 Demo 数据，不包含真实用户对话或私密内容。
