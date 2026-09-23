import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState
} from 'react';

type InstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type InstallMode = 'native' | 'instructions' | null;

type PwaInstallContextValue = {
	mode: InstallMode;
	prompt: () => Promise<void>;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

/** Captures the browser install event before a signed-in page header is mounted. */
export function PwaInstallProvider(props: React.PropsWithChildren) {
	const { children } = props;
	const [installPrompt, setInstallPrompt] =
		useState<InstallPromptEvent | null>(null);
	const [showInstructions, setShowInstructions] = useState(false);

	useEffect(() => {
		if (isInstalled()) return;
		setShowInstructions(isIosDevice());

		function onBeforeInstallPrompt(event: Event) {
			event.preventDefault();
			setInstallPrompt(event as InstallPromptEvent);
		}
		function onAppInstalled() {
			setInstallPrompt(null);
			setShowInstructions(false);
		}

		window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
		window.addEventListener('appinstalled', onAppInstalled);
		return function () {
			window.removeEventListener(
				'beforeinstallprompt',
				onBeforeInstallPrompt
			);
			window.removeEventListener('appinstalled', onAppInstalled);
		};
	}, []);

	async function prompt() {
		if (!installPrompt) return;
		const currentPrompt = installPrompt;
		setInstallPrompt(null);
		try {
			await currentPrompt.prompt();
			await currentPrompt.userChoice;
		} catch {
			// The browser may invalidate a saved prompt after its install state changes.
		}
	}

	const value = useMemo<PwaInstallContextValue>(
		() => ({
			mode: installPrompt ? 'native' : showInstructions ? 'instructions' : null,
			prompt
		}),
		[installPrompt, showInstructions]
	);

	return (
		<PwaInstallContext.Provider value={value}>
			{children}
		</PwaInstallContext.Provider>
	);
}

export function usePwaInstall() {
	const value = useContext(PwaInstallContext);
	if (!value)
		throw new Error('usePwaInstall must be used inside PwaInstallProvider');
	return value;
}

function isInstalled() {
	const navigatorWithStandalone = navigator as Navigator & {
		standalone?: boolean;
	};
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		navigatorWithStandalone.standalone === true
	);
}

function isIosDevice() {
	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	);
}
