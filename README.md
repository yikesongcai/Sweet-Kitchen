<img width="378" height="783" alt="image" src="https://github.com/user-attachments/assets/e293c9fb-c379-4437-9ab2-f2db97b8ba3c" /># 🍽️ Sweet's 专属点单小程序

为你的另一半打造的专属点单系统 💕
<img width="367" height="778" alt="image" src="https://github.com/user-attachments/assets/9bfe6730-5c83-4016-8b1f-4474d746e9be" />
<img width="405" height="782" alt="image" src="https://github.com/user-attachments/assets/0f1678e4-ac0e-4460-a483-27d0a6145a4f" />
<img width="373" height="784" alt="image" src="https://github.com/user-attachments/assets/cdcf9597-e86b-4a7e-bce0-d304766fb940" />
<img width="378" height="783" alt="image" src="https://github.com/user-attachments/assets/58fdcfa3-1e54-462b-b53f-8d78ca56fbff" />
<img width="381" height="787" alt="image" src="https://github.com/user-attachments/assets/f29873b4-24c9-42cc-b527-93d523b60d30" />


## ✨ 功能特性

- 🛒 **点单** — 分类浏览菜单，一键选菜，支持随机推荐
- 💌 **消息** — 查看点单状态更新，聊天气泡风格展示
- 📋 **历史** — 历史点单记录，一键"再来一单"，趣味统计
- 👨‍🍳 **厨师端** — 接单管理、状态更新、消息回复
- 🎲 **随机推荐** — 解决选择困难症
- 💖 **心情标签** — 点单时附带心情 emoji

## 📦 项目结构

```
sweet-order/
├── miniprogram/           # 小程序前端
│   ├── app.js             # 应用入口 & 菜单数据
│   ├── app.json           # 应用配置 & TabBar
│   ├── app.wxss           # 全局样式（暖粉色系）
│   ├── images/            # TabBar 图标
│   └── pages/
│       ├── order/         # 点单页（Tab 1）
│       ├── message/       # 消息页（Tab 2）
│       ├── history/       # 历史页（Tab 3）
│       ├── submit/        # 提交点单页
│       └── chef/          # 厨师管理页
├── cloudfunctions/        # 云函数
│   └── getOpenId/         # 获取用户 openid
├── tools/                 # 工具
│   └── generate_icons.html # TabBar 图标生成器
└── project.config.json    # 项目配置
```

## 🚀 开始使用

### 1. 准备工作
- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序账号（或使用测试号）

### 2. 导入项目
1. 打开微信开发者工具
2. 选择「导入项目」
3. 项目目录选择 `sweet-order` 文件夹
4. AppID 填写你的小程序 AppID（或使用测试号）

### 3. 开通云开发
1. 在开发者工具中点击「云开发」按钮
2. 按提示开通云开发环境
3. 在 `project.config.json` 中更新 `appid` 为你的真实 AppID

### 4. 创建云数据库集合
在云开发控制台 → 数据库中创建以下集合：
- `orders` — 点单记录
- `messages` — 消息记录
- `users` — 用户信息

### 5. 部署云函数
右键点击 `cloudfunctions/getOpenId` → 上传并部署（云端安装依赖）

### 6. 生成 TabBar 图标
1. 在浏览器中打开 `tools/generate_icons.html`
2. 右键保存每个图标到 `miniprogram/images/` 文件夹
3. 或者从 [iconfont](https://www.iconfont.cn/) 下载你喜欢的图标

### 7. 运行
在开发者工具中编译运行即可！

## 🔐 厨师端入口
在点单页的标题「今天想吃什么呀？💕」上**长按 3 秒**即可进入厨师管理页面。
（也可以直接在开发者工具中访问 `pages/chef/chef` 页面）

## 🎨 设计说明
- **用户端**：暖粉色系（#FF6B81），温馨甜蜜风格
- **厨师端**：蓝色系（#4A90D2），清爽专业风格
- **圆角卡片** + **轻量动画** + **emoji 点缀**

## 💡 后续迭代想法
- 📸 成品晒图功能
- 🏷️ 菜品口味标签筛选
- 📅 每周菜单计划
- 🔔 微信订阅消息推送
