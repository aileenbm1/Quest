export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}

/** Insignias: reconocen constancia y aprendizaje, no tiempo de pantalla. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'primer-paso', title: 'Primer paso', description: 'Responde tu primer ejercicio.', icon: 'footsteps' },
  { id: 'diagnostico', title: 'Punto de partida', description: 'Completa el diagnóstico inicial.', icon: 'compass' },
  { id: 'diez-correctas', title: 'Mente en marcha', description: 'Acierta 10 ejercicios distintos.', icon: 'flash' },
  { id: 'treinta-correctas', title: 'Explorador experto', description: 'Acierta 30 ejercicios distintos.', icon: 'rocket' },
  { id: 'primera-leccion', title: 'Aprendiz', description: 'Completa tu primera lección.', icon: 'book' },
  { id: 'cinco-lecciones', title: 'Estudiante constante', description: 'Completa 5 lecciones.', icon: 'library' },
  { id: 'cazador-errores', title: 'Cazador de errores', description: 'Resuelve bien un ejercicio que antes habías fallado.', icon: 'bug' },
  { id: 'primer-simulacro', title: 'A prueba', description: 'Termina tu primer simulacro.', icon: 'timer' },
  { id: 'simulacro-completo', title: 'Maratonista', description: 'Termina un simulacro completo.', icon: 'medal' },
  { id: 'racha-3', title: 'Tres días seguidos', description: 'Practica 3 días seguidos.', icon: 'flame' },
  { id: 'racha-7', title: 'Una semana de práctica', description: 'Practica 7 días seguidos.', icon: 'star' },
  { id: 'modulo-dominado', title: 'Maestro de módulo', description: 'Acierta al menos el 80 % de los ejercicios de un módulo.', icon: 'ribbon' },
];
