import { useRouter } from 'expo-router';
import { useState } from 'react';
import { MascotTip } from '@/components/Mascot';
import { Body, Button, Card, ErrorNotice, Loading, Screen, SectionTitle } from '@/components/ui';
import { formatDateTime } from '@/core/dates';
import { useDb } from '@/db/DatabaseProvider';
import { getActiveExam, getLatestDiagnostic, startExam } from '@/db/exams';
import { useAsyncData } from '@/hooks/useAsyncData';

export default function DiagnosticoScreen() {
  const db = useDb();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<unknown>(null);
  const { data, error, reload } = useAsyncData(async () => {
    const [latest, active] = await Promise.all([getLatestDiagnostic(db), getActiveExam(db)]);
    return { latest, active };
  });

  if (error) return <Screen edges={[]}><ErrorNotice error={error} onRetry={reload} /></Screen>;
  if (!data) return <Loading />;

  const begin = async () => {
    setStarting(true);
    try {
      const id = await startExam(db, 'diagnostico', null);
      router.replace(`/examen/${id}`);
    } catch (e) {
      setStartError(e);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen edges={[]}>
      <MascotTip
        title="¿Qué es el diagnóstico?"
        text="Son 12 preguntas breves de distintos temas. Sirven para saber por dónde empezar a practicar. No es un examen, no tiene tiempo límite y no predice tu resultado en la olimpiada."
      />
      <Card>
        <SectionTitle>Antes de empezar</SectionTitle>
        <Body>• Contesta con calma. Si no sabes una respuesta, puedes dejarla en blanco.</Body>
        <Body>• Verás las respuestas correctas y las explicaciones al terminar.</Body>
        <Body>• Al final te recomendaremos qué temas practicar.</Body>
      </Card>
      {data.active?.kind === 'diagnostico' ? (
        <Button label="Continuar diagnóstico" icon="play" onPress={() => router.replace(`/examen/${data.active!.id}`)} />
      ) : data.active ? (
        <Body muted>Termina primero el simulacro que tienes en curso para empezar el diagnóstico.</Body>
      ) : (
        <Button label={data.latest ? 'Repetir diagnóstico' : 'Comenzar diagnóstico'} icon="compass" onPress={begin} loading={starting} />
      )}
      {startError ? <ErrorNotice error={startError} /> : null}
      {data.latest ? (
        <Button
          label={`Ver mi último resultado (${formatDateTime(data.latest.startedAt)})`}
          variant="ghost"
          icon="document-text-outline"
          onPress={() => router.push(`/resultado/${data.latest!.id}`)}
        />
      ) : null}
    </Screen>
  );
}
