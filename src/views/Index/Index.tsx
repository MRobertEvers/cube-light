import { NextPage } from 'next';
import { Page } from '../../components/Page/Page';

export type WorkoutProps = {};

const Index: NextPage<WorkoutProps> = (props: WorkoutProps) => {
	return <Page>Home Page</Page>;
};

export default Index;
