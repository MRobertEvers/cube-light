export function toFriendlyDate(dateTime: string) {
	const date = new Date(dateTime);

	return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
