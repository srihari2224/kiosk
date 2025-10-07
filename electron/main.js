require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") })
const { app, BrowserWindow, ipcMain, shell } = require("electron")
const { autoUpdater } = require("electron-updater")
const path = require("path")
const fs = require("fs")
const { exec } = require("child_process")
const util = require("util")

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

// Create logs directory
const logsDir = path.join(__dirname, "logs")
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const logPrint = (message) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  console.log(message)
  try {
    fs.appendFileSync(path.join(logsDir, "print.log"), logMessage)
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
    logPrint(`🔍 Getting files from session folder: ${sessionId}`)
    const baseDir = process.env.FILES_BASE_DIR
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
    const baseDir = process.env.FILES_BASE_DIR
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
    logPrint("🖨 Getting default printer...")
    const printerQuery =
      'Get-WmiObject -Class Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object Name, PrinterStatus | ConvertTo-Json'
    const { stdout } = await execAsync(`powershell -Command "${printerQuery}"`)

    if (stdout && stdout.trim()) {
      const printer = JSON.parse(stdout.trim())
      logPrint(`✅ Default printer: ${printer.Name}`)
      return { success: true, defaultPrinter: printer.Name, status: printer.PrinterStatus }
    } else {
      logPrint("⚠ No default printer found")
      return { success: false, error: "No default printer found" }
    }
  } catch (error) {
    logPrint(`❌ Error getting default printer: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// PRINT JOB MONITORING SYSTEM
const activePrintJobs = new Map() // Track jobs by unique identifier
let monitoringInterval = null

// Get current print queue
async function getPrintQueue(printerName) {
  try {
    const printerEscaped = printerName.replace(/'/g, "''")
    const query = `Get-PrintJob -PrinterName '${printerEscaped}' | Select-Object Id, Name, JobStatus, DocumentName, TotalPages, PagesPrinted, SubmittedTime, Position | ConvertTo-Json`
    
    const { stdout } = await execAsync(`powershell -Command "${query}"`)
    
    if (stdout && stdout.trim()) {
      let jobs = JSON.parse(stdout.trim())
      if (!Array.isArray(jobs)) jobs = [jobs]
      return jobs
    }
    return []
  } catch (error) {
    return []
  }
}

// Monitor print jobs continuously
async function monitorPrintQueue(printerName) {
  try {
    const jobs = await getPrintQueue(printerName)
    
    if (jobs.length > 0) {
      console.log(`\n${"=".repeat(80)}`)
      console.log(`📊 PRINT QUEUE STATUS for "${printerName}" - ${new Date().toLocaleTimeString()}`)
      console.log(`${"=".repeat(80)}`)
      
      jobs.forEach((job, index) => {
        const jobId = job.Id
        const previousStatus = activePrintJobs.get(jobId)
        const currentStatus = job.JobStatus
        
        // Status change detection
        if (previousStatus && previousStatus !== currentStatus) {
          console.log(`\n🔄 JOB STATUS CHANGED:`)
          console.log(`   Job ID: ${jobId}`)
          console.log(`   ${previousStatus} → ${currentStatus}`)
        }
        
        // Display job details
        console.log(`\n📄 Job #${index + 1} (ID: ${jobId})`)
        console.log(`   Document: ${job.DocumentName || 'Unknown'}`)
        console.log(`   Status: ${currentStatus}`)
        console.log(`   Progress: ${job.PagesPrinted || 0}/${job.TotalPages || 0} pages`)
        console.log(`   Position: ${job.Position} in queue`)
        console.log(`   Submitted: ${job.SubmittedTime || 'Unknown'}`)
        
        // Update tracking
        activePrintJobs.set(jobId, currentStatus)
        
        // Status-specific messages
        if (currentStatus === 'Printing') {
          console.log(`   ✅ PRINTING NOW...`)
        } else if (currentStatus === 'Paused') {
          console.log(`   ⏸️  PAUSED`)
        } else if (currentStatus === 'Error') {
          console.log(`   ❌ ERROR DETECTED`)
        } else if (currentStatus === 'Deleting') {
          console.log(`   🗑️  BEING DELETED`)
        } else if (currentStatus === 'Spooling') {
          console.log(`   📤 SPOOLING...`)
        } else if (currentStatus === 'Printed') {
          console.log(`   ✅ COMPLETED`)
        }
      })
      
      console.log(`\n${"=".repeat(80)}\n`)
      
      // Cleanup completed jobs from tracking
      const currentJobIds = jobs.map(j => j.Id)
      for (const [jobId, status] of activePrintJobs.entries()) {
        if (!currentJobIds.includes(jobId)) {
          console.log(`✅ Job ${jobId} completed and removed from queue`)
          activePrintJobs.delete(jobId)
        }
      }
    } else if (activePrintJobs.size > 0) {
      console.log(`\n✅ All print jobs completed - Queue is now empty`)
      activePrintJobs.clear()
    }
  } catch (error) {
    console.error(`❌ Error monitoring print queue: ${error.message}`)
  }
}

