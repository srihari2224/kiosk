const path = require("path")
const fs = require("fs")
const { app, BrowserWindow, ipcMain, shell } = require("electron")
const { autoUpdater } = require("electron-updater")
const { exec } = require("child_process")
const util = require("util")
const os = require("os")

// Determine if running in development or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Load environment variables from .env file in development
if (isDev) {
  try {
    require("dotenv").config({ path: path.join(__dirname, "..", ".env") })
  } catch (e) {
    console.log("⚠️ Could not load .env file")
  }
}

// Set default FILES_BASE_DIR if not defined
const FILES_BASE_DIR = process.env.FILES_BASE_DIR || path.join(
  os.homedir(),
  "PrinitFiles"
)

// Ensure the base directory exists
if (!fs.existsSync(FILES_BASE_DIR)) {
  fs.mkdirSync(FILES_BASE_DIR, { recursive: true })
  console.log(`📁 Created base directory: ${FILES_BASE_DIR}`)
}

console.log(`📁 Using FILES_BASE_DIR: ${FILES_BASE_DIR}`)

// CRITICAL FIX: Define writable directories EARLY - before any other code
const WRITABLE_TEMP_DIR = path.join(app.getPath('temp'), "prinit-temp")
const WRITABLE_LOGS_DIR = path.join(app.getPath('userData'), "logs")

// Create writable directories immediately
if (!fs.existsSync(WRITABLE_TEMP_DIR)) {
  fs.mkdirSync(WRITABLE_TEMP_DIR, { recursive: true })
  console.log(`✅ Created writable temp directory: ${WRITABLE_TEMP_DIR}`)
}

if (!fs.existsSync(WRITABLE_LOGS_DIR)) {
  fs.mkdirSync(WRITABLE_LOGS_DIR, { recursive: true })
  console.log(`✅ Created writable logs directory: ${WRITABLE_LOGS_DIR}`)
}

console.log(`📁 Writable Temp Dir: ${WRITABLE_TEMP_DIR}`)
console.log(`📁 Writable Logs Dir: ${WRITABLE_LOGS_DIR}`)

let PDFDocument
try {
  PDFDocument = require("pdf-lib").PDFDocument
} catch (e) {
  console.log("ℹ pdf-lib not installed. Custom page range will rely on external tools.")
}

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
    },
    titleBarStyle: "default",
    show: false,
  })

  mainWindow.loadURL("https://last-and-final.vercel.app").catch((err) => {
    console.error("Failed to load local React app:", err)
  })

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  autoUpdater.checkForUpdatesAndNotify()
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// UTILITY FUNCTIONS
const pathExists = (p) => {
  try {
    if (!p) return false
    if (fs.existsSync(p)) return true
    const decoded = decodeURIComponent(p)
    if (decoded !== p && fs.existsSync(decoded)) return true
    return false
  } catch {
    return false
  }
}

const execAsync = util.promisify(exec)

const logPrint = (message) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  console.log(message)
  try {
    fs.appendFileSync(path.join(WRITABLE_LOGS_DIR, "print.log"), logMessage)
  } catch (e) {
    console.error("Failed to write to log:", e)
  }
}

