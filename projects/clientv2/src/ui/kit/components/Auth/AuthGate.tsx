import React, { useCallback, useEffect } from 'react';
import type { AuthUser } from 'src/domain/models/session';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { useAppSelector } from 'src/redux/use-app-selector';
import { loadSession, signOut as signOutThunk } from 'src/redux/session/session.thunks';
import { selectSession } from 'src/redux/session/session.selectors';
import { LoadingIndicator } from '../LoadingIndicator';
import { LogoIcon } from '../LogoIcon/LogoIcon';
import { SignInForm } from './SignInForm';

import styles from './auth.module.css';

type AuthValue = {
	user: AuthUser;
	signOut: () => Promise<void>;
};

/** The signed-in user. Only valid inside AuthGate's children. */
export function useAuth(): AuthValue {
	const session = useAppSelector(selectSession);
	const dispatch = useAppDispatch();
	const signOut = useCallback(async () => {
		await dispatch(signOutThunk());
	}, [dispatch]);
	if (session.status !== 'signed-in') throw new Error('useAuth must be used inside AuthGate');
	return { user: session.user, signOut };
}

/**
 * Renders its children only for a signed-in user. Before that it shows the sign-in
 * screen, or first-run account creation. If the session ends while the app is open, it
 * asks the user to sign in over the app instead of unmounting it, so the page keeps its state.
 */
export function AuthGate(props: React.PropsWithChildren) {
	const { children } = props;
	const state = useAppSelector(selectSession);
	const dispatch = useAppDispatch();

	const load = useCallback(() => {
		void dispatch(loadSession());
	}, [dispatch]);

	useEffect(load, [load]);

	if (state.status === 'loading') return <LoadingIndicator />;

	if (state.status === 'unreachable')
		return (
			<AuthScreen title="Can’t reach the server">
				<p className={styles.lede}>
					Check that the backend is running, then try again.
				</p>
				<button className={styles.submit} type="button" onClick={load}>
					Try again
				</button>
			</AuthScreen>
		);

	if (state.status === 'signed-out')
		return (
			<AuthScreen
				title={state.setupRequired ? 'Create your account' : 'Sign in'}
				lede={
					state.setupRequired
						? 'This is a new server. The account you create here is its first.'
						: undefined
				}
			>
				<SignInForm setup={state.setupRequired} />
			</AuthScreen>
		);

	return (
		<>
			<PageErrorBoundary
				key={state.user.id}
				resetKey={state.epoch}
				sessionEnded={state.expired}
			>
				{children}
			</PageErrorBoundary>
			{state.expired && (
				<div className={styles.backdrop}>
					<div
						className={styles.dialog}
						role="dialog"
						aria-modal="true"
						aria-labelledby="session-expired-title"
					>
						<h1 id="session-expired-title" className={styles.title}>
							Your session ended
						</h1>
						<p className={styles.lede}>
							Your edits remain saved on this device. Sign in
							again to resume synchronization.
						</p>
						<SignInForm initialUsername={state.user.username} />
					</div>
				</div>
			)}
		</>
	);
}

function AuthScreen(
	props: React.PropsWithChildren<{ title: string; lede?: string }>
) {
	const { title, lede, children } = props;

	return (
		<main className={styles.screen}>
			<div className={styles.card}>
				<div className={styles.brand}>
					<LogoIcon className={styles.brandIcon} />
					<span>Cube Light</span>
				</div>
				<h1 className={styles.title}>{title}</h1>
				{lede && <p className={styles.lede}>{lede}</p>}
				{children}
			</div>
		</main>
	);
}

type PageErrorBoundaryProps = React.PropsWithChildren<{
	resetKey: number;
	sessionEnded: boolean;
}>;

/**
 * Pages that throw on a failed request would otherwise unmount the whole app, and the
 * sign-in dialog with it. The failed page stays hidden until resetKey changes (the user
 * signs in again), then mounts afresh.
 */
class PageErrorBoundary extends React.Component<
	PageErrorBoundaryProps,
	{ failedKey: number | null }
> {
	state = { failedKey: null as number | null };

	static getDerivedStateFromError() {
		return { failedKey: -1 };
	}

	componentDidCatch() {
		this.setState({ failedKey: this.props.resetKey });
	}

	render() {
		const { failedKey } = this.state;
		const { resetKey, sessionEnded, children } = this.props;
		if (failedKey === null || (failedKey !== -1 && failedKey !== resetKey))
			return children;
		if (sessionEnded) return null;
		return (
			<AuthScreen title="Something went wrong">
				<p className={styles.lede}>Reload the page to try again.</p>
				<button
					className={styles.submit}
					type="button"
					onClick={() => location.reload()}
				>
					Reload
				</button>
			</AuthScreen>
		);
	}
}