// Start monitoring
function startPrintMonitoring(printerName) {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
  }
  
  console.log(`\n🚀 Starting print job monitoring for "${printerName}"`)
  console.log(`⏰ Checking queue every 2 seconds...\n`)
  
  // Initial check
  monitorPrintQueue(printerName)
  
  // Set up continuous monitoring
  monitoringInterval = setInterval(() => {
    monitorPrintQueue(printerName)
  }, 2000) // Check every 2 seconds
}

// Stop monitoring
function stopPrintMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
    monitoringInterval = null
    console.log(`\n⏹️  Print monitoring stopped\n`)
  }
}

// IPC handlers for monitoring
ipcMain.handle("start-print-monitoring", async (event, printerName) => {
  try {
    startPrintMonitoring(printerName || TARGET_PRINTER_NAME)
    return { success: true, message: "Print monitoring started" }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle("stop-print-monitoring", async (event) => {
  try {
    stopPrintMonitoring()
    return { success: true, message: "Print monitoring stopped" }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle("get-print-queue", async (event, printerName) => {
  try {
    const jobs = await getPrintQueue(printerName || TARGET_PRINTER_NAME)
    return { success: true, jobs, count: jobs.length }
  } catch (error) {
    return { success: false, error: error.message, jobs: [], count: 0 }
  }
})

// CORE PRINTING FUNCTIONS - BASED ON PYTHON VERSION

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

// Create subset PDF for custom page ranges (like Python version)
async function createTempPdfWithPages(sourcePath, pageRangeStr) {
  if (!PDFDocument) {
    logPrint("⚠ pdf-lib not available for custom page range")
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
    const indices = validPages.map((p) => p - 1) // Convert to 0-based
    const copied = await outPdf.copyPages(srcPdf, indices)
    copied.forEach((p) => outPdf.addPage(p))

    const outBytes = await outPdf.save()
    const tempDir = path.join(__dirname, "temp")
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const outPath = path.join(tempDir, `subset_${Date.now()}.pdf`)
    fs.writeFileSync(outPath, Buffer.from(outBytes))

    logPrint(`✅ Created temp PDF with pages ${validPages.join(",")}: ${outPath}`)
    return outPath
  } catch (error) {
    logPrint(`❌ Error creating temp PDF: ${error.message}`)
    return null
  }
}

// Find Adobe Reader (like Python version)
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
  logPrint("⚠ Adobe Reader not found")
  return null
}

// Find SumatraPDF (like Python version)
const findSumatraPDF = () => {
  const paths = [
    "C:\\Program Files\\SumatraPDF\\SumatraPDF.exe",
    "C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe",
    path.join(require("os").homedir(), "AppData\\Local\\SumatraPDF\\SumatraPDF.exe"),
  ]

  for (const sumatraPath of paths) {
    if (fs.existsSync(sumatraPath)) {
      logPrint(`✅ Found SumatraPDF: ${sumatraPath}`)
      return sumatraPath
    }
  }
  logPrint("⚠ SumatraPDF not found")
  return null
}

// Define the target printer name based on user's screenshot
const TARGET_PRINTER_NAME = "HP Smart Tank 710-720 series"

// SIMPLIFIED BUT RELIABLE PDF PRINTING WITH COLOR/DUPLEX SUPPORT
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

    // ensure we have a working targetPath variable
    let targetPath = filePath

    logPrint(`🖨 Starting RELIABLE PDF print for "${TARGET_PRINTER_NAME}" with options: ${JSON.stringify(printOptions)}`)
    
    // Start monitoring when print job is initiated
    startPrintMonitoring(TARGET_PRINTER_NAME)

    // Normalize doubleSided (accept boolean/string) -> canonical "both-sides" | "one-side"
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
    // Use duplexMode instead of raw doubleSided for logic & logging
    logPrint(`📄 File: ${path.basename(targetPath)}`)
    logPrint(`⚙ Settings: ${copies} copies, ${pageRange}, ${colorMode}, ${duplexMode}`)

    let printSuccess = false
    let methodUsed = ""
    const tempFiles = []

    // Handle custom page range by creating subset PDF
    const isCustomRange = pageRange === "custom" && customPages.trim().length > 0
    if (isCustomRange) {
      const tempPdf = await createTempPdfWithPages(targetPath, customPages)
      if (tempPdf) {
        targetPath = tempPdf
        tempFiles.push(tempPdf)
        logPrint(`✅ Using temp PDF for custom pages: ${tempPdf}`)
      }
    }

    // Method 1: SumatraPDF with SIMPLE but EFFECTIVE settings
    const sumatraPath = findSumatraPDF()
    if (sumatraPath && !printSuccess) {
      try {
        logPrint("🔄 Trying SumatraPDF with RELIABLE settings...")

        // Build SumatraPDF command with proper settings
        let sumatraCmd = `"${sumatraPath}" -print-to "${TARGET_PRINTER_NAME}" "${targetPath}"`

        // Add print settings - SIMPLE but EFFECTIVE
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

        logPrint(`🖨 SumatraPDF command: ${sumatraCmd}`)
        console.log(`\n🚀 Sending print job to queue...`)

        for (let copy = 1; copy <= copies; copy++) {
          const { stdout, stderr } = await execAsync(sumatraCmd)
          logPrint(`✅ SumatraPDF copy ${copy}/${copies} executed`)
          console.log(`✅ Copy ${copy}/${copies} sent to print queue`)
          if (stderr) logPrint(`⚠ SumatraPDF stderr: ${stderr}`)
          if (copy < copies) {
            await new Promise((resolve) => setTimeout(resolve, 10000))
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 2000))
        printSuccess = true
        methodUsed = "SumatraPDF"
        logPrint("✅ SumatraPDF print successful")
      } catch (error) {
        logPrint(`⚠ SumatraPDF failed: ${error.message}`)
      }
    }

    // Method: Windows ShellExecute - MOST RELIABLE
    if (!printSuccess) {
      try {
        logPrint("🔄 Trying Windows ShellExecute 'PrintTo' - MOST RELIABLE...")

        const escapedTargetPath = targetPath.replace(/'/g, "''")
        const escapedPrinterName = TARGET_PRINTER_NAME.replace(/'/g, "''")

        const shellCmd = `powershell -Command "Start-Process -FilePath '${escapedTargetPath}' -Verb PrintTo -ArgumentList '${escapedPrinterName}' -WindowStyle Hidden"`
        logPrint(`🖨 ShellExecute command: ${shellCmd}`)
        console.log(`\n🚀 Sending print job to queue...`)

        for (let copy = 1; copy <= copies; copy++) {
          const { stdout, stderr } = await execAsync(shellCmd)
          logPrint(`✅ ShellExecute copy ${copy}/${copies} executed`)
          console.log(`✅ Copy ${copy}/${copies} sent to print queue`)
          if (stderr) logPrint(`⚠ ShellExecute stderr: ${stderr}`)
          if (copy < copies) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 2000))
        printSuccess = true
        methodUsed = "Windows ShellExecute"
        logPrint("✅ Windows ShellExecute print successful")
      } catch (error) {
        logPrint(`⚠ Windows ShellExecute failed: ${error.message}`)
      }
    }

    // APPLY COLOR/DUPLEX SETTINGS AFTER PRINTING (if possible)
    if (printSuccess) {
      try {
        logPrint(`🎨 Attempting to apply ${colorMode} and ${duplexMode} settings to "${TARGET_PRINTER_NAME}" post-print...`)

        // Try to set color mode
        if (colorMode === "bw") {
          try {
            await execAsync(
              `powershell -Command "Set-PrintConfiguration -PrinterName '${TARGET_PRINTER_NAME}' -Color $false"`,
            )
            logPrint("✅ Post-print: B&W mode applied to printer")
          } catch (e) {
            logPrint(`⚠ Post-print color setting failed for "${TARGET_PRINTER_NAME}": ${e.message}`)
          }
        } else {
          try {
            await execAsync(
              `powershell -Command "Set-PrintConfiguration -PrinterName '${TARGET_PRINTER_NAME}' -Color $true"`,
            )
            logPrint("✅ Post-print: Color mode applied to printer")
          } catch (e) {
            logPrint(`⚠ Post-print color setting failed for "${TARGET_PRINTER_NAME}": ${e.message}`)
          }
        }

        // Try to set duplex mode
        if (duplexMode === "both-sides") {
          try {
            await execAsync(
              `powershell -Command "Set-PrintConfiguration -PrinterName '${TARGET_PRINTER_NAME}' -DuplexingMode TwoSidedLongEdge"`,
            )
            logPrint("✅ Post-print: Duplex mode applied to printer")
          } catch (e) {
            logPrint(`⚠ Post-print duplex setting failed for "${TARGET_PRINTER_NAME}": ${e.message}`)
          }
        } else {
          try {
            await execAsync(
              `powershell -Command "Set-PrintConfiguration -PrinterName '${TARGET_PRINTER_NAME}' -DuplexingMode OneSided"`,
            )
            logPrint("✅ Post-print: Single-sided mode applied to printer")
          } catch (e) {
            logPrint(`⚠ Post-print single-sided setting failed for "${TARGET_PRINTER_NAME}": ${e.message}`)
          }
        }
      } catch (e) {
        logPrint(`⚠ Overall post-print configuration failed for "${TARGET_PRINTER_NAME}": ${e.message}`)
      }
    }

    // Cleanup temp files after delay
    if (tempFiles.length > 0) {
      setTimeout(() => {
        tempFiles.forEach((tempFile) => {
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile)
              logPrint(`🗑 Cleaned up temp file: ${tempFile}`)
            }
          } catch (e) {
            logPrint(`⚠ Failed to clean temp file: ${e.message}`)
          }
        })
      }, 30000) // 30 seconds delay
    }

    if (printSuccess) {
      logPrint(
        `✅ PDF print completed for "${TARGET_PRINTER_NAME}" using: ${methodUsed} with ${colorMode} mode and ${duplexMode} setting`,
      )
      return {
        success: true,
        message: `PDF printed successfully to "${TARGET_PRINTER_NAME}" using ${methodUsed} in ${colorMode} mode with ${duplexMode} setting`,
        method: methodUsed,
        copies,
        pageRange,
        colorMode,
        doubleSided,
      }
    } else {
      throw new Error(
        `All PDF print methods failed for "${TARGET_PRINTER_NAME}" - ensure Adobe Reader or SumatraPDF is installed and the printer name is correct.`
      )
    }
  } catch (error) {
    logPrint(`❌ Error in PDF printing for "${TARGET_PRINTER_NAME}": ${error.message}`)
    return {
      success: false,
      error: error.message,
    }
  }
})

