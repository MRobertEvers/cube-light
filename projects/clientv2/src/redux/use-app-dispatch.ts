import { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import type { ToriMTGEngine } from '../engine/tori-mtg-engine';
import type { RootState } from './root-reducers';

export type AppDispatch = ThunkDispatch<RootState, ToriMTGEngine, UnknownAction>;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
