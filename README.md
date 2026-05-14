# RAW Viewer

View headerless 16-bit RAW binary files directly in VS Code or Cursor.

## What It Does

- Opens `.raw` files inside the editor
- Interprets data as **16-bit grayscale, little-endian**
- Lets you enter width and height manually
- Reuses the **last successful resolution** when it exactly matches the new file size
- Saves a **folder default resolution** for repeated files
- Supports **folder session** review with **Previous** / **Next**
- Provides **Auto window**, manual **Level / Width** controls, and zoom controls
- Shows pixel coordinates and pixel values on hover

## Open a RAW File

1. Open a folder that contains `.raw` files.
2. Click a `.raw` file in the Explorer.
3. If the resolution is already known and the file size matches exactly, the image may open automatically.
4. Otherwise, enter **Width** and **Height**, then click **Open**.

## Faster Ways To Review Many RAW Files

### 1. Last Successful Resolution

After you open one RAW file successfully, the extension remembers that resolution.

If the next RAW file has the exact same byte size, the viewer can open it automatically with the same resolution.

### 2. Folder Default

If many RAW files in one folder share the same resolution:

1. Open one file successfully.
2. Turn on **Save as folder default** before opening, or click **Save Current** after opening.
3. The extension will reuse that resolution for other RAW files in the same folder when the file size matches exactly.

Use **Clear** to remove the saved folder default.

### 3. Folder Session

Use a folder session when you want to move through many RAW files in order.

1. Click **Start Session** in the viewer.
2. Enter **Width** and **Height** once.
3. Choose whether to use that resolution only for this session or save it as a folder default.
4. Use **Previous** and **Next** to move through files in the folder.

## Viewer Controls

### Window

- **Auto**: Uses the 1% to 99% value range to set a practical default contrast
- **Level**: Moves the center of the visible range
- **Width**: Changes the size of the visible range

### Display

- **Fit**: Fits the image into the current viewer area
- **25% / 50% / 75% / 100%**: Uses fixed zoom levels

### Pixel Inspection

Move the mouse over the image to see:

- `x`, `y`
- 16-bit decimal value
- hexadecimal value

## Automatic Opening Rules

Automatic opening only happens when the resolution is an **exact** match for the file size.

Priority:

1. Active folder session resolution
2. Saved folder default
3. Last successful resolution

If no exact match is found, the viewer stays in manual input mode so you can enter another resolution safely.

## Notes

- RAW data is assumed to be **little-endian uint16**
- There is no header parsing; width and height must come from you or from a previously saved match
- Very large images may take a little longer to load the first time
