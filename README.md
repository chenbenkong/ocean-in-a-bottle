# 瓶中沧海 · Drifting Ocean in a Bottle

一个 WebGL 微缩场景：一艘多桅木质帆船在封闭于玻璃瓶内的海洋上绕珊瑚岛航行，
玻璃瓶本身漂浮在无边的 PBR 海面上随浪漂流。

**在线试玩（GitHub Pages）：** https://chenbenkong.github.io/ocean-in-a-bottle/

`standalone.html` 是免部署的单文件怀旧版（体素风，直接打开即用）。

## 启动

双击 `start.bat`（需要已安装 Python 3），浏览器会自动打开
<http://localhost:8643/index.html>。

也可以用任何静态服务器指向本目录，例如：

```bash
cd ocean-bottle
python serve.py 8643
```

> 必须通过 HTTP 访问（ES Module 限制），不能直接双击 index.html。

## 交互

| 操作 | 效果 |
| --- | --- |
| 拖动 | 环视（闲置 3 秒自动恢复旋转） |
| 滚轮 | 缩放 |
| 按住 Space / ⛈按钮 | 掀起风暴：巨浪、乌云、闪电、浪花拍打瓶身，瓶内水面保持水平 |
| ×4 / ×12 / ×1 / ⏸ | 延时摄影倍速，驱动昼夜流转（太阳月亮、星空、灯塔与小屋灯火） |
| 点击画面一次 | 开启声音（浏览器自动播放策略）：合成海浪、海风与雷鸣 |

## 技术

- Three.js r160（CDN）：Sky 大气散射、Water 镜面反射海面 + Gerstner 涌浪顶点注入、
  PMREM 环境光照、UnrealBloom 后期（MSAA ×4 HalfFloat）。
- 瓶体浮力：四点浪高采样 + 弹簧-阻尼积分（升沉/纵摇/横摇）；帆船同理绕岛航行。
- 瓶内体素世界：InstancedMesh 批渲染 + 自定义波浪 shader（浪尖白沫）。
- 资源：[Kenney Pirate Kit](https://kenney.nl/assets/pirate-kit)（CC0）glTF 模型
  （帆船/棕榈/宝箱/码头/岩石/木桶）；音效为 WebAudio 实时合成。
- 目标 60 FPS，实测 55–60（本地）。

## 素材授权

- 帆船模型：[Poly Haven — Ship Pinnace](https://polyhaven.com/a/ship_pinnace)（CC0）
- 道具模型：[Kenney — Pirate Kit](https://kenney.nl/assets/pirate-kit)（CC0）
- 其余代码与程序化资源：MIT。

## 目录

```
ocean-bottle/
├── index.html                入口（UI / importmap）
├── standalone.html           单文件体素版（双击即用）
├── start.bat                 一键本地启动（默认正午）
├── app/
│   ├── main.js               渲染器、后期、相机、交互、主循环
│   ├── environment.js        天空、外海、云、星空、闪电
│   ├── diorama.js            瓶体、平滑岛屿、内海水体、glTF 道具、帆船、生灵
│   └── audio.js              WebAudio 合成音效
├── assets/models/pirate/     Kenney CC0 glTF 模型（含共享贴图）
└── serve.py                 带 no-cache 头的静态服务器
```
