import Cocoa
import WebKit
import Darwin

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var statusLabel: NSTextField!
    private var runtimeProcess: Process?
    private var runtimeReady = false
    private var isQuitting = false
    private var stdoutBuffer = ""

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        buildWindow()
        startRuntime()
        NSApp.activate(ignoringOtherApps: true)
    }

    private func buildWindow() {
        let frame = NSRect(x: 0, y: 0, width: 1280, height: 820)
        window = NSWindow(
            contentRect: frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Instara Crew — by LUC4N3X"
        window.center()
        window.minSize = NSSize(width: 960, height: 640)
        window.isReleasedWhenClosed = false

        let root = NSView(frame: frame)
        root.autoresizingMask = [.width, .height]
        window.contentView = root

        let title = NSTextField(labelWithString: "Instara Crew")
        title.font = .systemFont(ofSize: 30, weight: .bold)
        title.translatesAutoresizingMaskIntoConstraints = false

        let byline = NSTextField(labelWithString: "by LUC4N3X")
        byline.font = .systemFont(ofSize: 13, weight: .medium)
        byline.textColor = .secondaryLabelColor
        byline.translatesAutoresizingMaskIntoConstraints = false

        statusLabel = NSTextField(labelWithString: "Preparazione runtime locale…")
        statusLabel.font = .systemFont(ofSize: 14)
        statusLabel.textColor = .secondaryLabelColor
        statusLabel.translatesAutoresizingMaskIntoConstraints = false

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.isHidden = true

        root.addSubview(title)
        root.addSubview(byline)
        root.addSubview(statusLabel)
        root.addSubview(webView)

        NSLayoutConstraint.activate([
            title.centerXAnchor.constraint(equalTo: root.centerXAnchor),
            title.centerYAnchor.constraint(equalTo: root.centerYAnchor, constant: -45),
            byline.centerXAnchor.constraint(equalTo: root.centerXAnchor),
            byline.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 8),
            statusLabel.centerXAnchor.constraint(equalTo: root.centerXAnchor),
            statusLabel.topAnchor.constraint(equalTo: byline.bottomAnchor, constant: 24),
            webView.leadingAnchor.constraint(equalTo: root.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            webView.topAnchor.constraint(equalTo: root.topAnchor),
            webView.bottomAnchor.constraint(equalTo: root.bottomAnchor)
        ])

        window.makeKeyAndOrderFront(nil)
    }

    private func startRuntime() {
        guard let resources = Bundle.main.resourceURL else {
            fail("Impossibile trovare le risorse dell'app.")
            return
        }

        let script = resources.appendingPathComponent("runtime.sh")
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/bash")
        process.arguments = [script.path, resources.path]
        process.environment = ProcessInfo.processInfo.environment

        let output = Pipe()
        let error = Pipe()
        process.standardOutput = output
        process.standardError = error
        runtimeProcess = process

        output.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let chunk = String(data: data, encoding: .utf8) else { return }
            DispatchQueue.main.async {
                self?.consumeRuntimeOutput(chunk)
            }
        }

        error.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            guard !data.isEmpty, let chunk = String(data: data, encoding: .utf8) else { return }
            NSLog("Instara runtime: %@", chunk)
        }

        process.terminationHandler = { [weak self] process in
            DispatchQueue.main.async {
                guard let self, !self.isQuitting else { return }
                if !self.runtimeReady {
                    self.fail("Il runtime locale non si è avviato. Controlla i log in ~/Library/Application Support/Instara Crew/logs.")
                } else if process.terminationStatus != 0 {
                    self.fail("Il runtime locale si è arrestato in modo inatteso.")
                }
            }
        }

        do {
            try process.run()
        } catch {
            fail("Avvio runtime fallito: \(error.localizedDescription)")
        }
    }

    private func consumeRuntimeOutput(_ chunk: String) {
        stdoutBuffer += chunk
        while let newline = stdoutBuffer.firstIndex(of: "\n") {
            let line = String(stdoutBuffer[..<newline]).trimmingCharacters(in: .whitespacesAndNewlines)
            stdoutBuffer.removeSubrange(...newline)
            handleRuntimeLine(line)
        }
    }

    private func handleRuntimeLine(_ line: String) {
        if line.hasPrefix("INSTARA_STATUS:") {
            statusLabel.stringValue = String(line.dropFirst("INSTARA_STATUS:".count)).trimmingCharacters(in: .whitespaces)
            return
        }

        if line == "INSTARA_READY" {
            runtimeReady = true
            webView.isHidden = false
            if let url = URL(string: "http://127.0.0.1:3000") {
                webView.load(URLRequest(url: url))
            }
            return
        }

        if line.hasPrefix("INSTARA_ERROR:") {
            fail(String(line.dropFirst("INSTARA_ERROR:".count)).trimmingCharacters(in: .whitespaces))
        }
    }

    private func fail(_ message: String) {
        if !isQuitting {
            let alert = NSAlert()
            alert.alertStyle = .critical
            alert.messageText = "Instara Crew — by LUC4N3X"
            alert.informativeText = message
            alert.addButton(withTitle: "OK")
            alert.runModal()
        }
        NSApp.terminate(nil)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationWillTerminate(_ notification: Notification) {
        isQuitting = true
        guard let process = runtimeProcess, process.isRunning else { return }
        process.terminate()
        let deadline = Date().addingTimeInterval(5)
        while process.isRunning && Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        }
        if process.isRunning {
            kill(process.processIdentifier, SIGKILL)
        }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
