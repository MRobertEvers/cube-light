import React, { useId, useState } from 'react';
import { AuthUser, fetchAPISignIn } from 'src/api/fetch-api-auth';

import styles from './auth.module.css';

const MIN_PASSWORD_LENGTH = 8;

type SignInFormProps = {
	/** Creates the server's first account instead of signing in. */
	setup?: boolean;
	initialUsername?: string;
	onSignedIn: (user: AuthUser) => void;
};

export function SignInForm(props: SignInFormProps) {
	const { setup = false, initialUsername = '', onSignedIn } = props;
	const id = useId();
	const [username, setUsername] = useState(initialUsername);
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (setup && password !== confirm) {
			setError('The passwords do not match.');
			return;
		}
		setBusy(true);
		setError(null);
		try {
			onSignedIn(await fetchAPISignIn(username.trim(), password, setup));
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not sign in.');
			setBusy(false);
		}
	}

	return (
		<form className={styles.form} onSubmit={submit}>
			<label className={styles.field} htmlFor={`${id}-username`}>
				Username
				<input
					id={`${id}-username`}
					name="username"
					autoComplete="username"
					autoCapitalize="none"
					spellCheck={false}
					required
					autoFocus={!initialUsername}
					value={username}
					onChange={(e) => setUsername(e.target.value)}
				/>
			</label>
			<label className={styles.field} htmlFor={`${id}-password`}>
				Password
				<input
					id={`${id}-password`}
					name="password"
					type="password"
					autoComplete={setup ? 'new-password' : 'current-password'}
					required
					minLength={setup ? MIN_PASSWORD_LENGTH : undefined}
					autoFocus={!!initialUsername}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
			</label>
			{setup && (
				<label className={styles.field} htmlFor={`${id}-confirm`}>
					Repeat password
					<input
						id={`${id}-confirm`}
						name="confirm"
						type="password"
						autoComplete="new-password"
						required
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
					/>
				</label>
			)}
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
			<button className={styles.submit} type="submit" disabled={busy}>
				{busy
					? setup
						? 'Creating account…'
						: 'Signing in…'
					: setup
						? 'Create account'
						: 'Sign in'}
			</button>
		</form>
	);
}