// CORE FILE HANDLERS
ipcMain.handle("open-local-file", async (event, filePath) => {
  try {
    const decodedPath = decodeURIComponent(filePath)
    if (!fs.existsSync(decodedPath)) {
      throw new Error(`File does not exist: ${path.basename(decodedPath)}`)
    }
    await shell.openPath(decodedPath)
    return { success: true, message: "File opened successfully" }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle("file-exists", async (event, filePath) => {
  try {
    return { success: true, exists: pathExists(filePath) }
  } catch (e) {
    return { success: false, exists: false, error: e.message }
  }
})

ipcMain.handle("get-file-as-base64", async (event, filePath) => {
  try {
    logPrint(`📸 Reading file as base64: ${filePath}`)
    const tryPaths = [filePath, decodeURIComponent(filePath)]
    let foundPath = null
    for (const p of tryPaths) {
      if (fs.existsSync(p)) {
        foundPath = p
        break
      }
    }
    if (!foundPath) {
      throw new Error(`File does not exist: ${filePath}`)
    }
    const fileBuffer = fs.readFileSync(foundPath)
    const extension = path.extname(foundPath).toLowerCase()
    let mimeType = "application/octet-stream"
    if ([".jpg", ".jpeg"].includes(extension)) mimeType = "image/jpeg"
    else if (extension === ".png") mimeType = "image/png"
    else if (extension === ".gif") mimeType = "image/gif"
    else if (extension === ".bmp") mimeType = "image/bmp"
    else if (extension === ".webp") mimeType = "image/webp"

    const base64Data = fileBuffer.toString("base64")
    const dataUrl = `data:${mimeType};base64,${base64Data}`

    logPrint("✅ File converted to base64 successfully")
    return { success: true, dataUrl, mimeType, size: fileBuffer.length }
  } catch (error) {
    logPrint(`❌ Error reading file as base64: ${error.message}`)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("get-pdf-as-buffer", async (event, filePath) => {
  try {
    logPrint(`📄 Reading PDF as buffer: ${filePath}`)
    const tryPaths = [filePath, decodeURIComponent(filePath)]
    let foundPath = null
    for (const p of tryPaths) {
      if (fs.existsSync(p)) {
        foundPath = p
        break
      }
    }
    if (!foundPath) {
      throw new Error(`File does not exist: ${filePath}`)
    }
    const fileBuffer = fs.readFileSync(foundPath)
    const uint8Array = new Uint8Array(fileBuffer)
    logPrint(`✅ PDF buffer read successfully, size: ${fileBuffer.length}`)
    return { success: true, buffer: Array.from(uint8Array), size: fileBuffer.length }
  } catch (error) {
    logPrint(`❌ Error reading PDF as buffer: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// SESSION FILE MANAGEMENT
ipcMain.handle("get-session-files", async (event, sessionId) => {
  try {
    logPrint(`📁 Getting files from session folder: ${sessionId}`)
    const baseDir = FILES_BASE_DIR
    const sessionDir = path.join(baseDir, sessionId)

    if (!fs.existsSync(sessionDir)) {
      logPrint(`📁 Session directory does not exist: ${sessionDir}`)
      return { files: [], count: 0, sessionDir, exists: false }
    }

    const files = fs
      .readdirSync(sessionDir)
      .filter((file) => {
        const filePath = path.join(sessionDir, file)
        return fs.statSync(filePath).isFile()
      })
      .map((file) => {
        const filePath = path.join(sessionDir, file)
        const stats = fs.statSync(filePath)
        const decodedName = decodeURIComponent(file)
        const extension = path.extname(decodedName).toLowerCase()
        let fileType = "other"
        if ([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(extension)) {
          fileType = "image"
        } else if (extension === ".pdf") {
          fileType = "pdf"
        }
        return {
          name: decodedName,
          originalName: file,
          localPath: filePath,
          size: stats.size,
          type: fileType,
          extension: extension,
          uploadTime: stats.mtime,
          modifiedTime: stats.mtime,
          createdTime: stats.birthtime,
          isLocal: true,
        }
      })
      .sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime))

    logPrint(`✅ Found ${files.length} files in session folder`)
    return { files, count: files.length, sessionDir, exists: true, success: true }
  } catch (error) {
    logPrint(`❌ Error getting session files: ${error.message}`)
    return { files: [], count: 0, error: error.message, exists: false, success: false }
  }
})

ipcMain.handle("download-s3-files", async (event, sessionId, s3Files) => {
  try {
    logPrint(`📥 Downloading ${s3Files.length} files for session ${sessionId}`)
    const baseDir = FILES_BASE_DIR
    const sessionDir = path.join(baseDir, sessionId)

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true })
    }
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true })
    }

    const downloadedFiles = []
    const errors = []

    for (const s3File of s3Files) {
      try {
        const { key, name } = s3File
        const decodedName = decodeURIComponent(name)
        logPrint(`📥 Downloading: ${decodedName}`)

        const response = await fetch(
          `https://upload-backend-api.vercel.app/api/download-file?key=${encodeURIComponent(key)}`,
        )
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const buffer = await response.arrayBuffer()
        const localFilePath = path.join(sessionDir, decodedName)
        fs.writeFileSync(localFilePath, Buffer.from(buffer))

        const stats = fs.statSync(localFilePath)
        downloadedFiles.push({
          name: decodedName,
          localPath: localFilePath,
          size: stats.size,
          downloadTime: new Date().toISOString(),
        })
        logPrint(`✅ Downloaded: ${decodedName}`)
      } catch (error) {
        logPrint(`❌ Error downloading ${s3File.name}: ${error.message}`)
        errors.push({ name: s3File.name, error: error.message })
      }
    }

    return { success: true, downloadedFiles, errors, sessionDir }
  } catch (error) {
    logPrint(`❌ Error in download-s3-files: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// SMS INVOICE
ipcMain.handle("send-sms-invoice", async (event, invoiceData) => {
  try {
    logPrint(`📱 Sending SMS invoice: ${JSON.stringify(invoiceData)}`)
    return { success: true, message: "SMS invoice sent successfully" }
  } catch (error) {
    logPrint(`❌ Error sending SMS invoice: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// PRINTER DETECTION
ipcMain.handle("get-default-printer", async (event) => {
  try {
    logPrint("🖨️ Getting default printer...")
    const printerQuery =
      'Get-WmiObject -Class Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object Name, PrinterStatus | ConvertTo-Json'
    const { stdout } = await execAsync(`powershell -Command "${printerQuery}"`)

    if (stdout && stdout.trim()) {
      const printer = JSON.parse(stdout.trim())
      logPrint(`✅ Default printer: ${printer.Name}`)
      return { success: true, defaultPrinter: printer.Name, status: printer.PrinterStatus }
    } else {
      logPrint("⚠️ No default printer found")
      return { success: false, error: "No default printer found" }
    }
  } catch (error) {
    logPrint(`❌ Error getting default printer: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// CORE PRINTING FUNCTIONS

// Parse custom page ranges like "1-3,5,7-9" into actual page numbers
function parsePageRange(pageRangeStr) {
  const pages = new Set()
  if (!pageRangeStr || !pageRangeStr.trim()) return []

  const parts = pageRangeStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((s) => s.trim())
      const start = Number.parseInt(startStr, 10) || 0
      const end = Number.parseInt(endStr, 10) || 0
      if (start && end && start <= end) {
        for (let i = start; i <= end; i++) {
          pages.add(i)
        }
      }
    } else {
      const p = Number.parseInt(part, 10) || 0
      if (p) pages.add(p)
    }
  }
  return Array.from(pages).sort((a, b) => a - b)
}

// Create subset PDF for custom page ranges - USES WRITABLE TEMP DIR
async function createTempPdfWithPages(sourcePath, pageRangeStr) {
  if (!PDFDocument) {
    logPrint("⚠️ pdf-lib not available for custom page range")
    return null
  }

  try {
    const pages = parsePageRange(pageRangeStr)
    if (pages.length === 0) return null

    const buf = fs.readFileSync(sourcePath)
    const srcPdf = await PDFDocument.load(buf)
    const pageCount = srcPdf.getPageCount()

    const validPages = pages.filter((p) => p >= 1 && p <= pageCount)
    if (validPages.length === 0) return null

    const outPdf = await PDFDocument.create()
    const indices = validPages.map((p) => p - 1)
    const copied = await outPdf.copyPages(srcPdf, indices)
    copied.forEach((p) => outPdf.addPage(p))

    const outBytes = await outPdf.save()
    
    // CRITICAL: Use writable temp directory
    const outPath = path.join(WRITABLE_TEMP_DIR, `subset_${Date.now()}.pdf`)
    fs.writeFileSync(outPath, Buffer.from(outBytes))

    logPrint(`✅ Created temp PDF with pages ${validPages.join(",")}: ${outPath}`)
    return outPath
  } catch (error) {
    logPrint(`❌ Error creating temp PDF: ${error.message}`)
    return null
  }
}

// Find Adobe Reader
const findAdobeReader = () => {
  const paths = [
    "C:\\Program Files (x86)\\Adobe\\Acrobat Reader DC\\Reader\\AcroRd32.exe",
    "C:\\Program Files\\Adobe\\Acrobat Reader DC\\Reader\\AcroRd32.exe",
    "C:\\Program Files (x86)\\Adobe\\Acrobat Reader\\Reader\\AcroRd32.exe",
    "C:\\Program Files\\Adobe\\Acrobat Reader\\Reader\\AcroRd32.exe",
  ]

  for (const adobePath of paths) {
    if (fs.existsSync(adobePath)) {
      logPrint(`✅ Found Adobe Reader: ${adobePath}`)
      return adobePath
    }
  }
  logPrint("⚠️ Adobe Reader not found")
  return null
}

// Find SumatraPDF
const findSumatraPDF = () => {
  const paths = [
    "C:\\Program Files\\SumatraPDF\\SumatraPDF.exe",
    "C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe",
    path.join(os.homedir(), "AppData\\Local\\SumatraPDF\\SumatraPDF.exe"),
  ]

  for (const sumatraPath of paths) {
    if (fs.existsSync(sumatraPath)) {
      logPrint(`✅ Found SumatraPDF: ${sumatraPath}`)
      return sumatraPath
    }
  }
  logPrint("⚠️ SumatraPDF not found")
  return null
}

// Define the target printer name
const TARGET_PRINTER_NAME = "HP Smart Tank 710-720 series"

// Helper function to forcefully kill all SumatraPDF instances
async function killAllSumatraPDF() {
  try {
    await execAsync('taskkill /IM SumatraPDF.exe /F /T')
    logPrint(`✅ Killed all SumatraPDF instances`)
    await new Promise((resolve) => setTimeout(resolve, 200))
  } catch (error) {
    // Ignore error if process doesn't exist
    if (!error.message.includes("not found")) {
      logPrint(`⚠️ Error killing SumatraPDF: ${error.message}`)
    }
  }
}

// IMPROVED Helper function to wait for printer queue to be ready
async function waitForPrinterReady(maxWaitMs = 8000) {
  const startTime = Date.now()
  let lastQueueCount = -1
  let stableCount = 0
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const { stdout } = await execAsync(
        `powershell -Command "Get-PrintJob -PrinterName '${TARGET_PRINTER_NAME}' | Measure-Object | Select-Object -ExpandProperty Count"`
      )
      const queueCount = parseInt(stdout.trim()) || 0
      
      // Check if queue is empty
      if (queueCount === 0) {
        logPrint(`✅ Printer queue is ready (empty)`)
        return true
      }
      
      // Check if queue count is stable (printer is processing)
      if (queueCount === lastQueueCount) {
        stableCount++
        if (stableCount >= 3) {
          // Queue hasn't changed for 3 checks, printer might be stuck
          logPrint(`⚠️ Queue stable at ${queueCount} jobs - continuing anyway`)
          return true
        }
      } else {
        stableCount = 0
      }
      
      lastQueueCount = queueCount
      logPrint(`⏳ Waiting for printer... (${queueCount} jobs in queue)`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      // Queue might be inaccessible, continue anyway
      logPrint(`⚠️ Could not check queue: ${error.message}`)
      return true
    }
  }
  logPrint(`⚠️ Timeout waiting for printer to be ready`)
  return false
}

// PDF PRINTING - IMPROVED WITH BETTER QUEUE MANAGEMENT
ipcMain.handle("print-pdf", async (event, printOptions) => {
  try {
    const {
      filePath,
      copies = 1,
      pageRange = "all",
      customPages = "",
      colorMode = "bw",
      doubleSided = "one-side",
    } = printOptions

    let targetPath = filePath

    logPrint(`\n${"=".repeat(60)}`)
    logPrint(`🖨️ NEW PRINT JOB STARTED`)
    logPrint(`${"=".repeat(60)}`)
    logPrint(`🖨️ Starting PDF print for "${TARGET_PRINTER_NAME}"`)
    logPrint(`📄 File: ${path.basename(targetPath)}`)
    logPrint(`📋 Copies: ${copies}`)
    logPrint(`📄 Pages: ${pageRange}`)
    logPrint(`🎨 Color: ${colorMode}`)
    logPrint(`📑 Duplex: ${doubleSided}`)

    let duplexMode = "one-side"
    if (
      doubleSided === true ||
      doubleSided === "true" ||
      String(doubleSided).toLowerCase() === "both-sides" ||
      String(doubleSided).toLowerCase() === "twosided" ||
      String(doubleSided).toLowerCase() === "two-sided"
    ) {
      duplexMode = "both-sides"
    }

    // APPLY PRINTER SETTINGS FIRST (BEFORE PRINTING)
    try {
      logPrint(`\n🎨 Applying printer settings BEFORE printing (${colorMode}, ${duplexMode})...`)

      if (colorMode === "bw") {
        try {
          await execAsync(
            `powershell -Command "Set-PrintConfiguration -PrinterName '${TARGET_PRINTER_NAME}' -Color $false"`,
          )
          logPrint("✅ B&W mode applied")
        } catch (e) {
          logPrint(`⚠️ Color setting failed: ${e.message}`)
        }
      } else {
        try {
          await execAsync(
            `powershell -Command "Set-PrintConfiguration -PrinterName '${TARGET_PRINTER_NAME}' -Color $true"`,
          )
          logPrint("✅ Color mode applied")
        } catch (e) {
          logPrint(`⚠️ Color setting failed: ${e.message}`)
        }
      }

      if (duplexMode === "both-sides") {
        try {
          await execAsync(
            `powershell -Command "Set-PrintConfiguration -PrinterName '${TARGET_PRINTER_NAME}' -DuplexingMode TwoSidedLongEdge"`,
          )
          logPrint("✅ Duplex mode applied")
        } catch (e) {
          logPrint(`⚠️ Duplex setting failed: ${e.message}`)
        }
      } else {
        try {
          await execAsync(
            `powershell -Command "Set-PrintConfiguration -PrinterName '${TARGET_PRINTER_NAME}' -DuplexingMode OneSided"`,
          )
          logPrint("✅ Single-sided mode applied")
        } catch (e) {
          logPrint(`⚠️ Single-sided setting failed: ${e.message}`)
        }
      }

      // Wait for settings to take effect
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (e) {
      logPrint(`⚠️ Overall printer configuration failed: ${e.message}`)
    }

    let printSuccess = false
    let methodUsed = ""
    const tempFiles = []

    const isCustomRange = pageRange === "custom" && customPages.trim().length > 0
    if (isCustomRange) {
      const tempPdf = await createTempPdfWithPages(targetPath, customPages)
      if (tempPdf) {
        targetPath = tempPdf
        tempFiles.push(tempPdf)
        logPrint(`✅ Using temp PDF for custom pages: ${tempPdf}`)
      }
    }

    // Kill any existing SumatraPDF instances before starting
    await killAllSumatraPDF()

    // Wait for printer to be completely ready
    await waitForPrinterReady(5000)

    // Method 1: SumatraPDF with SEQUENTIAL PRINTING
    const sumatraPath = findSumatraPDF()
    if (sumatraPath && !printSuccess) {
      try {
        logPrint("\n🔄 Using SumatraPDF with sequential queue management...")

        let sumatraCmd = `"${sumatraPath}" -silent -print-to "${TARGET_PRINTER_NAME}" "${targetPath}"`

        const settings = []
        if (duplexMode === "both-sides") {
          settings.push("duplex")
        }
        if (colorMode === "bw") {
          settings.push("monochrome")
        }
        if (settings.length > 0) {
          sumatraCmd += ` -print-settings "${settings.join(",")}"`
        }

        logPrint(`🖨️ Command: ${sumatraCmd}`)
        console.log(`\n🚀 Sending ${copies} copy/copies to print queue...\n`)

        for (let copy = 1; copy <= copies; copy++) {
          try {
            logPrint(`\n--- Copy ${copy}/${copies} ---`)
            
            // Execute print command
            const { stdout, stderr } = await execAsync(sumatraCmd)
            if (stderr) logPrint(`⚠️ stderr: ${stderr}`)
            
            logPrint(`✅ Copy ${copy}/${copies} command executed`)
            console.log(`✅ Copy ${copy}/${copies} sent to queue`)
            
            // Wait longer for job to be fully spooled
            await new Promise((resolve) => setTimeout(resolve, 800))
            
            // Kill SumatraPDF to release lock
            await killAllSumatraPDF()
            
            // Wait additional time for the printer to process
            await new Promise((resolve) => setTimeout(resolve, 500))
            
            // Wait for printer to be ready before next copy
            if (copy < copies) {
              logPrint(`⏳ Waiting for printer to be ready for next copy...`)
              await waitForPrinterReady(8000) // Increased timeout
              // Additional buffer time between jobs
              await new Promise((resolve) => setTimeout(resolve, 1000))
            }
          } catch (execError) {
            logPrint(`❌ Error spooling copy ${copy}: ${execError.message}`)
            throw execError
          }
        }

        // Final wait to ensure all jobs are processed
        await new Promise((resolve) => setTimeout(resolve, 2000))
        printSuccess = true
        methodUsed = "SumatraPDF (Sequential)"
        logPrint("\n✅ All copies successfully sent to print queue")
        console.log(`\n✅ All ${copies} copies queued successfully!\n`)
      } catch (error) {
        logPrint(`⚠️ SumatraPDF failed: ${error.message}`)
      }
    }

    // Method 2: Windows ShellExecute - FALLBACK
    if (!printSuccess) {
      try {
        logPrint("\n🔄 Trying Windows ShellExecute as fallback...")

        const escapedTargetPath = targetPath.replace(/'/g, "''")
        const escapedPrinterName = TARGET_PRINTER_NAME.replace(/'/g, "''")

        const shellCmd = `powershell -Command "Start-Process -FilePath '${escapedTargetPath}' -Verb PrintTo -ArgumentList '${escapedPrinterName}' -WindowStyle Hidden"`
        logPrint(`🖨️ Command: ${shellCmd}`)
        console.log(`\n🚀 Sending ${copies} copy/copies to print queue...\n`)

        for (let copy = 1; copy <= copies; copy++) {
          try {
            const { stdout, stderr } = await execAsync(shellCmd)
            logPrint(`✅ ShellExecute copy ${copy}/${copies} sent`)
            console.log(`✅ Copy ${copy}/${copies} queued`)
            if (stderr) logPrint(`⚠️ stderr: ${stderr}`)
            
            // Longer wait between copies for ShellExecute
            if (copy < copies) {
              await new Promise((resolve) => setTimeout(resolve, 3000))
              await waitForPrinterReady(8000)
            }
          } catch (execError) {
            logPrint(`❌ Error spooling copy ${copy}: ${execError.message}`)
            throw execError
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 2000))
        printSuccess = true
        methodUsed = "Windows ShellExecute"
        logPrint("✅ Windows ShellExecute print successful")
        console.log(`\n✅ All ${copies} copies queued successfully!\n`)
      } catch (error) {
        logPrint(`⚠️ Windows ShellExecute failed: ${error.message}`)
      }
    }

    // Cleanup temp files after delay
    if (tempFiles.length > 0) {
      setTimeout(() => {
        tempFiles.forEach((tempFile) => {
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile)
              logPrint(`🗑️ Cleaned up: ${tempFile}`)
            }
          } catch (e) {
            logPrint(`⚠️ Failed to clean temp file: ${e.message}`)
          }
        })
      }, 30000)
    }

    if (printSuccess) {
      logPrint(`\n✅ PRINT JOB COMPLETED using ${methodUsed}`)
      logPrint(`${"=".repeat(60)}\n`)
      return {
        success: true,
        message: `PDF printed successfully using ${methodUsed}`,
        method: methodUsed,
        copies,
        pageRange,
        colorMode,
        doubleSided,
      }
    } else {
      throw new Error(
        `All PDF print methods failed for "${TARGET_PRINTER_NAME}"`
      )
    }
  } catch (error) {
    logPrint(`\n❌ PRINT JOB FAILED: ${error.message}`)
    logPrint(`${"=".repeat(60)}\n`)
    return {
      success: false,
      error: error.message,
    }
  }
})

// CANVAS PRINTING - FIXED WITH PROPER WRITABLE TEMP DIR
ipcMain.handle("print-canvas", async (event, canvasData) => {
  try {
    logPrint(`\n${"=".repeat(60)}`)
    logPrint(`🖨️ NEW CANVAS PRINT JOB STARTED`)
    logPrint(`${"=".repeat(60)}`)
    logPrint(`🖨️ Starting canvas print for "${TARGET_PRINTER_NAME}"`)
    logPrint(`📁 Using writable temp dir: ${WRITABLE_TEMP_DIR}`)

    const { pageData, colorMode } = canvasData || {}
    if (!pageData || !Array.isArray(pageData.items) || pageData.items.length === 0) {
      throw new Error("Canvas page has no items to print")
    }

    logPrint(`🎨 Color mode: ${colorMode}`)
    logPrint(`📄 Canvas items: ${pageData.items.length}`)

    // CRITICAL FIX: Use writable temp directory
    const timestamp = Date.now()
    const tempHtmlPath = path.join(WRITABLE_TEMP_DIR, `canvas_${timestamp}.html`)
    const tempPdfPath = path.join(WRITABLE_TEMP_DIR, `canvas_${timestamp}.pdf`)

    logPrint(`📄 Temp HTML path: ${tempHtmlPath}`)
    logPrint(`📄 Temp PDF path: ${tempPdfPath}`)

    // Build HTML content with items
    const buildItemsHtml = () => {
      try {
        if (!Array.isArray(pageData.items)) return ""
        return pageData.items
          .map((item, idx) => {
            try {
              let imgSrc = ""
              if (item && item.dataUrl && typeof item.dataUrl === "string" && item.dataUrl.startsWith("data:")) {
                imgSrc = item.dataUrl
              } else if (item && item.file && item.file.localPath && pathExists(item.file.localPath)) {
                const buf = fs.readFileSync(item.file.localPath)
                const ext = path.extname(item.file.localPath).replace(".", "").toLowerCase() || "jpg"
                let mime = "image/jpeg"
                if (["png"].includes(ext)) mime = "image/png"
                else if (["gif"].includes(ext)) mime = "image/gif"
                else if (["bmp"].includes(ext)) mime = "image/bmp"
                else if (["webp"].includes(ext)) mime = "image/webp"
                imgSrc = `data:${mime};base64,${buf.toString("base64")}`
              } else {
                logPrint(`⚠️ [buildItemsHtml] missing src for item index ${idx} id=${item && item.id}`)
                return ""
              }

              const left = Number(item.x) || 0
              const top = Number(item.y) || 0
              const width = Number(item.width) || 100
              const height = Number(item.height) || 100
              const rotation = Number(item.rotation) || 0

              const containerStyle = [
                "position: absolute",
                `left: ${left}px`,
                `top: ${top}px`,
                `width: ${width}px`,
                `height: ${height}px`,
                `transform: rotate(${rotation}deg)`,
                "transform-origin: center center",
                "overflow: hidden",
                "display: block",
              ].join("; ")

              const imgTransforms = []
              if (typeof item.scaleX === "number" || typeof item.scaleY === "number") {
                const sx = typeof item.scaleX === "number" ? item.scaleX : 1
                const sy = typeof item.scaleY === "number" ? item.scaleY : sx
                imgTransforms.push(`scale(${sx}, ${sy})`)
              }
              if (typeof item.imgRotation === "number" && item.imgRotation !== 0) {
                imgTransforms.push(`rotate(${item.imgRotation}deg)`)
              }
              const imgTransformCss = imgTransforms.length ? `transform: ${imgTransforms.join(" ")}; transform-origin: center center;` : ""

              const objectFit = item.objectFit || "cover"
              const objectPosition = item.objectPosition || "center center"
              const bwFilter = colorMode === "bw" ? "filter: grayscale(100%);" : ""

              const rawAlt = (item.file && item.file.name) || `image-${idx}`
              const alt = String(rawAlt).replace(/'/g, "&#39;").replace(/"/g, "&quot;")

              const imgStyle = [
                "width: 100%",
                "height: 100%",
                `object-fit: ${objectFit}`,
                `object-position: ${objectPosition}`,
                "display: block",
                imgTransformCss,
                bwFilter,
              ]
                .filter(Boolean)
                .join("; ")

              return `<div class="canvas-item" style='${containerStyle}'><img src='${imgSrc}' alt='${alt}' style='${imgStyle}' /></div>`
            } catch (inner) {
              logPrint(`❌ [buildItemsHtml] error rendering item ${idx}: ${inner && inner.message}`)
              return ""
            }
          })
          .join("")
      } catch (e) {
        logPrint(`❌ Error building items HTML: ${e && e.message}`)
        return ""
      }
    }

    // Generate HTML with proper styling
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Canvas Print Job</title>
  <style>
    @page { 
      size: A4; 
      margin: 0; 
    }
    @media print {
      body { 
        margin: 0; 
        padding: 0; 
        -webkit-print-color-adjust: exact; 
        color-adjust: exact; 
      }
    }
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: Arial, sans-serif; 
      background: white;
    }
    .canvas-container { 
      width: 788px; 
      height: 1086px; 
      position: relative; 
      background: white;
      ${colorMode === "bw" ? "filter: grayscale(100%);" : ""}
    }
    .canvas-item { 
      position: absolute;
      overflow: hidden;
      -webkit-backface-visibility: hidden;
    }
    .canvas-item img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
    }
  </style>
</head>
<body>
  <div class="canvas-container">
    ${buildItemsHtml()}
  </div>
</body>
</html>`

    // Write HTML file to writable temp directory
    try {
      fs.writeFileSync(tempHtmlPath, htmlContent, "utf8")
      logPrint(`✅ Created HTML file: ${tempHtmlPath}`)
      logPrint(`📄 HTML file size: ${fs.statSync(tempHtmlPath).size} bytes`)
      
      // Verify file was created
      if (!fs.existsSync(tempHtmlPath)) {
        throw new Error(`HTML file was not created at: ${tempHtmlPath}`)
      }
    } catch (writeError) {
      logPrint(`❌ Failed to write HTML file: ${writeError.message}`)
      throw new Error(`Failed to create HTML file: ${writeError.message}`)
    }

    // Find Chrome executable
    const findChrome = () => {
      const paths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
      ]
      
      for (const chromePath of paths) {
        if (fs.existsSync(chromePath)) {
          logPrint(`✅ Found Chrome: ${chromePath}`)
          return chromePath
        }
      }
      logPrint("⚠️ Chrome not found in standard locations")
      return null
    }

    const chromePath = findChrome()
    
    if (!chromePath) {
      throw new Error("Google Chrome not found. Please install Chrome to print canvas layouts.")
    }

    // Convert HTML to PDF using Chrome headless
    let pdfCreated = false
    try {
      // Normalize paths for file:// URL - Windows paths need forward slashes
      const normalizedHtmlPath = tempHtmlPath.replace(/\\/g, "/")
      const fileUrl = `file:///${normalizedHtmlPath}`
      
      logPrint(`🔄 Converting HTML to PDF...`)
      logPrint(`📄 Source URL: ${fileUrl}`)
      logPrint(`📄 Output PDF: ${tempPdfPath}`)
      
      // Use proper Chrome headless command with timeout
      const command = `"${chromePath}" --headless=new --disable-gpu --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --print-to-pdf="${tempPdfPath}" --no-margins "${fileUrl}"`
      logPrint(`🖨️ Chrome command: ${command}`)
      
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 15000,
        windowsHide: true 
      })
      
      if (stdout) logPrint(`Chrome stdout: ${stdout}`)
      if (stderr) logPrint(`Chrome stderr: ${stderr}`)
      
      // Wait for file to be written
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Verify PDF was created
      if (fs.existsSync(tempPdfPath)) {
        const pdfSize = fs.statSync(tempPdfPath).size
        if (pdfSize > 0) {
          logPrint(`✅ PDF created successfully (${pdfSize} bytes)`)
          pdfCreated = true
        } else {
          logPrint(`❌ PDF file is empty: ${tempPdfPath}`)
        }
      } else {
        logPrint(`❌ PDF file was not created at: ${tempPdfPath}`)
      }
    } catch (browserError) {
      logPrint(`❌ Chrome conversion failed: ${browserError.message}`)
      if (browserError.stdout) logPrint(`stdout: ${browserError.stdout}`)
      if (browserError.stderr) logPrint(`stderr: ${browserError.stderr}`)
    }

    if (!pdfCreated) {
      throw new Error("Failed to generate PDF from canvas HTML. Ensure Chrome is installed and accessible.")
    }

    // Kill any existing SumatraPDF instances before printing
    await killAllSumatraPDF()

    // Wait for printer to be ready
    await waitForPrinterReady(5000)

    // Print the generated PDF using improved approach
    let printSuccess = false
    let methodUsed = ""

    console.log(`\n🚀 Sending canvas to print queue...\n`)

    const sumatraPath = findSumatraPDF()
    if (sumatraPath) {
      try {
        logPrint(`\n🔄 Using SumatraPDF to print canvas PDF...`)
        let sumatraCmd = `"${sumatraPath}" -silent -print-to "${TARGET_PRINTER_NAME}" "${tempPdfPath}"`
        if (colorMode === "bw") {
          sumatraCmd += ` -print-settings "monochrome"`
        }
        
        logPrint(`🖨️ Executing: ${sumatraCmd}`)
        await execAsync(sumatraCmd)
        
        // Wait for job to start spooling
        await new Promise((resolve) => setTimeout(resolve, 800))
        
        // Kill SumatraPDF to release printer lock
        await killAllSumatraPDF()
        
        await new Promise((resolve) => setTimeout(resolve, 1000))
        printSuccess = true
        methodUsed = "SumatraPDF"
        logPrint("✅ Canvas printed via SumatraPDF")
        console.log(`✅ Canvas sent to print queue successfully!\n`)
      } catch (error) {
        logPrint(`⚠️ SumatraPDF failed for canvas: ${error.message}`)
      }
    }

    // Fallback to Windows ShellExecute
    if (!printSuccess) {
      try {
        logPrint(`\n🔄 Using Windows ShellExecute as fallback...`)
        const escapedTempPdfPath = tempPdfPath.replace(/'/g, "''")
        const escapedPrinterName = TARGET_PRINTER_NAME.replace(/'/g, "''")
        const shellCmd = `powershell -Command "Start-Process -FilePath '${escapedTempPdfPath}' -Verb PrintTo -ArgumentList '${escapedPrinterName}' -WindowStyle Hidden"`
        
        logPrint(`🖨️ Executing: ${shellCmd}`)
        await execAsync(shellCmd)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        printSuccess = true
        methodUsed = "Windows ShellExecute"
        logPrint("✅ Canvas printed via Windows ShellExecute")
        console.log(`✅ Canvas sent to print queue successfully!\n`)
      } catch (error) {
        logPrint(`⚠️ Windows ShellExecute failed for canvas: ${error.message}`)
      }
    }

    // Cleanup temp files after delay
    setTimeout(() => {
      try {
        [tempHtmlPath, tempPdfPath].forEach((file) => {
          if (file && fs.existsSync(file)) {
            fs.unlinkSync(file)
            logPrint(`🗑️ Cleaned up: ${file}`)
          }
        })
      } catch (cleanupError) {
        logPrint(`⚠️ Cleanup error: ${cleanupError.message}`)
      }
    }, 30000)

    if (printSuccess) {
      logPrint(`\n✅ CANVAS PRINT COMPLETED using ${methodUsed}`)
      logPrint(`${"=".repeat(60)}\n`)
      return {
        success: true,
        message: `Canvas printed successfully using ${methodUsed}`,
        method: methodUsed,
        colorMode,
      }
    } else {
      throw new Error("Canvas print failed - ensure SumatraPDF or Chrome is installed")
    }
  } catch (error) {
    logPrint(`\n❌ CANVAS PRINT FAILED: ${error.message}`)
    logPrint(`${"=".repeat(60)}\n`)
    return {
      success: false,
      error: error.message,
    }
  }
})


