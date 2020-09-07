import { NextPage } from 'next';
import { Page } from '../../components/Page/Page';

import styles from './index.module.css';

export type WorkoutProps = {};

const tmp = [];
for (let i = 0; i < 100; i += 1) {
	tmp.push('Words');
}

const Index: NextPage<WorkoutProps> = (props: WorkoutProps) => {
	return (
		<Page>
			<div className={styles['index-container']}>
				<div>
					<div className={styles['avatar']}></div>
				</div>
				<table className={styles['decklist']}>
					<tr>
						<th>Card Name</th>
						<th>#</th>
					</tr>
					<tr>
						<td>Shark Typhoon</td>
						<td>1</td>
					</tr>
				</table>
			</div>
		</Page>
	);
};

export default Index;
