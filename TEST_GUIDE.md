# RAW 16-bit Viewer — Test Guide

Step-by-step procedure to run the extension with F5 and verify it works by opening a `.raw` file.

---

## 1. Prerequisites

### 1.1 Build

From the project root (`raw-viewer-extension`), compile once:

```bash
cd raw-viewer-extension
npm run compile
```

If `out/` contains `extension.js` (and related files), the build succeeded.

### 1.2 Test .raw file

- Must be **headerless 16-bit RAW** (2 bytes per pixel, Little Endian).
- File size must equal **width × height × 2** (bytes).
- Example: 512×512 image → 512×512×2 = 524,288 bytes.

If you don’t have a test .raw file, note the path to a `.raw` file in your workspace or elsewhere.

---

## 2. Run the extension with F5

1. In **Cursor/VS Code**, ensure the `raw-viewer-extension` folder is open as the workspace (or at least as the folder you opened).
2. Press **F5** or, in the **Run and Debug** view, select **Launch Extension** and start it.
3. A **new window (Extension Development Host)** opens.  
   The window whose title includes `[Extension Development Host]` is the one where the extension is loaded.
4. Do the following steps **in that new window**, not in your original Cursor window.

---

## 3. Open a .raw file in the new window

1. In the new window: **File → Open File** (or **Ctrl+O** / **Cmd+O** on Mac).
2. Select the **.raw file** you want to test.
3. If the extension is registered, the file opens with the **RAW 16-bit Viewer** custom editor.  
   - If it opens as plain text or binary instead:
     - Use the tab’s **dropdown** (or right‑click) → **Reopen Editor With...** → **RAW 16-bit Viewer**.

---

## 4. Load the image in the viewer (resolution input)

When the viewer opens, you must supply **width and height** first.

1. Check the **top controls**:
   - **File:** name and size (MB)
   - **Width** / **Height** number inputs (prefilled with suggested values from file size)
   - **Open** button

2. **Set resolution**  
   - Keep the suggested values or change **Width** and **Height** to match the real image size (e.g. 2048×2048).

3. Click **Open**.

4. **Result**:
   - **Success:** The canvas shows the image and the **Auto window** button and **Level/Window** sliders appear. The status line shows e.g. `displayWidth×displayHeight (original width×height)`, min/max, p1/p99.
   - **Failure:**  
     - “File size mismatch” → width×height×2 does not match file size; correct the dimensions.  
     - “Enter valid width and height.” → Ensure both are integers ≥ 1.

---

## 5. Test checklist

After a successful load, verify:

| Item | How to check |
|------|----------------|
| Image display | Grayscale image is visible on the canvas. |
| Auto window | **Auto window (1%–99%)** changes brightness/contrast appropriately. |
| Level/Window | Moving **Level (Center)** and **Window (Width)** sliders changes image brightness. |
| Pixel value | Hovering over the canvas shows a **tooltip** with x, y, value, and 0x... hex. |
| Scroll | For large images, the canvas area scrolls. |

---

## 6. Common issues

- **Extension doesn’t respond**  
  - Make sure you opened the .raw file in the **Extension Development Host** window (the one that opened with F5).  
  - Run `npm run compile` again, then F5 again.

- **“File size mismatch”**  
  - Check that **width × height** equals **file size (bytes) ÷ 2**.  
  - 16-bit = 2 bytes per pixel.

- **.raw opens in another editor**  
  - In the tab: **Reopen Editor With...** → **RAW 16-bit Viewer**.

- **Code changes not reflected**  
  - Run `npm run compile` (or `npm run watch` for continuous compile), then **close the Extension Development Host window** and press **F5** again.

---

## Summary

1. `npm run compile`
2. **F5** → Extension Development Host window opens
3. In the **new window**, open a **.raw file** (or Reopen With → RAW 16-bit Viewer)
4. Enter **width/height** and click **Open**
5. Confirm image, auto window, sliders, and pixel tooltip

Following this order lets you fully test that the extension works as intended.
