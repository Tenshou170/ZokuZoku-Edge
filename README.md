<div align="center">
  <img src="assets/icon.png" width="128" height="128" alt="ZokuZoku Edge Logo">
  <h1>ZokuZoku Edge</h1>
  <p><b>The ultimate high-performance translation toolkit for the Hachimi translation modding ecosystem.</b></p>
  
  <p>
    <a href="https://github.com/Tenshou170/ZokuZoku-Edge/releases"><img src="https://img.shields.io/github/v/release/Tenshou170/ZokuZoku-Edge?color=brightgreen&logo=github&style=for-the-badge" alt="Latest Release"></a>
    <a href="https://code.visualstudio.com/"><img src="https://img.shields.io/badge/VS_Code-1.96+-007ACC?logo=visual-studio-code&logoColor=white&style=for-the-badge" alt="VS Code Version"></a>
    <a href="https://svelte.dev/"><img src="https://img.shields.io/badge/Svelte-4.x-FF3E00?logo=svelte&logoColor=white&style=for-the-badge" alt="Svelte Framework"></a>
  </p>
  <p>
    <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-Enabled-F69220?logo=pnpm&logoColor=white&style=flat-square" alt="pnpm"></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white&style=flat-square" alt="TypeScript"></a>
    <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust%20WASM-Core-000000?logo=rust&logoColor=white&style=flat-square" alt="Rust WASM"></a>
    <a href="https://github.com/Tenshou170/ZokuZoku-Edge/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-GPL%20v3-blue.svg?style=flat-square" alt="License"></a>
  </p>
</div>

---

**ZokuZoku Edge** is a state-of-the-art Visual Studio Code extension built specifically to accelerate and streamline asset localizations in **UM:PD**. It provides specialized, high-fidelity visual editors and seamless workflows so translators can focus on the content and maintain absolute visual precision.

---

## ✨ Key Features

- 🎨 **Svelte-Powered Visual Editors**: Built-in, high-fidelity visual editors for live lyrics (`m*_lyrics.json`), story timelines, and text databases (`text_data.json`) designed to mimic actual game rendering.
- ⚡ **Tag-Aware Text Wrapping**: Native Rust WebAssembly (`hachimi_lib`) handles layout, character segmentation, and styling tag limits perfectly inside Svelte webviews.
- 📂 **Intuitive Navigation**: Organizes translatable assets into logical tree views, making it easy to find, preview, and edit files without touching raw JSON.
- 🔄 **Dynamic Asset Handling**: Real-time data generation removes the need for manual preprocessing, patching, or separate data downloads.
- ⌨️ **Streamlined Collaborative Workflow**: Fully integrated with VS Code's native features, including Git/source control, keyboard shortcuts, and theme compatibility.

---

## 📚 Documentation & Guides

Learn how to customize, extend, or use ZokuZoku:

- 📖 **[Translation Guide](https://hachimi.noccu.art/docs/translation-guide/using-zokuzoku)**: Step-by-step localization walkthrough and community instructions.

---

## 📦 Installation & Setup

1. Download the latest compiled `.vsix` bundle from the [Releases](https://github.com/Tenshou170/ZokuZoku-Edge/releases) page.
2. Open the **Extensions** panel in VS Code (`Ctrl+Shift+X`).
3. Click the menu icon (`...`) in the top right, select **Install from VSIX...**, and select the downloaded file.

### Prerequisites

| Component            | Requirement                                                        |
| :------------------- | :----------------------------------------------------------------- |
| **OS**               | Windows 10+ / Linux x64                                            |
| **VS Code**          | v1.96 or later                                                     |
| **SQLite 3**         | Ensure `sqlite3` is installed and accessible in your system's PATH |
| **UM:PD Game Files** | JP Client (DMM/Steam), EN Client (Steam), or Android game files    |

> [!TIP]
> **Zero-Config Python Management**: ZokuZoku Edge automatically manages its own sandboxed Python environment (`~/.zokuzoku/pymport`) complete with pre-compiled game intelligence dependencies like `UnityPy` via `pymport`. You do not need to install Python manually!

---

## 🛠️ Development & Building

⚠️ **Please use the pnpm package manager while working on this project.**

To run ZokuZoku Edge locally:

```bash
# 1. Clone the repository and install dev dependencies
pnpm install

# 2. Build the Svelte Webview assets
cd webviews && pnpm install && pnpm run build
cd ..

# 3. Compile the main VS Code Extension host
pnpm run compile
```

Press `F5` in VS Code to launch the Extension Development Host and begin debugging.

---

## ⚖️ License

Distributed under the **GNU GPLv3** License. See the [LICENSE](LICENSE) file for details.
