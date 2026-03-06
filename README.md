# RAW 16-bit Viewer

A VS Code / Cursor extension to view headerless 16-bit RAW binary files directly in the editor.

## Features

- **Resolution input**: Opening a `.raw` file shows suggested dimensions from file size; enter width/height and click [Open] to load.
- **16-bit grayscale**: Interprets pixel data as Little-endian uint16.
- **Auto window**: "Auto window (1%–99%)" button applies percentile-based default window level.
- **Manual window**: Level (Center) and Window (Width) sliders adjust brightness and contrast.
- **Pixel value inspection**: Hover over the image to see coordinates and 16-bit value (decimal and hex) in a tooltip.
- **Fast load**: Large files are downscaled for display (max 2048×2048) to reduce load time. Pixel values refer to this display view.

## Running the extension — Method 1 vs Method 2

| | **Method 1 (F5)** | **Method 2 (Install)** |
|---|-------------------|-------------------------|
| **Windows** | **Two windows**: your workspace + a separate **Extension Development Host** window. You must open the folder and click .raw in the **F5 window**. | **One window**: open any folder and click .raw in the explorer; the viewer opens in the same window. No F5 needed. |
| **Setup** | Open this project in Cursor, press **F5** → in the new window, **File → Open Folder** (folder with .raw files) → click .raw in the explorer. | **One-time**: install the extension (see below). Then in any window, open a folder and click .raw. |
| **Requirements** | **Node 18** is fine. | **Node 18** is fine. Use `npm run package` to create a `.vsix` (uses `zip` internally). |

**Summary**: Method 1 = ".raw works only in the **new window** opened by F5". Method 2 = "Install the extension once; then .raw works in **any window**". Viewer behavior (resolution, image display) is the same.

---

## Method 1: Run with F5 (works on Node 18)

1. Open **this extension project folder** (raw-viewer-extension) in Cursor.
2. Press **F5**. A **new window** titled **[Extension Development Host]** opens.
3. In **that new window**, use **File → Open Folder** and select a folder that contains `.raw` files.
4. In the **Explorer** of that new window, **click a .raw file**. The RAW 16-bit Viewer opens.
5. In the viewer, confirm width/height and click **Open** to display the image.

---

## Method 2: Install the extension

**Goal**: Use one window—open a folder and click .raw in the explorer; no F5, no second window.

### 2-1. Create the installable .vsix file

In a terminal, from this project folder (Node 18 is fine):

```bash
cd raw-viewer-extension   # go to this extension project folder
npm install
npm run package
```

On success, a file like **`raw-16bit-viewer-0.1.0.vsix`** appears in the project folder. This is the installable package.

### 2-2. Install the extension in Cursor (step by step)

1. **Open the Extensions panel**  
   - Click the **Extensions** icon (four squares) in the left activity bar, or press **Ctrl+Shift+X** (Mac: **Cmd+Shift+X**).

2. **Open the “Install from VSIX” flow**  
   - **Option A (recommended)**  
     Press **Ctrl+Shift+P** (Mac: **Cmd+Shift+P**) to open the Command Palette, type **VSIX** or **Install from VSIX**, then run **Extensions: Install from VSIX...**.  
   - **Option B**  
     If your Extensions panel has a **⋯** or **▼** next to the search box, click it and choose **Install from VSIX...**. (Some Cursor builds omit this; use Option A then.)

3. **Select the .vsix file**  
   - In the file picker, go to this project folder and select **`raw-16bit-viewer-0.1.0.vsix`**, then click **Open**.  
   - Example path: `~/train_model/Training/raw-viewer-extension/raw-16bit-viewer-0.1.0.vsix`

4. **Confirm installation**  
   - A short message like “Extension installed” appears. **RAW 16-bit Viewer** should appear in your extension list.

5. **Reload the window**  
   - **Ctrl+Shift+P** → run **Developer: Reload Window**, or fully quit and restart Cursor.

After that, open any folder and click a **.raw** file in the Explorer to open it in RAW 16-bit Viewer.

### 2-3. Using the viewer

You do **not** need to press F5 again. In the same window where you work, use **File → Open Folder**, then click a **.raw file** in the Explorer. Resolution input and image display work the same as in Method 1.

**Does the extension start automatically when I open Cursor?**  
Yes. Once installed, the extension is loaded with Cursor. You don’t need to run anything extra. Clicking a .raw file in the Explorer activates the extension and opens the viewer.

### Viewer usage (Method 1 and 2)

1. Check the suggested width/height and click **Open** (edit if needed).
2. Use **Auto window** for a quick look, or the **Level** / **Window** sliders to adjust brightness and contrast.
3. Use **Display size** (25%–100% or **Fit to view**) to zoom.

## Development

```bash
npm install
npm run compile
```

Debug: Open this folder in VS Code/Cursor and press **F5**.

## Publishing to the Marketplace (for others to install)

VS Code and Cursor use the **Visual Studio Code Marketplace**. Publishing there lets anyone find and install your extension from the Extensions view.

### Prerequisites

1. A **Microsoft account** (e.g. Outlook.com).
2. **Create a publisher**: Go to [https://marketplace.visualstudio.com](https://marketplace.visualstudio.com), sign in, click **Publish extension**, then **Create Publisher** and choose a publisher ID (e.g. `your-name`). One-time setup.
3. Ensure `npm run package` produces a valid `.vsix` (works on Node 18).

### Set publisher and repository in package.json

This project’s `package.json` already has `publisher` and `repository` placeholders. **Before publishing**, replace them with your values:

- **publisher**: The **publisher ID** you created on [marketplace.visualstudio.com](https://marketplace.visualstudio.com) (e.g. `johndoe`).
- **repository.url**: Your GitHub (or other) repo URL. Optional but recommended; it adds a “Repository” link on the extension page.

Replace `"your-publisher-id"`, `your-username`, and `your-repo` with your real values.

### How to publish (pick one)

**Option A: Upload via the web**

1. Go to [https://marketplace.visualstudio.com](https://marketplace.visualstudio.com), sign in, click **Publish extension**.
2. Open the **VSIX** tab, click **Select file**, and upload `raw-16bit-viewer-0.1.0.vsix` (or the version you built).
3. Fill in description, category, etc., and publish. For future versions, build a new `.vsix` and upload it the same way.

**Option B: Publish from the terminal**

1. Create a **Personal Access Token (PAT)** with “Publish” scope from [Azure DevOps](https://dev.azure.com) or [marketplace.visualstudio.com](https://marketplace.visualstudio.com).
2. In a terminal (Node 20+ required for `vsce publish`; building `.vsix` works on Node 18 with `npm run package`):
   ```bash
   npx @vscode/vsce login (your-publisher-id)
   ```
   Paste the PAT when prompted.
3. From this project folder:
   ```bash
   npm run package
   npx @vscode/vsce publish -p (PAT)
   ```
   Or after login, run `npx @vscode/vsce publish` only.

Once published, others can search for **RAW 16-bit Viewer** in the Extensions view and click **Install**.

## Notes

- Pixel data is assumed **Little-endian** 16-bit.
- Very large resolutions (e.g. 3072×3072) may take 1–2 seconds on first load for percentile calculation.
