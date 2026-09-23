import React, { useId, useState } from 'react';
import { useAppDispatch } from 'src/state/use-app-dispatch';
import { signIn } from 'src/state/session/session.state';
import { errorMessage } from 'src/state/thunk';

import styles from './auth.module.css';

const MIN_PASSWORD_LENGTH = 8;

type SignInFormProps = {
	/** Creates the server's first account instead of signing in. */
	setup?: boolean;
	initialUsername?: string;
};

export function SignInForm(props: SignInFormProps) {
	const { setup = false, initialUsername = '' } = props;
	const id = useId();
	const dispatch = useAppDispatch();
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
			await dispatch(signIn({ username: username.trim(), password, setup })).unwrap();
		} catch (e) {
			setError(errorMessage(e, 'Could not sign in.'));
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
