import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { getTheme } from "./theme";
import "@xterm/xterm/css/xterm.css";
import "./TerminalTab.css";

// Matches VS Code's TerminalDataBufferer throttle interval.
// Coalesces rapid PTY data events into a single term.write()
// call, preventing partial-render artifacts from the renderer
// processing many small sequential writes.
const DATA_BUFFER_FLUSH_MS = 5;
const IS_MAC =
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad|iPod/.test(navigator.platform);

interface TerminalTabProps {
	sessionId: string;
	visible: boolean;
	restored?: boolean;
	scrollbackData?: string | null;
}

function TerminalTab({ sessionId, visible, restored, scrollbackData }: TerminalTabProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const fitRef = useRef<FitAddon | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const term = new Terminal({
			theme: getTheme(),
			fontFamily: 'Menlo, Monaco, "Courier New", monospace',
			fontSize: 12,
			fontWeight: "300",
			fontWeightBold: "500",
			cursorBlink: true,
			scrollback: 200000,
			allowProposedApi: true,
		});

		const fit = new FitAddon();
		term.loadAddon(fit);
		term.open(container);
		fitRef.current = fit;

		const unicode11 = new Unicode11Addon();
		term.loadAddon(unicode11);
		term.unicode.activeVersion = "11";

		// WebGL renderer: double-buffered canvas avoids the
		// partial-paint artifacts the DOM renderer can show
		// during rapid sequential writes. Falls back to DOM
		// if the GPU context can't be acquired.
		try {
			const webgl = new WebglAddon();
			webgl.onContextLoss(() => webgl.dispose());
			term.loadAddon(webgl);
		} catch {
			// DOM renderer fallback — no action needed
		}

		// Delay initial fit: the webview may not have its final
		// dimensions when the page first loads. Double-rAF ensures
		// the layout pass has finished before we measure.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => fit.fit());
		});

		// Auto-focus xterm when the webview already has focus (e.g.
		// tile created via Cmd+N or double-click where focusCanvasTile
		// ran before xterm mounted).
		if (document.hasFocus()) {
			term.focus();
		}

		// Keep xterm focused whenever the webview window gains focus,
		// so typing works immediately after clicking a tile title bar
		// or programmatic webview.focus() calls.
		const onWindowFocus = () => term.focus();
		window.addEventListener("focus", onWindowFocus);

		if (!restored) {
			term.write(
				`\x1b[38;2;100;100;100mStarting...\x1b[0m`,
			);
		}

		if (restored && scrollbackData) {
			term.write(scrollbackData);
		}

		const getSelection = () => {
			const selection = term.getSelection();
			return selection.length > 0 ? selection : null;
		};

		const copySelection = () => {
			const selection = getSelection();
			if (!selection) return;
			try {
				window.api.writeClipboardText(selection);
			} catch (error) {
				console.error("Failed to copy terminal selection:", error);
			}
		};

		const pasteClipboard = () => {
			try {
				const text = window.api.readClipboardText();
				if (!text) return;
				term.paste(text);
			} catch (error) {
				console.error("Failed to paste into terminal:", error);
			}
		};

		term.attachCustomKeyEventHandler((e) => {
			if (e.key === "Enter" && e.shiftKey) {
				if (e.type === "keydown") {
					window.api.ptySendRawKeys(sessionId, "\x1b[13;2u");
				}
				return false;
			}
			if (e.type === "keydown") {
				const key = e.key.toLowerCase();
				const isMetaShortcut =
					IS_MAC &&
					e.metaKey &&
					!e.ctrlKey &&
					!e.altKey;
				const isCtrlShortcut =
					!IS_MAC &&
					e.ctrlKey &&
					!e.metaKey &&
					!e.altKey &&
					!e.shiftKey;
				const isCtrlInsert =
					!IS_MAC &&
					e.ctrlKey &&
					!e.metaKey &&
					!e.altKey &&
					key === "insert";
				if (e.ctrlKey && e.shiftKey && !e.metaKey && !e.altKey) {
					if (key === "c") {
						void copySelection();
						return false;
					}
					if (key === "v") {
						void pasteClipboard();
						return false;
					}
				}
				if (key === "c") {
					if (isMetaShortcut) {
						void copySelection();
						return false;
					}
					if (isCtrlShortcut && getSelection()) {
						void copySelection();
						return false;
					}
				}
				if (key === "v" && (isMetaShortcut || isCtrlShortcut)) {
					void pasteClipboard();
					return false;
				}
				if (!IS_MAC && e.shiftKey && key === "insert") {
					void pasteClipboard();
					return false;
				}
				if (isCtrlInsert) {
					void copySelection();
					return false;
				}
				if (e.metaKey || e.ctrlKey) {
					if (key === "t" || (key >= "1" && key <= "9")) {
						return false;
					}
				}
			}
			return true;
		});

		const handleCopy = (event: ClipboardEvent) => {
			const selection = getSelection();
			if (!selection) return;
			event.preventDefault();
			event.stopPropagation();
			event.clipboardData?.setData("text/plain", selection);
			window.api.writeClipboardText(selection);
		};

		const handlePaste = (event: ClipboardEvent) => {
			const text =
				event.clipboardData?.getData("text/plain") ??
				window.api.readClipboardText();
			if (!text) return;
			event.preventDefault();
			event.stopPropagation();
			term.paste(text);
		};

		container.addEventListener("copy", handleCopy, true);
		container.addEventListener("paste", handlePaste, true);

		term.onData((data: string) => {
			window.api.ptyWrite(sessionId, data);
		});

		let dataBuffer: string[] = [];
		let flushTimer: number | undefined;
		let firstData = true;

		const flushData = () => {
			const chunk = dataBuffer.join("");
			dataBuffer.length = 0;
			flushTimer = undefined;
			if (!chunk) return;
			if (firstData) {
				firstData = false;
				if (restored) {
					// Clear viewport so tmux's initial screen
					// draw has a clean surface. Scrollback from
					// capture-pane stays in xterm's buffer.
					term.write("\x1b[2J\x1b[H");
				} else {
					term.reset();
				}
			}
			term.write(chunk);
		};

		const handleData = (payload: {
			sessionId: string;
			data: string;
		}) => {
			if (payload.sessionId !== sessionId) return;
			dataBuffer.push(payload.data);
			if (flushTimer === undefined) {
				flushTimer = window.setTimeout(
					flushData,
					DATA_BUFFER_FLUSH_MS,
				);
			}
		};
		window.api.onPtyData(handleData);

		term.onResize(({ cols, rows }) => {
			window.api.ptyResize(sessionId, cols, rows);
		});

		const offShellBlur = window.api.onShellBlur(() => {
			term.blur();
			const active = document.activeElement as HTMLElement | null;
			active?.blur();
		});

		// Debounce resize via rAF to coalesce rapid events
		let rafId = 0;
		const resizeObserver = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			if (width > 0 && height > 0) {
				cancelAnimationFrame(rafId);
				rafId = requestAnimationFrame(() => fit.fit());
			}
		});
		resizeObserver.observe(container);

		const mediaQuery = window.matchMedia(
			"(prefers-color-scheme: dark)",
		);
		const onThemeChange = () => {
			term.options.theme = getTheme();
		};
		mediaQuery.addEventListener("change", onThemeChange);

		return () => {
			if (flushTimer !== undefined) {
				clearTimeout(flushTimer);
				flushData();
			}
			cancelAnimationFrame(rafId);
			window.removeEventListener("focus", onWindowFocus);
			mediaQuery.removeEventListener("change", onThemeChange);
			resizeObserver.disconnect();
			container.removeEventListener("copy", handleCopy, true);
			container.removeEventListener("paste", handlePaste, true);
			window.api.offPtyData(handleData);
			offShellBlur();
			term.dispose();
			fitRef.current = null;
		};
	}, [sessionId]);

	useEffect(() => {
		if (visible && fitRef.current) {
			requestAnimationFrame(() => fitRef.current?.fit());
		}
	}, [visible]);

	return (
		<div
			ref={containerRef}
			className="terminal-tab"
			style={{ display: visible ? "block" : "none" }}
		/>
	);
}

export default TerminalTab;
