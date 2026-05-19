import {
	App,
	debounce,
	Plugin,
	PluginSettingTab,
	Setting,
	type TFile,
} from "obsidian";

interface NoteAgeHighlighterSettings {
	thresholdDays: number;
	highlightColor: string;
}

const DEFAULT_SETTINGS: NoteAgeHighlighterSettings = {
	thresholdDays: 30,
	highlightColor: "#ff6b6b",
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STYLE_ID = "note-age-highlighter-styles";
const NAV_FILE_SELECTOR = ".nav-file-title[data-path]";
const OLD_NOTE_CLASS = "note-age-old";

export default class NoteAgeHighlighter extends Plugin {
	settings: NoteAgeHighlighterSettings = { ...DEFAULT_SETTINGS };
	private styleEl: HTMLStyleElement | null = null;
	private observer: MutationObserver | null = null;
	private oldFilePaths: Set<string> = new Set();
	private debouncedRefresh: () => void = () => undefined;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new NoteAgeHighlighterSettingTab(this.app, this));

		this.debouncedRefresh = debounce(() => this.refreshHighlights(), 500);

		this.registerEvent(this.app.vault.on("modify", () => this.debouncedRefresh()));
		this.registerEvent(this.app.vault.on("create", () => this.refreshHighlights()));
		this.registerEvent(this.app.vault.on("delete", () => this.refreshHighlights()));
		this.registerEvent(this.app.vault.on("rename", () => this.refreshHighlights()));

		this.addCommand({
			id: "refresh-note-age-highlights",
			name: "Refresh note age highlights",
			callback: () => this.refreshHighlights(),
		});

		this.app.workspace.onLayoutReady(() => {
			this.refreshHighlights();
			this.startObserving();
		});
	}

	onunload(): void {
		this.observer?.disconnect();
		this.observer = null;
		this.removeStyles();
		this.removeHighlightClasses();
		this.oldFilePaths.clear();
	}

	refreshHighlights(): void {
		const oldFilePaths = new Set<string>();
		const now = Date.now();
		const thresholdMs = this.settings.thresholdDays * DAY_IN_MS;

		for (const file of this.app.vault.getMarkdownFiles()) {
			if (this.isOlderThanThreshold(file, now, thresholdMs)) {
				oldFilePaths.add(file.path);
			}
		}

		this.applyHighlights(oldFilePaths);
	}

	private isOlderThanThreshold(file: TFile, now: number, thresholdMs: number): boolean {
		return now - file.stat.mtime > thresholdMs;
	}

	private applyHighlights(oldFilePaths: Set<string>): void {
		this.removeHighlightClasses();
		this.injectStyles();
		this.oldFilePaths = oldFilePaths;

		document.querySelectorAll<HTMLElement>(NAV_FILE_SELECTOR).forEach((el) => {
			this.highlightIfOld(el);
		});
	}

	private startObserving(): void {
		this.observer?.disconnect();

		this.observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of Array.from(mutation.addedNodes)) {
					this.applyHighlightsInNode(node);
				}
			}
		});

		const container = document.querySelector(".nav-files-container") ?? document.body;
		this.observer.observe(container, { childList: true, subtree: true });
	}

	private applyHighlightsInNode(node: Node): void {
		if (!(node instanceof HTMLElement)) {
			return;
		}

		node.querySelectorAll<HTMLElement>(NAV_FILE_SELECTOR).forEach((el) => {
			this.highlightIfOld(el);
		});

		if (node.matches(NAV_FILE_SELECTOR)) {
			this.highlightIfOld(node);
		}
	}

	private highlightIfOld(el: HTMLElement): void {
		const path = el.getAttribute("data-path");

		if (path && this.oldFilePaths.has(path)) {
			el.classList.add(OLD_NOTE_CLASS);
		}
	}

	private injectStyles(): void {
		this.removeStyles();
		this.styleEl = document.createElement("style");
		this.styleEl.id = STYLE_ID;
		this.styleEl.textContent = `
${NAV_FILE_SELECTOR}.${OLD_NOTE_CLASS} {
	color: ${this.settings.highlightColor} !important;
	font-weight: bold;
}
`;
		document.head.appendChild(this.styleEl);
	}

	private removeStyles(): void {
		const existing = document.getElementById(STYLE_ID);

		if (existing) {
			existing.remove();
		}

		this.styleEl = null;
	}

	private removeHighlightClasses(): void {
		document.querySelectorAll<HTMLElement>(`.${OLD_NOTE_CLASS}`).forEach((el) => {
			el.classList.remove(OLD_NOTE_CLASS);
		});
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.refreshHighlights();
	}
}

class NoteAgeHighlighterSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: NoteAgeHighlighter) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Note Age Highlighter" });
		containerEl.createDiv({
			text: "Highlights markdown notes in the file explorer when their last modified time is older than the configured threshold.",
		});

		new Setting(containerEl)
			.setName("Threshold in days")
			.setDesc("Highlight notes whose mtime is older than this many days.")
			.addText((text) => {
				text
					.setPlaceholder(String(DEFAULT_SETTINGS.thresholdDays))
					.setValue(String(this.plugin.settings.thresholdDays))
					.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);

						if (Number.isFinite(parsed) && parsed > 0) {
							this.plugin.settings.thresholdDays = parsed;
							await this.plugin.saveSettings();
						}
					});
			});

		new Setting(containerEl)
			.setName("Highlight color")
			.setDesc("Any valid CSS color value, for example #ff6b6b, tomato, or rgb(255, 107, 107).")
			.addText((text) => {
				text
					.setPlaceholder(DEFAULT_SETTINGS.highlightColor)
					.setValue(this.plugin.settings.highlightColor)
					.onChange(async (value) => {
						const color = value.trim();

						if (color.length > 0) {
							this.plugin.settings.highlightColor = color;
							await this.plugin.saveSettings();
						}
					});
			});
	}
}