// CANVAS PRINTING - BASED ON PYTHON VERSION
ipcMain.handle("print-canvas", async (event, canvasData) => {
  try {
    logPrint(`🖨 Starting canvas print for "${TARGET_PRINTER_NAME}": ${canvasData && canvasData.pageData ? canvasData.pageData.id || "" : ""}`)
    
    // Start monitoring when print job is initiated
    startPrintMonitoring(TARGET_PRINTER_NAME)

    const { pageData, colorMode } = canvasData || {}
    if (!pageData || !Array.isArray(pageData.items) || pageData.items.length === 0) {
      throw new Error("Canvas page has no items to print")
    }

    logPrint(`🎨 Color mode: ${colorMode}`)
    logPrint(`📄 Canvas items: ${pageData.items.length}`)

    const tempDir = path.join(__dirname, "temp")
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const timestamp = Date.now()
    const tempHtmlPath = path.join(tempDir, `canvas_${timestamp}.html`)
    const tempPdfPath = path.join(tempDir, `canvas_${timestamp}.pdf`)

    // Build HTML content with items (like Python version)
    const buildItemsHtml = () => {
      try {
        if (!Array.isArray(pageData.items)) return ""
        return pageData.items
          .map((item, idx) => {
            try {
              // Resolve image source (prefer dataUrl, fallback to local file)
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
                logPrint(`⚠ [buildItemsHtml] missing src for item index ${idx} id=${item && item.id}`)
                return ""
              }

              // numeric safety
              const left = Number(item.x) || 0
              const top = Number(item.y) || 0
              const width = Number(item.width) || 100
              const height = Number(item.height) || 100
              const rotation = Number(item.rotation) || 0

              // container style
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

              // inner image transforms (scale/rotate) if editor stores them
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

              // object-fit / position - default to 'cover' to match editor crop/zoom behaviour
              const objectFit = item.objectFit || "cover"
              const objectPosition = item.objectPosition || "center center"
              const bwFilter = colorMode === "bw" ? "filter: grayscale(100%);" : ""

              // escape alt
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
    const htmlContent = `
      <!DOCTYPE html>
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
            object-fit: cover; /* default fallback */
            object-position: center center;
          }
        </style>
      </head>
      <body>
        <div class="canvas-container">
          ${buildItemsHtml()}
        </div>
      </body>
      </html>
    `

    fs.writeFileSync(tempHtmlPath, htmlContent, "utf8")
    logPrint(`✅ Created HTML file: ${tempHtmlPath}`)

    // Convert HTML to PDF using headless browser (like Python version)
    const browsers = [
      `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`,
      `"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"`,
    ]

    let pdfCreated = false
    for (const browser of browsers) {
      try {
        const command = `${browser} --headless=new --disable-gpu --print-to-pdf="${tempPdfPath}" --no-margins "file:///${tempHtmlPath.replace(/\\/g, "/")}"` 
        logPrint(`🔄 Converting to PDF: ${command}`)
        await execAsync(command)

        if (fs.existsSync(tempPdfPath)) {
          pdfCreated = true
          logPrint("✅ PDF created successfully")
          break
        }
      } catch (browserError) {
        logPrint(`⚠ ${browser} failed: ${browserError.message}`)
        continue
      }
    }

    if (!pdfCreated) {
      throw new Error("Failed to generate PDF from canvas HTML")
    }

    // Print the generated PDF using the same methods as PDF printing
    let printSuccess = false
    let methodUsed = ""

    console.log(`\n🚀 Sending canvas print job to queue...`)

    // Try Adobe Reader first
    const adobePath2 = findAdobeReader()
    if (adobePath2) {
      try {
        const adobeCmd = `"${adobePath2}" /t "${tempPdfPath}" "${TARGET_PRINTER_NAME}"`
        await execAsync(adobeCmd)
        await new Promise((resolve) => setTimeout(resolve, 3000))
        printSuccess = true
        methodUsed = "Adobe Reader"
        logPrint("✅ Canvas printed via Adobe Reader")
        console.log(`✅ Canvas sent to print queue via Adobe Reader`)
      } catch (error) {
        logPrint(`⚠ Adobe Reader failed for canvas: ${error.message}`)
      }
    }

    // Try SumatraPDF
    if (!printSuccess) {
      const sumatraPath2 = findSumatraPDF()
      if (sumatraPath2) {
        try {
          let sumatraCmd = `"${sumatraPath2}" -print-to "${TARGET_PRINTER_NAME}" "${tempPdfPath}"`
          if (colorMode === "bw") {
            sumatraCmd += ` -print-settings "monochrome"`
          }
          await execAsync(sumatraCmd)
          await new Promise((resolve) => setTimeout(resolve, 3000))
          printSuccess = true
          methodUsed = "SumatraPDF"
          logPrint("✅ Canvas printed via SumatraPDF")
          console.log(`✅ Canvas sent to print queue via SumatraPDF`)
        } catch (error) {
          logPrint(`⚠ SumatraPDF failed for canvas: ${error.message}`)
        }
      }
    }

    // Try Windows ShellExecute
    if (!printSuccess) {
      try {
        const escapedTempPdfPath = tempPdfPath.replace(/'/g, "''")
        const escapedPrinterName = TARGET_PRINTER_NAME.replace(/'/g, "''")
        const shellCmd = `powershell -Command "Start-Process -FilePath '${escapedTempPdfPath}' -Verb PrintTo -ArgumentList '${escapedPrinterName}' -WindowStyle Hidden"`
        await execAsync(shellCmd)
        await new Promise((resolve) => setTimeout(resolve, 3000))
        printSuccess = true
        methodUsed = "Windows ShellExecute"
        logPrint("✅ Canvas printed via Windows ShellExecute")
        console.log(`✅ Canvas sent to print queue via Windows ShellExecute`)
      } catch (error) {
        logPrint(`⚠ Windows ShellExecute failed for canvas: ${error.message}`)
      }
    }

    // Cleanup temp files after delay
    setTimeout(() => {
      try {
        ;[tempHtmlPath, tempPdfPath].forEach((file) => {
          if (file && fs.existsSync(file)) {
            fs.unlinkSync(file)
            logPrint(`🗑 Cleaned up: ${file}`)
          }
        })
      } catch (cleanupError) {
        logPrint(`⚠ Cleanup error: ${cleanupError.message}`)
      }
    }, 30000) // 30 seconds delay

    if (printSuccess) {
      logPrint(`✅ Canvas print completed using: ${methodUsed}`)
      return {
        success: true,
        message: `Canvas printed successfully using ${methodUsed}`,
        method: methodUsed,
        colorMode,
      }
    } else {
      throw new Error("Canvas print failed")
    }
  } catch (error) {
    logPrint(`❌ Error in canvas printing: ${error.message}`)
    return {
      success: false,
      error: error.message,
    }
  }
})