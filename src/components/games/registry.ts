import type { JSX } from 'react';
import type { GameId, GameProps } from '@/games/types';
import { CazabugsGame } from './CazabugsGame';
import { LaberintoGame } from './LaberintoGame';
import { NumeroGame } from './NumeroGame';
import { RitmoGame } from './RitmoGame';

/** Pantalla de cada minijuego, para usarla desde la partida libre y desde el reto del día. */
export const GAME_COMPONENTS: Record<GameId, (props: GameProps) => JSX.Element> = {
  numero: NumeroGame,
  laberinto: LaberintoGame,
  ritmo: RitmoGame,
  cazabugs: CazabugsGame,
};
