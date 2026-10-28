import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Alert } from 'react-native';

// La app real usa expo-sqlite; en pruebas se usa el mismo SQL sobre node:sqlite.
jest.mock('@/db/expoDb', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  openAppDatabase: () => Promise.resolve(require('../../test-utils/nodeDb').openNodeDb()),
}));

jest.setTimeout(30000);

describe('navegación principal (app completa con base de datos real)', () => {
  it('Bienvenida → Inicio → Academia → Módulo → Práctica del nivel 0', async () => {
    await renderRouter('./src/app', { initialUrl: '/' });

    expect(await screen.findByText('OIEG Quest')).toBeTruthy();
    expect(screen.getByText('Entrena tu mente. Supera el reto.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Alias opcional'), 'Robo');
    await fireEvent.press(screen.getByRole('button', { name: 'Comenzar a entrenar' }));

    expect(await screen.findByText('¡Hola, Robo!')).toBeTruthy();
    expect(screen).toHavePathname('/inicio');
    expect(screen.getByText('Nivel 1: Reconocer')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /Academia/ }));
    expect(await screen.findByText('Detectives de patrones')).toBeTruthy();
    expect(screen).toHavePathname('/academia');

    await fireEvent.press(screen.getByRole('button', { name: 'Módulo 1: Detectives de patrones' }));
    expect(await screen.findByText('Tu camino')).toBeTruthy();
    expect(screen).toHavePathname('/modulo/m1-patrones');
    // Al empezar solo está abierto el nivel 0; la lección del nivel 1 tiene candado.
    expect(screen.getByText('Nivel 0 · Aprender jugando')).toBeTruthy();
    expect(screen.getAllByText('Con candado').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Lección: Secuencias numéricas/ })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Practicar este nivel' }));
    expect(await screen.findByText('Cuenta y completa: 1, 2, 3, 4, __')).toBeTruthy();
    expect(screen).toHavePathname('/practica');
  });

  it('las cinco pestañas se pueden recorrer', async () => {
    await renderRouter('./src/app', { initialUrl: '/inicio' });
    expect(await screen.findByText(/¡Hola/)).toBeTruthy();
    for (const [tab, path, text] of [
      ['Simulador', '/simulador', 'Simulador de examen'],
      ['Progreso', '/progreso', 'Mi progreso'],
      ['Ajustes', '/ajustes', 'Tema visual'],
      ['Academia', '/academia', 'Lógica y estrategias'],
      ['Inicio', '/inicio', 'Reto recomendado'],
    ] as const) {
      await fireEvent.press(screen.getByRole('button', { name: new RegExp(tab) }));
      expect(await screen.findByText(text)).toBeTruthy();
      expect(screen).toHavePathname(path);
    }
  });
});

describe('pantalla de ejercicio', () => {
  it('no acepta respuestas vacías, corrige y muestra la explicación', async () => {
    await renderRouter('./src/app', { initialUrl: '/practica?modo=leccion&id=l-pat-1' });
    expect(await screen.findByText('Ejercicio 1 de 5')).toBeTruthy();
    expect(screen.getByText('Completa la secuencia: 2, 4, 6, 8, __')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('verify-button'));
    expect(screen.getByText('Escribe o elige una respuesta antes de verificar.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('answer-input'), '10');
    await fireEvent.press(screen.getByTestId('verify-button'));
    expect(await screen.findByText('¡Correcto!')).toBeTruthy();
    expect(screen.getByText('Cada número es 2 más que el anterior: 8 + 2 = 10.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('continue-button'));
    expect(await screen.findByText('Ejercicio 2 de 5')).toBeTruthy();
    // Pregunta 2 (opción múltiple): respuesta incorrecta → concepto y otro ejemplo.
    await fireEvent.press(screen.getByRole('radio', { name: '22' }));
    await fireEvent.press(screen.getByTestId('verify-button'));
    expect(await screen.findByText('Todavía no')).toBeTruthy();
    expect(screen.getByText('La idea clave')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver otro ejemplo' }));
    expect(screen.getByText('¿Qué número sigue? 4, 7, 10, 13, …')).toBeTruthy();
  });
});

describe('simulador', () => {
  it('permite completar un simulacro corto y ver los resultados', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Terminar')?.onPress?.();
    });
    await renderRouter('./src/app', { initialUrl: '/simulador' });
    await fireEvent.press(await screen.findByRole('button', { name: 'Comenzar simulacro' }));
    expect(await screen.findByTestId('exam-timer')).toBeTruthy();
    expect(screen.getByText('0 contestadas · 12 pendientes')).toBeTruthy();
    expect(screen.getByText('Pregunta 1 de 12')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Pregunta 2 de 12')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('finish-exam'));
    expect(alertSpy).toHaveBeenCalled();
    expect(await screen.findByText('Revisión de respuestas')).toBeTruthy();
    expect(screen.getByText(/^0 \/ \d+$/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Criterio de puntuación')).toBeTruthy());
    alertSpy.mockRestore();
  });
});
