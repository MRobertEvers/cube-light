export interface IUseCase<T, R> {
	call(request: T): Promise<R> | R;
}
